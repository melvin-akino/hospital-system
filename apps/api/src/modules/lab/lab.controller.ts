import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

export const LAB_TEST_TEMPLATES = [
  { code: 'CBC', name: 'Complete Blood Count', category: 'Hematology' },
  { code: 'BMP', name: 'Basic Metabolic Panel', category: 'Chemistry' },
  { code: 'CMP', name: 'Comprehensive Metabolic Panel', category: 'Chemistry' },
  { code: 'LFT', name: 'Liver Function Test', category: 'Chemistry' },
  { code: 'KFT', name: 'Kidney Function Test', category: 'Chemistry' },
  { code: 'FBS', name: 'Fasting Blood Sugar', category: 'Chemistry' },
  { code: 'HBA1C', name: 'HbA1c (Glycated Hemoglobin)', category: 'Chemistry' },
  { code: 'LIPID', name: 'Lipid Profile', category: 'Chemistry' },
  { code: 'UA', name: 'Urinalysis', category: 'Urinalysis' },
  { code: 'UCS', name: 'Urine Culture & Sensitivity', category: 'Microbiology' },
  { code: 'THYROID', name: 'Thyroid Function Test (TSH/T3/T4)', category: 'Endocrinology' },
  { code: 'PREG', name: 'Pregnancy Test (urine hCG)', category: 'Immunology' },
  { code: 'XRAY_PA', name: 'Chest X-Ray PA View', category: 'Radiology' },
  { code: 'XRAY_LAT', name: 'Chest X-Ray Lateral', category: 'Radiology' },
  { code: 'US_ABD', name: 'Ultrasound Whole Abdomen', category: 'Radiology' },
  { code: 'US_OB', name: 'Obstetric Ultrasound', category: 'Radiology' },
  { code: 'CT_HEAD', name: 'CT Scan Head', category: 'Radiology' },
  { code: 'MRI_BRAIN', name: 'MRI Brain', category: 'Radiology' },
];

