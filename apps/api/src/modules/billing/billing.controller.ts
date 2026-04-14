import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { generateBillNo, generateOrNumber } from '../../utils/generateNo';

// Philippine discount rules:
// Senior Citizens - RA 9994: 20% discount on medical services
// PWD - RA 10754: 20% discount on medical services
const SENIOR_PWD_DISCOUNT = 20;

const calculateBillTotals = (
  items: Array<{ unitPrice: number; quantity: number; discount: number }>,
  discountPercent: number,
  philhealthDeduction: number,
  hmoDeduction: number
) => {
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.unitPrice * item.quantity - item.discount;
    return sum + itemTotal;
  }, 0);

  const discountAmount = (subtotal * discountPercent) / 100;
  const totalAmount = Math.max(
    0,
    subtotal - discountAmount - philhealthDeduction - hmoDeduction
  );

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};

export const createBill = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, consultationId, admissionId, items, notes, discountType, philhealthDeduction = 0, hmoDeduction = 0 } = req.body;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  // Auto-apply senior/PWD discount
  let discountPercent = req.body.discountPercent || 0;
  let appliedDiscountType = discountType;

  if (!discountType || discountType === 'NONE') {
    if (patient.isSenior) {
      discountPercent = SENIOR_PWD_DISCOUNT;
      appliedDiscountType = 'SENIOR';
    } else if (patient.isPwd) {
      discountPercent = SENIOR_PWD_DISCOUNT;
      appliedDiscountType = 'PWD';
    }
  }

  const { subtotal, discountAmount, totalAmount } = calculateBillTotals(
    items,
    discountPercent,
    philhealthDeduction,
    hmoDeduction
  );

  const billNo = await generateBillNo();

  const bill = await prisma.bill.create({
    data: {
      billNo,
      patientId,
      consultationId,
      admissionId,
      discountType: appliedDiscountType,
      discountPercent,
      discountAmount,
      philhealthDeduction,
      hmoDeduction,
      subtotal,
      totalAmount,
      balance: totalAmount,
      notes,
      items: {
        create: items.map((item: {
          serviceId?: string;
          description: string;
          quantity: number;
          unitPrice: number;
          discount?: number;
        }) => ({
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          total: item.unitPrice * item.quantity - (item.discount || 0),
        })),
      },
    },
    include: {
      items: { include: { service: true } },
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true, isSenior: true, isPwd: true } },
      payments: true,
    },
  });

  successResponse(res, bill, 'Bill created', 201);
});

export const getBills = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { patientId, status, from, to, search } = req.query;

  const where: Record<string, unknown> = {};
  if (patientId) where['patientId'] = patientId;
  if (status) where['status'] = status;

  if (from || to) {
    where['createdAt'] = {
      ...(from && { gte: new Date(from as string) }),
      ...(to && { lte: new Date(to as string) }),
    };
  }

  if (search) {
    where['OR'] = [
      { billNo: { contains: search as string, mode: 'insensitive' } },
      { orNumber: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [bills, total] = await Promise.all([
    prisma.bill.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
        _count: { select: { items: true, payments: true } },
      },
    }),
    prisma.bill.count({ where }),
  ]);

  paginatedResponse(res, bills, total, page, limit);
});

export const getBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await prisma.bill.findUnique({
    where: { id: req.params['id'] },
    include: {
      items: { include: { service: { include: { category: true } } } },
      payments: true,
      patient: true,
      consultation: {
        include: {
          doctor: { select: { firstName: true, lastName: true, specialty: true } },
        },
      },
      philhealthClaim: true,
    },
  });

  if (!bill) {
    errorResponse(res, 'Bill not found', 404);
    return;
  }

  successResponse(res, bill);
});

export const updateBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await prisma.bill.findUnique({ where: { id: req.params['id'] } });
  if (!bill) {
    errorResponse(res, 'Bill not found', 404);
    return;
  }

  if (bill.status === 'PAID' || bill.status === 'CANCELLED') {
    errorResponse(res, 'Cannot update a paid or cancelled bill', 400);
    return;
  }

  const updated = await prisma.bill.update({
    where: { id: req.params['id'] },
    data: req.body,
    include: { items: true, payments: true },
  });

  successResponse(res, updated, 'Bill updated');
});

