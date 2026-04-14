import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { generateConsultationNo, generateBillNo } from '../../utils/generateNo';

export const createConsultation = asyncHandler(async (req: Request, res: Response) => {
  const consultationNo = await generateConsultationNo();

  const consultation = await prisma.consultation.create({
    data: {
      ...req.body,
      consultationNo,
      scheduledAt: new Date(req.body.scheduledAt),
    },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
      doctor: { select: { id: true, doctorNo: true, firstName: true, lastName: true, specialty: true } },
    },
  });

  successResponse(res, consultation, 'Consultation created', 201);
});

export const getConsultations = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { patientId, doctorId, status, from, to } = req.query;

  const where: Record<string, unknown> = {};
  if (patientId) where['patientId'] = patientId;
  if (doctorId) where['doctorId'] = doctorId;
  if (status) where['status'] = status;

  if (from || to) {
    where['scheduledAt'] = {
      ...(from && { gte: new Date(from as string) }),
      ...(to && { lte: new Date(to as string) }),
    };
  }

  const [consultations, total] = await Promise.all([
    prisma.consultation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scheduledAt: 'desc' },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        bill: { select: { id: true, billNo: true, status: true, totalAmount: true } },
      },
    }),
    prisma.consultation.count({ where }),
  ]);

  paginatedResponse(res, consultations, total, page, limit);
});

export const getConsultation = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: req.params['id'] },
    include: {
      patient: true,
      doctor: { include: { department: true } },
      bill: { include: { items: true, payments: true } },
      labRequisitions: { include: { items: true } },
      radiologyOrders: true,
      prescriptions: { include: { items: true } },
    },
  });

  if (!consultation) {
    errorResponse(res, 'Consultation not found', 404);
    return;
  }

  successResponse(res, consultation);
});

export const updateConsultation = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await prisma.consultation.findUnique({ where: { id: req.params['id'] } });
  if (!consultation) {
    errorResponse(res, 'Consultation not found', 404);
    return;
  }

  const updated = await prisma.consultation.update({
    where: { id: req.params['id'] },
    data: {
      ...req.body,
      ...(req.body.scheduledAt && { scheduledAt: new Date(req.body.scheduledAt) }),
      ...(req.body.completedAt && { completedAt: new Date(req.body.completedAt) }),
    },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
      doctor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  successResponse(res, updated, 'Consultation updated');
});

export const deleteConsultation = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await prisma.consultation.findUnique({ where: { id: req.params['id'] } });
  if (!consultation) {
    errorResponse(res, 'Consultation not found', 404);
    return;
  }

  if (consultation.status !== 'SCHEDULED') {
    errorResponse(res, 'Only scheduled consultations can be cancelled', 400);
    return;
  }

  await prisma.consultation.update({
    where: { id: req.params['id'] },
    data: { status: 'CANCELLED' },
  });

  successResponse(res, null, 'Consultation cancelled');
});

export const completeConsultation = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await prisma.consultation.findUnique({
    where: { id: req.params['id'] },
    include: { doctor: true, patient: true },
  });

  if (!consultation) {
    errorResponse(res, 'Consultation not found', 404);
    return;
  }

  // Update status and create auto-bill if not exists
  const updated = await prisma.$transaction(async (tx) => {
    const cons = await tx.consultation.update({
      where: { id: req.params['id'] },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(req.body.findings && { findings: req.body.findings }),
        ...(req.body.assessment && { assessment: req.body.assessment }),
        ...(req.body.treatmentPlan && { treatmentPlan: req.body.treatmentPlan }),
        ...(req.body.icdCodes && { icdCodes: req.body.icdCodes }),
      },
    });

    // Auto-create bill if no bill exists
    const existingBill = await tx.bill.findUnique({ where: { consultationId: cons.id } });
    if (!existingBill && consultation.doctor) {
      const billNo = await generateBillNo();
      const consultingFee = Number(consultation.doctor.consultingFee);

      await tx.bill.create({
        data: {
          billNo,
          patientId: consultation.patientId,
          consultationId: cons.id,
          subtotal: consultingFee,
          totalAmount: consultingFee,
          balance: consultingFee,
          items: {
            create: {
              description: `Consultation fee - Dr. ${consultation.doctor.lastName}`,
              quantity: 1,
              unitPrice: consultingFee,
              total: consultingFee,
            },
          },
        },
      });
    }

    return cons;
  });

  successResponse(res, updated, 'Consultation completed');
});

export const getConsultationBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await prisma.bill.findUnique({
    where: { consultationId: req.params['id'] },
    include: {
      items: { include: { service: true } },
      payments: true,
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
    },
  });

  if (!bill) {
    errorResponse(res, 'No bill found for this consultation', 404);
    return;
  }

  successResponse(res, bill);
});
