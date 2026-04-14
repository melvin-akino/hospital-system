import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

// In-memory eligibility log (session-scoped)
interface EligibilityLogEntry {
  id: string;
  philhealthNo: string;
  lastName: string;
  dateOfBirth: string;
  eligible: boolean;
  memberName?: string;
  memberType?: string;
  status?: string;
  message: string;
  checkedAt: string;
}

const eligibilityLog: EligibilityLogEntry[] = [];

// POST /api/philhealth/verify-eligibility
export const verifyEligibility = asyncHandler(async (req: Request, res: Response) => {
  const { philhealthNo, lastName, dateOfBirth } = req.body;

  if (!philhealthNo || !lastName || !dateOfBirth) {
    errorResponse(res, 'philhealthNo, lastName, and dateOfBirth are required', 400);
    return;
  }

  // Look up patient by philhealthNo
  const patient = await prisma.patient.findFirst({
    where: {
      philhealthNo: {
        equals: philhealthNo as string,
        mode: 'insensitive',
      },
    },
  });

  const checkedAt = new Date().toISOString();
  const logId = `EL-${Date.now()}`;

  let result: EligibilityLogEntry;

  if (!patient) {
    result = {
      id: logId,
      philhealthNo,
      lastName,
      dateOfBirth,
      eligible: false,
      message: 'No PhilHealth member found with the provided PhilHealth number.',
      checkedAt,
    };
    eligibilityLog.unshift(result);
    successResponse(res, {
      eligible: false,
      memberName: null,
      memberType: null,
      status: 'NOT_FOUND',
      coverageStart: null,
      coverageEnd: null,
      message: result.message,
    });
    return;
  }

  // Validate last name match (case-insensitive)
  if (patient.lastName.toLowerCase() !== (lastName as string).toLowerCase()) {
    result = {
      id: logId,
      philhealthNo,
      lastName,
      dateOfBirth,
      eligible: false,
      memberName: undefined,
      memberType: undefined,
      status: 'MISMATCH',
      message: 'Patient last name does not match PhilHealth records.',
      checkedAt,
    };
    eligibilityLog.unshift(result);
    successResponse(res, {
      eligible: false,
      memberName: null,
      memberType: null,
      status: 'MISMATCH',
      coverageStart: null,
      coverageEnd: null,
      message: result.message,
    });
    return;
  }

  // Validate DOB match
  const dobFromDb = new Date(patient.dateOfBirth).toISOString().split('T')[0];
  const dobInput = new Date(dateOfBirth as string).toISOString().split('T')[0];
  if (dobFromDb !== dobInput) {
    result = {
      id: logId,
      philhealthNo,
      lastName,
      dateOfBirth,
      eligible: false,
      memberName: `${patient.lastName}, ${patient.firstName}`,
      memberType: undefined,
      status: 'MISMATCH',
      message: 'Date of birth does not match PhilHealth records.',
      checkedAt,
    };
    eligibilityLog.unshift(result);
    successResponse(res, {
      eligible: false,
      memberName: null,
      memberType: null,
      status: 'MISMATCH',
      coverageStart: null,
      coverageEnd: null,
      message: result.message,
    });
    return;
  }

  // Determine member type based on age
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
  const memberType = age >= 60 ? 'SENIOR_CITIZEN' : 'EMPLOYED';

  // Simulate coverage dates
  const coverageStart = new Date();
  coverageStart.setMonth(0, 1); // Jan 1 of current year
  const coverageEnd = new Date();
  coverageEnd.setMonth(11, 31); // Dec 31 of current year

  result = {
    id: logId,
    philhealthNo,
    lastName,
    dateOfBirth,
    eligible: true,
    memberName: `${patient.lastName}, ${patient.firstName}`,
    memberType,
    status: 'ACTIVE',
    message: 'Patient is eligible for PhilHealth benefits.',
    checkedAt,
  };
  eligibilityLog.unshift(result);

  // Keep only last 50
  if (eligibilityLog.length > 50) eligibilityLog.splice(50);

  successResponse(res, {
    eligible: true,
    memberName: `${patient.lastName}, ${patient.firstName} ${patient.middleName ?? ''}`.trim(),
    memberType,
    status: 'ACTIVE',
    coverageStart: coverageStart.toISOString().split('T')[0],
    coverageEnd: coverageEnd.toISOString().split('T')[0],
    message: 'Patient is eligible for PhilHealth benefits.',
  });
});

