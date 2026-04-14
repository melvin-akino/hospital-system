import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

const INTENTS_FILE = path.join(__dirname, '../../../data/payment-intents.json');

type PaymentMethod = 'GCASH' | 'MAYA' | 'CREDIT_CARD' | 'DEBIT_CARD';
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

interface PaymentIntent {
  id: string;
  intentId: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  checkoutUrl: string;
  description: string;
  createdAt: string;
  paidAt: string | null;
}

function readIntents(): PaymentIntent[] {
  if (!fs.existsSync(INTENTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(INTENTS_FILE, 'utf-8'));
}

function writeIntents(data: PaymentIntent[]): void {
  fs.writeFileSync(INTENTS_FILE, JSON.stringify(data, null, 2));
}

function generateIntentId(method: PaymentMethod): string {
  const methodCode =
    method === 'GCASH'
      ? 'GCASH'
      : method === 'MAYA'
        ? 'MAYA'
        : method === 'CREDIT_CARD'
          ? 'CC'
          : 'DC';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `PI-${methodCode}-${date}-${rand}`;
}

async function initiatePayment(
  req: Request,
  res: Response,
  method: PaymentMethod
): Promise<void> {
  const { billId, amount, description } = req.body;
  if (!billId || !amount) {
    errorResponse(res, 'billId and amount are required', 400);
    return;
  }

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { patient: true },
  });
  if (!bill) {
    errorResponse(res, 'Bill not found', 404);
    return;
  }

  const intentId = generateIntentId(method);
  const intent: PaymentIntent = {
    id: uuidv4(),
    intentId,
    billId,
    amount: parseFloat(amount),
    method,
    status: 'PENDING',
    checkoutUrl: `https://checkout.pibs.hospital.ph/pay/${intentId}`,
    description: description || `Payment for Bill ${bill.billNo}`,
    createdAt: new Date().toISOString(),
    paidAt: null,
  };

  const intents = readIntents();
  intents.push(intent);
  writeIntents(intents);

  successResponse(res, intent, `${method} payment initiated`);
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
  const intents = readIntents();
  const intent = intents.find((i) => i.intentId === paymentIntentId || i.id === paymentIntentId);
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

  const intents = readIntents();
  const idx = intents.findIndex((i) => i.intentId === intentId || i.id === intentId);
  if (idx === -1) {
    errorResponse(res, 'Payment intent not found', 404);
    return;
  }

  intents[idx].status = status as PaymentStatus;
  if (status === 'PAID') {
    intents[idx].paidAt = new Date().toISOString();
    await confirmPaymentInBilling(intents[idx]);
  }
  writeIntents(intents);

  successResponse(res, intents[idx], 'Webhook processed');
});

export const simulateConfirm = asyncHandler(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.params;
  const intents = readIntents();
  const idx = intents.findIndex(
    (i) => i.intentId === paymentIntentId || i.id === paymentIntentId
  );
  if (idx === -1) {
    errorResponse(res, 'Payment intent not found', 404);
    return;
  }
  if (intents[idx].status !== 'PENDING') {
    errorResponse(res, `Payment is already ${intents[idx].status}`, 400);
    return;
  }

  intents[idx].status = 'PAID';
  intents[idx].paidAt = new Date().toISOString();
  await confirmPaymentInBilling(intents[idx]);
  writeIntents(intents);

  successResponse(res, intents[idx], 'Payment confirmed');
});

async function confirmPaymentInBilling(intent: PaymentIntent): Promise<void> {
  const bill = await prisma.bill.findUnique({ where: { id: intent.billId } });
  if (!bill) return;

  const methodMap: Record<PaymentMethod, string> = {
    GCASH: 'GCASH',
    MAYA: 'MAYA',
    CREDIT_CARD: 'CREDIT_CARD',
    DEBIT_CARD: 'DEBIT_CARD',
  };

  const newPaidAmount = (bill.paidAmount || 0) + intent.amount;
  const balance = bill.totalAmount - newPaidAmount;
  const newStatus = balance <= 0 ? 'PAID' : 'PARTIAL';

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        billId: intent.billId,
        amount: intent.amount,
        method: methodMap[intent.method],
        referenceNo: intent.intentId,
        notes: `Online payment via ${intent.method}`,
      },
    }),
    prisma.bill.update({
      where: { id: intent.billId },
      data: {
        paidAmount: newPaidAmount,
        balance: Math.max(0, balance),
        status: newStatus,
      },
    }),
  ]);
}

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { method, status } = req.query;
  let intents = readIntents();

  if (method) intents = intents.filter((i) => i.method === method);
  if (status) intents = intents.filter((i) => i.status === status);

  // Enrich with bill info
  const enriched = await Promise.all(
    intents.map(async (intent) => {
      const bill = await prisma.bill.findUnique({
        where: { id: intent.billId },
        include: { patient: true },
      });
      return {
        ...intent,
        bill: bill
          ? {
              billNo: bill.billNo,
              totalAmount: bill.totalAmount,
              patientName: bill.patient
                ? `${bill.patient.firstName} ${bill.patient.lastName}`
                : '—',
            }
          : null,
      };
    })
  );

  enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  successResponse(res, enriched);
});
