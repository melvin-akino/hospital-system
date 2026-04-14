import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

const COMPATIBLE_TYPES: Record<string, string[]> = {
  O_NEGATIVE: ['O_NEGATIVE'],
  O_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE'],
  A_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE'],
  A_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE'],
  B_NEGATIVE: ['O_NEGATIVE', 'B_NEGATIVE'],
  B_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE'],
  AB_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE', 'B_NEGATIVE', 'AB_NEGATIVE'],
  AB_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
};

// GET /api/blood-donors
export const getDonors = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { bloodType, search } = req.query;

  const where: Record<string, unknown> = {};
  if (bloodType) where['bloodType'] = bloodType;
  if (search) {
    where['OR'] = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { phone: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [donors, total] = await Promise.all([
    prisma.bloodDonor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { units: true } } },
    }),
    prisma.bloodDonor.count({ where }),
  ]);

  paginatedResponse(res, donors, total, page, limit);
});

// POST /api/blood-donors
export const registerDonor = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, bloodType, phone, email } = req.body;

  const donor = await prisma.bloodDonor.create({
    data: { firstName, lastName, bloodType, phone, email },
  });

  successResponse(res, donor, 'Donor registered', 201);
});

// PUT /api/blood-donors/:id
export const updateDonor = asyncHandler(async (req: Request, res: Response) => {
  const donor = await prisma.bloodDonor.findUnique({ where: { id: req.params['id'] } });
  if (!donor) {
    errorResponse(res, 'Donor not found', 404);
    return;
  }

  const updated = await prisma.bloodDonor.update({
    where: { id: req.params['id'] },
    data: req.body,
  });

  successResponse(res, updated, 'Donor updated');
});

// GET /api/blood-inventory
export const getBloodInventory = asyncHandler(async (_req: Request, res: Response) => {
  const allTypes = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'];

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const inventory = await Promise.all(
    allTypes.map(async (bt) => {
      const [available, reserved, expiringSoon] = await Promise.all([
        prisma.bloodUnit.count({ where: { bloodType: bt as never, status: 'AVAILABLE', isUsed: false, expiryDate: { gt: now } } }),
        prisma.bloodUnit.count({ where: { bloodType: bt as never, status: 'RESERVED', isUsed: false } }),
        prisma.bloodUnit.count({ where: { bloodType: bt as never, status: 'AVAILABLE', isUsed: false, expiryDate: { lte: in7Days, gt: now } } }),
      ]);
      return { bloodType: bt, available, reserved, total: available + reserved, expiringSoon };
    })
  );

  successResponse(res, inventory);
});

// GET /api/blood-units
export const getBloodUnits = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { bloodType, status } = req.query;

  const where: Record<string, unknown> = {};
  if (bloodType) where['bloodType'] = bloodType;
  if (status) where['status'] = status;

  const [units, total] = await Promise.all([
    prisma.bloodUnit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { collectedAt: 'desc' },
      include: {
        donor: { select: { id: true, firstName: true, lastName: true, bloodType: true } },
      },
    }),
    prisma.bloodUnit.count({ where }),
  ]);

  paginatedResponse(res, units, total, page, limit);
});

// POST /api/blood-units
export const collectUnit = asyncHandler(async (req: Request, res: Response) => {
  const { donorId, bloodType, collectedAt, expiryDate } = req.body;

  if (donorId) {
    const donor = await prisma.bloodDonor.findUnique({ where: { id: donorId } });
    if (!donor) {
      errorResponse(res, 'Donor not found', 404);
      return;
    }
  }

  const collectionDate = collectedAt ? new Date(collectedAt) : new Date();
  const expiry = expiryDate
    ? new Date(expiryDate)
    : new Date(collectionDate.getTime() + 35 * 24 * 60 * 60 * 1000);

  // Generate unit code
  const dateStr = collectionDate.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.bloodUnit.count();
  const unitCode = `BU-${dateStr}-${String(count + 1).padStart(4, '0')}`;

  const unit = await prisma.bloodUnit.create({
    data: {
      unitCode,
      donorId,
      bloodType,
      collectedAt: collectionDate,
      expiryDate: expiry,
      status: 'AVAILABLE',
    },
    include: {
      donor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Update donor's lastDonated
  if (donorId) {
    await prisma.bloodDonor.update({
      where: { id: donorId },
      data: { lastDonated: collectionDate },
    });
  }

  successResponse(res, unit, 'Blood unit collected', 201);
});

// GET /api/blood-units/expiry-alerts
export const getExpiryAlerts = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const units = await prisma.bloodUnit.findMany({
    where: {
      status: 'AVAILABLE',
      isUsed: false,
      expiryDate: { lte: in7Days, gt: now },
    },
    include: {
      donor: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { expiryDate: 'asc' },
  });

  successResponse(res, units);
});

// GET /api/transfusions
export const getTransfusions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status, patientId } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (patientId) where['patientId'] = patientId;

  const [transfusions, total] = await Promise.all([
    prisma.transfusion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { requestedAt: 'desc' },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true, bloodType: true } },
      },
    }),
    prisma.transfusion.count({ where }),
  ]);

  paginatedResponse(res, transfusions, total, page, limit);
});

// POST /api/transfusions
export const requestTransfusion = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, bloodType, units, notes } = req.body;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  // Validate blood type compatibility if patient blood type is known
  if (patient.bloodType) {
    const compatibles = COMPATIBLE_TYPES[patient.bloodType];
    if (compatibles && !compatibles.includes(bloodType)) {
      errorResponse(
        res,
        `Blood type ${bloodType} is not compatible with patient blood type ${patient.bloodType}`,
        400
      );
      return;
    }
  }

  const transfusion = await prisma.transfusion.create({
    data: {
      patientId,
      bloodType,
      units,
      notes,
      status: 'REQUESTED',
    },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
    },
  });

  successResponse(res, transfusion, 'Transfusion requested', 201);
});

// PUT /api/transfusions/:id/transfuse
export const transfusePatient = asyncHandler(async (req: Request, res: Response) => {
  const { bloodUnitId } = req.body;

  const transfusion = await prisma.transfusion.findUnique({
    where: { id: req.params['id'] },
  });

  if (!transfusion) {
    errorResponse(res, 'Transfusion request not found', 404);
    return;
  }

  if (transfusion.status === 'COMPLETED') {
    errorResponse(res, 'Transfusion already completed', 400);
    return;
  }

  if (bloodUnitId) {
    const unit = await prisma.bloodUnit.findUnique({ where: { id: bloodUnitId } });
    if (!unit) {
      errorResponse(res, 'Blood unit not found', 404);
      return;
    }
    if (unit.isUsed) {
      errorResponse(res, 'Blood unit has already been used', 400);
      return;
    }

    await prisma.bloodUnit.update({
      where: { id: bloodUnitId },
      data: { isUsed: true, status: 'USED' },
    });
  }

  const updated = await prisma.transfusion.update({
    where: { id: req.params['id'] },
    data: {
      bloodUnitId,
      transfusedAt: new Date(),
      status: 'COMPLETED',
    },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
    },
  });

  successResponse(res, updated, 'Transfusion completed');
});
