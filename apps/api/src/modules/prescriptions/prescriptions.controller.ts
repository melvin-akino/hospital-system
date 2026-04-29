import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

const generateRxNo = async (): Promise<string> => {
  const d = new Date();
  const prefix = `RX-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.prescription.count({ where: { rxNo: { startsWith: prefix } } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

const rxInclude = {
  patient: { select: { firstName: true, lastName: true, patientNo: true } },
  items: {
    include: {
      medication: { select: { genericName: true, brandName: true } },
    },
  },
} as const;

// GET /prescriptions?patientId=&admissionId=&consultationId=&status=
export const listPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { patientId, admissionId, consultationId, status } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (patientId)      where['patientId']      = patientId;
  if (admissionId)    where['admissionId']    = admissionId;
  if (consultationId) where['consultationId'] = consultationId;
  if (status)         where['status']         = status;

  const [data, total] = await Promise.all([
    prisma.prescription.findMany({ where, skip, take: limit, orderBy: { prescribedAt: 'desc' }, include: rxInclude }),
    prisma.prescription.count({ where }),
  ]);

  paginatedResponse(res, data, total, page, limit);
});

// GET /prescriptions/:id
export const getPrescription = asyncHandler(async (req: Request, res: Response) => {
  const rx = await prisma.prescription.findUnique({
    where: { id: req.params['id'] },
    include: rxInclude,
  });
  if (!rx) { errorResponse(res, 'Prescription not found', 404); return; }
  successResponse(res, rx);
});

// POST /prescriptions
export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, consultationId, admissionId, notes, items } = req.body;
  const user = (req as any).user;

  if (!patientId) { errorResponse(res, 'patientId is required', 400); return; }
  if (!items || !Array.isArray(items) || items.length === 0) {
    errorResponse(res, 'At least one prescription item is required', 400); return;
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) { errorResponse(res, 'Patient not found', 404); return; }

  const rxNo = await generateRxNo();
  const prescribedBy = user?.displayName || user?.username || 'Unknown';

  const rx = await prisma.prescription.create({
    data: {
      rxNo,
      patientId,
      consultationId: consultationId || null,
      admissionId:    admissionId    || null,
      prescribedById: user?.id       || null,
      prescribedBy,
      notes,
      status: 'ACTIVE',
      items: {
        create: (items as Array<{
          drugName: string;
          medicationId?: string;
          dosage?: string;
          frequency?: string;
          duration?: string;
          quantity?: number;
          instructions?: string;
        }>).map((item) => ({
          drugName:     item.drugName,
          medicationId: item.medicationId || null,
          dosage:       item.dosage       || null,
          frequency:    item.frequency    || null,
          duration:     item.duration     || null,
          quantity:     item.quantity     || null,
          instructions: item.instructions || null,
        })),
      },
    },
    include: rxInclude,
  });

  successResponse(res, rx, 'Prescription created', 201);
});

// PUT /prescriptions/:id — update status or notes
export const updatePrescription = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.prescription.findUnique({ where: { id: req.params['id'] } });
  if (!existing) { errorResponse(res, 'Prescription not found', 404); return; }

  const { status, notes } = req.body;
  const updated = await prisma.prescription.update({
    where: { id: req.params['id'] },
    data: {
      ...(status !== undefined && { status }),
      ...(notes  !== undefined && { notes }),
    },
    include: rxInclude,
  });

  successResponse(res, updated, 'Prescription updated');
});

// DELETE /prescriptions/:id — cancel
export const cancelPrescription = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.prescription.findUnique({ where: { id: req.params['id'] } });
  if (!existing) { errorResponse(res, 'Prescription not found', 404); return; }
  if (existing.status === 'DISPENSED') { errorResponse(res, 'Cannot cancel a dispensed prescription', 400); return; }

  const updated = await prisma.prescription.update({
    where: { id: req.params['id'] },
    data: { status: 'CANCELLED' },
    include: rxInclude,
  });
  successResponse(res, updated, 'Prescription cancelled');
});
