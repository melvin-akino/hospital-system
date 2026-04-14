import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

const generateClaimNo = async (): Promise<string> => {
  const today = new Date();
  const prefix = `HMO${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.hmoClaim.count({
    where: { claimNo: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
};

export const getHmoCompanies = asyncHandler(async (req: Request, res: Response) => {
  const companies = await prisma.hmoCompany.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  successResponse(res, companies);
});

export const registerPatientHmo = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, hmoCompanyId, memberNo, groupNo, plan, validFrom, validUntil } = req.body;

  const [patient, company] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.hmoCompany.findUnique({ where: { id: hmoCompanyId } }),
  ]);

  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }
  if (!company) {
    errorResponse(res, 'HMO company not found', 404);
    return;
  }

  const registration = await prisma.hmoRegistration.create({
    data: {
      patientId,
      hmoCompanyId,
      memberNo,
      groupNo: groupNo || undefined,
      plan: plan || undefined,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
    },
    include: {
      hmoCompany: true,
      patient: { select: { firstName: true, lastName: true, patientNo: true } },
    },
  });

  successResponse(res, registration, 'HMO registration created', 201);
});

export const getPatientHmo = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.query;

  if (!patientId) {
    errorResponse(res, 'patientId is required', 400);
    return;
  }

  const registrations = await prisma.hmoRegistration.findMany({
    where: { patientId: patientId as string },
    include: {
      hmoCompany: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  successResponse(res, registrations);
});

export const getHmoRegistration = asyncHandler(async (req: Request, res: Response) => {
  const registration = await prisma.hmoRegistration.findUnique({
    where: { id: req.params['id'] },
    include: {
      hmoCompany: true,
      patient: { select: { firstName: true, lastName: true, patientNo: true, dateOfBirth: true } },
    },
  });

  if (!registration) {
    errorResponse(res, 'HMO registration not found', 404);
    return;
  }

  successResponse(res, registration);
});

export const updateHmoRegistration = asyncHandler(async (req: Request, res: Response) => {
  const registration = await prisma.hmoRegistration.findUnique({ where: { id: req.params['id'] } });
  if (!registration) {
    errorResponse(res, 'HMO registration not found', 404);
    return;
  }

  const updated = await prisma.hmoRegistration.update({
    where: { id: req.params['id'] },
    data: {
      ...req.body,
      ...(req.body.validFrom && { validFrom: new Date(req.body.validFrom) }),
      ...(req.body.validUntil && { validUntil: new Date(req.body.validUntil) }),
    },
    include: { hmoCompany: true },
  });

  successResponse(res, updated, 'HMO registration updated');
});

export const checkEligibility = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const now = new Date();
  const registrations = await prisma.hmoRegistration.findMany({
    where: {
      patientId,
      isActive: true,
    },
    include: { hmoCompany: true },
    orderBy: { validUntil: 'desc' },
  });

  const activeRegistrations = registrations.map((r) => ({
    ...r,
    isCurrentlyValid: r.validUntil ? r.validUntil > now : false,
  }));

  successResponse(res, {
    patient: { id: patient.id, firstName: patient.firstName, lastName: patient.lastName, patientNo: patient.patientNo },
    isEligible: activeRegistrations.some((r) => r.isCurrentlyValid),
    registrations: activeRegistrations,
  });
});

export const createClaim = asyncHandler(async (req: Request, res: Response) => {
  const { billId, patientId, hmoCompanyId, amount, notes } = req.body;

  const company = await prisma.hmoCompany.findUnique({ where: { id: hmoCompanyId } });
  if (!company) {
    errorResponse(res, 'HMO company not found', 404);
    return;
  }

  const claimNo = await generateClaimNo();

  const claim = await prisma.hmoClaim.create({
    data: {
      claimNo,
      billId: billId || undefined,
      patientId: patientId || undefined,
      hmoCompanyId,
      amount,
      notes: notes || undefined,
      status: 'PENDING',
    },
    include: {
      hmoCompany: true,
    },
  });

  successResponse(res, claim, 'HMO claim created', 201);
});

export const getClaims = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status, hmoCompanyId } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (hmoCompanyId) where['hmoCompanyId'] = hmoCompanyId;

  const [data, total] = await Promise.all([
    prisma.hmoClaim.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        hmoCompany: { select: { name: true, code: true } },
      },
    }),
    prisma.hmoClaim.count({ where }),
  ]);

  paginatedResponse(res, data, total, page, limit);
});

export const getClaim = asyncHandler(async (req: Request, res: Response) => {
  const claim = await prisma.hmoClaim.findUnique({
    where: { id: req.params['id'] },
    include: {
      hmoCompany: true,
    },
  });

  if (!claim) {
    errorResponse(res, 'Claim not found', 404);
    return;
  }

  successResponse(res, claim);
});

export const updateClaimStatus = asyncHandler(async (req: Request, res: Response) => {
  const claim = await prisma.hmoClaim.findUnique({ where: { id: req.params['id'] } });
  if (!claim) {
    errorResponse(res, 'Claim not found', 404);
    return;
  }

  const { status, notes } = req.body;

  const updateData: Record<string, unknown> = { status };
  if (notes) updateData['notes'] = notes;
  if (status === 'SUBMITTED') updateData['submittedAt'] = new Date();
  if (status === 'APPROVED') updateData['approvedAt'] = new Date();

  const updated = await prisma.hmoClaim.update({
    where: { id: req.params['id'] },
    data: updateData,
    include: { hmoCompany: true },
  });

  successResponse(res, updated, 'Claim status updated');
});