// POST /api/philhealth/submit-claim
export const submitClaim = asyncHandler(async (req: Request, res: Response) => {
  const { claimId } = req.body;

  if (!claimId) {
    errorResponse(res, 'claimId is required', 400);
    return;
  }

  const claim = await prisma.philHealthClaim.findUnique({
    where: { id: claimId },
    include: {
      patient: { select: { firstName: true, lastName: true, philhealthNo: true } },
    },
  });

  if (!claim) {
    errorResponse(res, 'PhilHealth claim not found', 404);
    return;
  }

  if (claim.status === 'SUBMITTED' || claim.status === 'APPROVED') {
    errorResponse(res, `Claim is already ${claim.status}`, 400);
    return;
  }

  // Generate transmittal number
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  const transmittalNo = `PH-TRN-${year}${month}-${seq}`;

  const updated = await prisma.philHealthClaim.update({
    where: { id: claimId },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      notes: claim.notes
        ? `${claim.notes} | Transmittal: ${transmittalNo}`
        : `Transmittal: ${transmittalNo}`,
    },
  });

  successResponse(res, {
    success: true,
    transmittalNo,
    claimNo: updated.claimNo,
    message: `Claim ${updated.claimNo} submitted to PhilHealth eClaims portal. Transmittal No: ${transmittalNo}`,
  });
});

// GET /api/philhealth/claim-status/:claimId
export const getClaimStatus = asyncHandler(async (req: Request, res: Response) => {
  const claim = await prisma.philHealthClaim.findUnique({
    where: { id: req.params['claimId'] },
    include: {
      patient: {
        select: {
          id: true,
          patientNo: true,
          firstName: true,
          lastName: true,
          philhealthNo: true,
        },
      },
    },
  });

  if (!claim) {
    errorResponse(res, 'PhilHealth claim not found', 404);
    return;
  }

  // Simulate progression: if submitted > 1 min ago → APPROVED (for demo)
  let currentStatus = claim.status;
  if (
    claim.status === 'SUBMITTED' &&
    claim.submittedAt &&
    Date.now() - new Date(claim.submittedAt).getTime() > 60_000
  ) {
    currentStatus = 'APPROVED';
    await prisma.philHealthClaim.update({
      where: { id: claim.id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  // Build timeline
  const timeline = [
    { step: 'Claim Created', date: claim.createdAt.toISOString(), done: true },
    {
      step: 'Submitted to PhilHealth',
      date: claim.submittedAt?.toISOString() ?? null,
      done: !!claim.submittedAt,
    },
    {
      step: 'Under Review',
      date: claim.submittedAt ? new Date(new Date(claim.submittedAt).getTime() + 30_000).toISOString() : null,
      done: currentStatus === 'APPROVED' || currentStatus === 'REJECTED',
    },
    {
      step: 'Approved',
      date: claim.approvedAt?.toISOString() ?? null,
      done: currentStatus === 'APPROVED',
    },
  ];

  successResponse(res, {
    claimId: claim.id,
    claimNo: claim.claimNo,
    status: currentStatus,
    claimAmount: Number(claim.claimAmount),
    patient: claim.patient,
    submittedAt: claim.submittedAt,
    approvedAt: claim.approvedAt,
    timeline,
  });
});

// POST /api/philhealth/request-authorization
export const requestAuthorization = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, caseRateId, estimatedAmount, admissionDate } = req.body;

  if (!patientId || !estimatedAmount) {
    errorResponse(res, 'patientId and estimatedAmount are required', 400);
    return;
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  let caseRate = null;
  if (caseRateId) {
    caseRate = await prisma.philHealthCaseRate.findUnique({ where: { id: caseRateId } });
  }

  // Generate authorization number
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  const authorizationNo = `PH-AUTH-${yr}${mo}-${seq}`;

  // Approved amount: use case rate if available, else 80% of estimated
  const approvedAmount = caseRate
    ? Number(caseRate.caseRate)
    : Math.round(Number(estimatedAmount) * 0.8 * 100) / 100;

  // Valid until: 30 days from admission date or today
  const baseDate = admissionDate ? new Date(admissionDate as string) : new Date();
  const validUntil = new Date(baseDate);
  validUntil.setDate(validUntil.getDate() + 30);

  successResponse(res, {
    authorizationNo,
    patientName: `${patient.lastName}, ${patient.firstName}`,
    philhealthNo: patient.philhealthNo,
    caseRate: caseRate ? { icdCode: caseRate.icdCode, description: caseRate.description } : null,
    estimatedAmount: Number(estimatedAmount),
    approvedAmount,
    validUntil: validUntil.toISOString().split('T')[0],
    conditions: [
      'Pre-authorization is valid for 30 days from admission date.',
      'Actual claim must be filed within 60 days of discharge.',
      'Final benefit is subject to audit and verification.',
      caseRate ? `Case rate applies: ${caseRate.description}` : 'No specific case rate applied.',
    ],
    issuedAt: now.toISOString(),
  });
});

// GET /api/philhealth/eligibility-log
export const getEligibilityLog = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, eligibilityLog.slice(0, 50));
});