export const addPayment = asyncHandler(async (req: Request, res: Response) => {
  const bill = await prisma.bill.findUnique({
    where: { id: req.params['id'] },
    include: { payments: true },
  });

  if (!bill) {
    errorResponse(res, 'Bill not found', 404);
    return;
  }

  if (bill.status === 'CANCELLED') {
    errorResponse(res, 'Cannot add payment to a cancelled bill', 400);
    return;
  }

  const { amount, method, referenceNo, receivedBy, notes } = req.body;
  const newPaidAmount = Number(bill.paidAmount) + amount;

  if (newPaidAmount > Number(bill.totalAmount)) {
    errorResponse(res, `Payment amount exceeds balance. Balance is ₱${bill.balance}`, 400);
    return;
  }

  const orNumber = await generateOrNumber();
  const newBalance = Number(bill.totalAmount) - newPaidAmount;
  const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

  const [payment, updatedBill] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        billId: bill.id,
        amount,
        method,
        referenceNo,
        receivedBy,
        notes,
      },
    }),
    prisma.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status: newStatus as 'PAID' | 'PARTIAL',
        orNumber: newStatus === 'PAID' ? orNumber : bill.orNumber,
      },
    }),
  ]);

  successResponse(
    res,
    { payment, bill: updatedBill },
    `Payment of ₱${amount.toLocaleString('en-PH')} recorded`
  );
});

export const finalizeBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await prisma.bill.findUnique({ where: { id: req.params['id'] } });
  if (!bill) {
    errorResponse(res, 'Bill not found', 404);
    return;
  }

  if (bill.status !== 'DRAFT') {
    errorResponse(res, 'Only draft bills can be finalized', 400);
    return;
  }

  const updated = await prisma.bill.update({
    where: { id: req.params['id'] },
    data: { status: 'FINALIZED', finalizedAt: new Date() },
  });

  successResponse(res, updated, 'Bill finalized');
});

export const cancelBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await prisma.bill.findUnique({ where: { id: req.params['id'] } });
  if (!bill) {
    errorResponse(res, 'Bill not found', 404);
    return;
  }

  if (bill.status === 'PAID') {
    errorResponse(res, 'Cannot cancel a paid bill', 400);
    return;
  }

  const updated = await prisma.bill.update({
    where: { id: req.params['id'] },
    data: { status: 'CANCELLED' },
  });

  successResponse(res, updated, 'Bill cancelled');
});

export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const payments = await prisma.payment.findMany({
    where: { billId: req.params['id'] },
    orderBy: { paidAt: 'desc' },
  });
  successResponse(res, payments);
});

export const getBillReceipt = asyncHandler(async (req: Request, res: Response) => {
  const bill = await prisma.bill.findUnique({
    where: { id: req.params['id'] },
    include: {
      items: { include: { service: true } },
      payments: true,
      patient: {
        select: {
          id: true,
          patientNo: true,
          firstName: true,
          middleName: true,
          lastName: true,
          address: true,
          phone: true,
          philhealthNo: true,
          isSenior: true,
          isPwd: true,
        },
      },
      consultation: {
        include: {
          doctor: { select: { firstName: true, lastName: true, specialty: true, licenseNo: true } },
        },
      },
    },
  });

  if (!bill) {
    errorResponse(res, 'Bill not found', 404);
    return;
  }

  // Format receipt data
  const receipt = {
    ...bill,
    hospitalName: 'Philippine Integrated Billing System Hospital',
    hospitalAddress: 'Hospital Address, City, Province',
    tinNo: '123-456-789-000',
    receiptDate: new Date().toISOString(),
  };

  successResponse(res, receipt, 'Receipt generated');
});

export const applyDiscount = asyncHandler(async (req: Request, res: Response) => {
  const { discountType, discountPercent, reason } = req.body;

  const bill = await prisma.bill.findUnique({
    where: { id: req.params['id'] },
    include: { items: true },
  });

  if (!bill) {
    errorResponse(res, 'Bill not found', 404);
    return;
  }

  if (bill.status === 'PAID' || bill.status === 'CANCELLED') {
    errorResponse(res, 'Cannot apply discount to a paid or cancelled bill', 400);
    return;
  }

  const subtotal = Number(bill.subtotal);
  const discountAmount = (subtotal * discountPercent) / 100;
  const totalAmount = Math.max(
    0,
    subtotal - discountAmount - Number(bill.philhealthDeduction) - Number(bill.hmoDeduction)
  );
  const balance = totalAmount - Number(bill.paidAmount);

  const updated = await prisma.bill.update({
    where: { id: req.params['id'] },
    data: {
      discountType,
      discountPercent,
      discountAmount,
      totalAmount,
      balance,
      notes: reason ? `Discount reason: ${reason}` : bill.notes,
    },
  });

  successResponse(
    res,
    updated,
    `${discountPercent}% discount applied (₱${discountAmount.toLocaleString('en-PH')} off)`
  );
});
