import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';
import {
  initiateGcashPayment,
  initiateMayaPayment,
  initiateCardPayment,
  isPaymongoEnabled,
} from './paymongo.service';

type PaymentMethod = 'GCASH' | 'MAYA' | 'CREDIT_CARD' | 'DEBIT_CARD';

async function initiatePayment(req: Request, res: Response, method: PaymentMethod): Promise<void> {
  const { billId, amount, description } = req.body;
  if (!billId || !amount) {
    errorResponse(res, 'billId and amount are required', 400);
    return;
  }

  const bill = await prisma.bill.findUnique({ where: { id: billId }, include: { patient: true } });
  if (!bill) {
    errorResponse(res, 'Bill not found', 404);
    return;
  }

  const amountNum = parseFloat(amount);
  const desc = description || `Payment for Bill ${bill.billNo}`;

  // Call PayMongo (or simulation fallback)
  let gatewayResult;
  try {
    if (method === 'GCASH') gatewayResult = await initiateGcashPayment(amountNum, desc);
    else if (method === 'MAYA') gatewayResult = await initiateMayaPayment(amountNum, desc);
    else gatewayResult = await initiateCardPayment(amountNum, desc);
  } catch (err: any) {
    errorResponse(res, `Payment gateway error: ${err.message}`, 502);
    return;
  }

  const intent = await prisma.paymentIntent.create({
    data: {
      intentId: gatewayResult.paymentIntentId,
      billId,
      amount: amountNum,
      method,
      status: 'PENDING',
      checkoutUrl: gatewayResult.checkoutUrl,
      description: desc,
    },
  });

  successResponse(res, {
    ...intent,
    amount: Number(intent.amount),
    checkoutUrl: gatewayResult.checkoutUrl,
    isSimulated: gatewayResult.isSimulated,
    paymongoEnabled: isPaymongoEnabled(),
  }, `${method} payment initiated`);
}

export const initiateGcash = asyncHandler(async (req: Request, res: Response) => {
  await initiatePayment(req, res, 'GCASH');
});

export const initiateMaya = asyncHandler(async (req: Request, res: Response) => {
  await initiatePayment(req, res, 'MAYA');
});

export const initiateCard = asyncHandler(async (req: Request, res: Response) => {
  const { cardType } = req.body;
  const method: PaymentMethod = cardType === 'debit' ? 'DEBIT_CARD' : 'CREDIT_CARD';
  await initiatePayment(req, res, method);
});

export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.params;
  const intent = await prisma.paymentIntent.findFirst({
    where: { OR: [{ intentId: paymentIntentId }, { id: paymentIntentId }] },
  });
  if (!intent) {
    errorResponse(res, 'Payment intent not found', 404);
    return;
  }
  successResponse(res, intent);
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { intentId, status } = req.body;
  if (!intentId || !status) {
    errorResponse(res, 'intentId and status are required', 400);
    return;
  }

  const intent = await prisma.paymentIntent.findFirst({
    where: { OR: [{ intentId }, { id: intentId }] },
  });
  if (!intent) {
    errorResponse(res, 'Payment intent not found', 404);
    return;
  }

  const updated = await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: { status, ...(status === 'PAID' && { paidAt: new Date() }) },
  });

  if (status === 'PAID') {
    await confirmPaymentInBilling({ ...intent, status: 'PAID', amount: Number(intent.amount), method: intent.method as PaymentMethod });
  }

  successResponse(res, updated, 'Webhook processed');
});

export const simulateConfirm = asyncHandler(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.params;
  const intent = await prisma.paymentIntent.findFirst({
    where: { OR: [{ intentId: paymentIntentId }, { id: paymentIntentId }] },
  });
  if (!intent) {
    errorResponse(res, 'Payment intent not found', 404);
    return;
  }
  if (intent.status !== 'PENDING') {
    errorResponse(res, `Payment is already ${intent.status}`, 400);
    return;
  }

  const updated = await prisma.paymentIntent.update({
    where: { id: intent.id },
    data: { status: 'PAID', paidAt: new Date() },
  });

  await confirmPaymentInBilling({ ...intent, status: 'PAID', amount: Number(intent.amount), method: intent.method as PaymentMethod });

  successResponse(res, updated, 'Payment confirmed');
});

async function confirmPaymentInBilling(intent: { id: string; billId: string; amount: number; method: PaymentMethod; intentId: string }): Promise<void> {
  const bill = await prisma.bill.findUnique({ where: { id: intent.billId } });
  if (!bill) return;

  const newPaidAmount = (Number(bill.paidAmount) || 0) + intent.amount;
  const balance = Number(bill.totalAmount) - newPaidAmount;
  const newStatus = balance <= 0 ? 'PAID' : 'PARTIAL';

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        billId: intent.billId,
        amount: intent.amount,
        method: intent.method,
        referenceNo: intent.intentId,
        notes: `Online payment via ${intent.method}`,
      },
    }),
    prisma.bill.update({
      where: { id: intent.billId },
      data: { paidAmount: newPaidAmount, balance: Math.max(0, balance), status: newStatus },
    }),
  ]);
}

// GET /payments/online/config (public — no auth)
export const getPaymentConfig = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, {
    paymongoEnabled: isPaymongoEnabled(),
    supportedMethods: ['GCASH', 'MAYA', 'CREDIT_CARD', 'DEBIT_CARD'],
    currency: 'PHP',
  });
});

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { method, status } = req.query;

  const where: any = {};
  if (method) where.method = method;
  if (status) where.status = status;

  const intents = await prisma.paymentIntent.findMany({ where, orderBy: { createdAt: 'desc' } });

  const enriched = await Promise.all(
    intents.map(async (intent) => {
      const bill = await prisma.bill.findUnique({
        where: { id: intent.billId },
        include: { patient: true },
      });
      return {
        ...intent,
        amount: Number(intent.amount),
        bill: bill ? {
          billNo: bill.billNo,
          totalAmount: Number(bill.totalAmount),
          patientName: bill.patient ? `${bill.patient.firstName} ${bill.patient.lastName}` : '—',
        } : null,
      };
    })
  );

  successResponse(res, enriched);
});