const generateRequisitionNo = async (): Promise<string> => {
  const today = new Date();
  const prefix = `LAB${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await prisma.labRequisition.count({
    where: { requisitionNo: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const generateResultNo = async (): Promise<string> => {
  const today = new Date();
  const prefix = `RES${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await prisma.labResult.count({
    where: { resultNo: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const generateOrderNo = async (): Promise<string> => {
  const today = new Date();
  const prefix = `RAD${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await prisma.radiologyOrder.count({
    where: { orderNo: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

export const getTestTemplates = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, LAB_TEST_TEMPLATES);
});

export const createRequisition = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, consultationId, orderedBy, priority, notes, items } = req.body;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const requisitionNo = await generateRequisitionNo();

  const requisition = await prisma.labRequisition.create({
    data: {
      requisitionNo,
      patientId,
      consultationId: consultationId || undefined,
      orderedBy: orderedBy || undefined,
      priority: priority || 'ROUTINE',
      notes: notes || undefined,
      items: {
        create: (items as Array<{ testName: string; testCode?: string }>).map((item) => ({
          testName: item.testName,
          testCode: item.testCode || undefined,
        })),
      },
    },
    include: {
      items: true,
      patient: { select: { firstName: true, lastName: true, patientNo: true } },
    },
  });

  successResponse(res, requisition, 'Lab requisition created', 201);
});

export const getRequisitions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status, patientId, dateFrom, dateTo } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (patientId) where['patientId'] = patientId;
  if (dateFrom || dateTo) {
    where['orderedAt'] = {
      ...(dateFrom && { gte: new Date(dateFrom as string) }),
      ...(dateTo && { lte: new Date(dateTo as string) }),
    };
  }

  const [data, total] = await Promise.all([
    prisma.labRequisition.findMany({
      where,
      skip,
      take: limit,
      orderBy: { orderedAt: 'desc' },
      include: {
        items: true,
        patient: { select: { firstName: true, lastName: true, patientNo: true } },
      },
    }),
    prisma.labRequisition.count({ where }),
  ]);

  paginatedResponse(res, data, total, page, limit);
});

export const getRequisition = asyncHandler(async (req: Request, res: Response) => {
  const requisition = await prisma.labRequisition.findUnique({
    where: { id: req.params['id'] },
    include: {
      items: true,
      results: true,
      patient: { select: { firstName: true, lastName: true, patientNo: true, dateOfBirth: true, gender: true } },
      consultation: { select: { consultationNo: true, scheduledAt: true } },
    },
  });

  if (!requisition) {
    errorResponse(res, 'Requisition not found', 404);
    return;
  }

  successResponse(res, requisition);
});

export const updateRequisitionStatus = asyncHandler(async (req: Request, res: Response) => {
  const requisition = await prisma.labRequisition.findUnique({ where: { id: req.params['id'] } });
  if (!requisition) {
    errorResponse(res, 'Requisition not found', 404);
    return;
  }

  const updated = await prisma.labRequisition.update({
    where: { id: req.params['id'] },
    data: { status: req.body.status },
  });

  successResponse(res, updated, 'Status updated');
});

export const enterResults = asyncHandler(async (req: Request, res: Response) => {
  const { requisitionId, results } = req.body;

  const requisition = await prisma.labRequisition.findUnique({
    where: { id: requisitionId },
    include: { items: true },
  });
  if (!requisition) {
    errorResponse(res, 'Requisition not found', 404);
    return;
  }

  const createdResults = [];
  for (const r of results as Array<{
    testName: string;
    result: string;
    unit?: string;
    referenceRange?: string;
    isAbnormal?: boolean;
    notes?: string;
  }>) {
    const resultNo = await generateResultNo();
    const result = await prisma.labResult.create({
      data: {
        resultNo,
        patientId: requisition.patientId,
        requisitionId,
        testName: r.testName,
        result: r.result,
        unit: r.unit,
        referenceRange: r.referenceRange,
        isAbnormal: r.isAbnormal || false,
        notes: r.notes,
        status: 'COMPLETED',
        performedAt: new Date(),
      },
    });
    createdResults.push(result);
  }

  await prisma.labRequisition.update({
    where: { id: requisitionId },
    data: { status: 'COMPLETED' },
  });

  successResponse(res, createdResults, 'Results entered', 201);
});

export const getResults = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { patientId, requisitionId } = req.query;

  const where: Record<string, unknown> = {};
  if (patientId) where['patientId'] = patientId;
  if (requisitionId) where['requisitionId'] = requisitionId;

  const [data, total] = await Promise.all([
    prisma.labResult.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { firstName: true, lastName: true, patientNo: true } },
        requisition: { select: { requisitionNo: true, priority: true } },
      },
    }),
    prisma.labResult.count({ where }),
  ]);

  paginatedResponse(res, data, total, page, limit);
});

export const getResult = asyncHandler(async (req: Request, res: Response) => {
  const result = await prisma.labResult.findUnique({
    where: { id: req.params['id'] },
    include: {
      patient: { select: { firstName: true, lastName: true, patientNo: true, dateOfBirth: true, gender: true } },
      requisition: { select: { requisitionNo: true, priority: true, orderedAt: true } },
    },
  });

  if (!result) {
    errorResponse(res, 'Result not found', 404);
    return;
  }

  successResponse(res, result);
});

export const getPatientResults = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const results = await prisma.labResult.findMany({
    where: { patientId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      requisition: { select: { requisitionNo: true, priority: true, orderedAt: true } },
    },
  });

  successResponse(res, results);
});

export const createRadiologyOrder = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, consultationId, modality, bodyPart, clinicalHistory, orderedBy } = req.body;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const orderNo = await generateOrderNo();

  const order = await prisma.radiologyOrder.create({
    data: {
      orderNo,
      patientId,
      consultationId: consultationId || undefined,
      modality,
      bodyPart: bodyPart || undefined,
      clinicalHistory: clinicalHistory || undefined,
      orderedBy: orderedBy || undefined,
    },
    include: {
      patient: { select: { firstName: true, lastName: true, patientNo: true } },
    },
  });

  successResponse(res, order, 'Radiology order created', 201);
});

export const getRadiologyOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status, patientId } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (patientId) where['patientId'] = patientId;

  const [data, total] = await Promise.all([
    prisma.radiologyOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { orderedAt: 'desc' },
      include: {
        patient: { select: { firstName: true, lastName: true, patientNo: true } },
        report: true,
      },
    }),
    prisma.radiologyOrder.count({ where }),
  ]);

  paginatedResponse(res, data, total, page, limit);
});

export const uploadRadiologyReport = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, findings, impression, reportedBy, reportUrl } = req.body;

  const order = await prisma.radiologyOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    errorResponse(res, 'Radiology order not found', 404);
    return;
  }

  const report = await prisma.radiologyReport.upsert({
    where: { orderId },
    create: {
      orderId,
      findings,
      impression,
      reportedBy,
      reportUrl,
      reportedAt: new Date(),
    },
    update: {
      findings,
      impression,
      reportedBy,
      reportUrl,
      reportedAt: new Date(),
    },
  });

  await prisma.radiologyOrder.update({
    where: { id: orderId },
    data: { status: 'COMPLETED' },
  });

  successResponse(res, report, 'Report saved', 201);
});
