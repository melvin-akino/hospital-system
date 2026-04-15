import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';
import {
  verifyPhilHealthEligibility,
  submitPhilHealthClaim,
  getPhilHealthClaimStatus,
  requestPhilHealthAuthorization,
  isPhilHealthEnabled,
} from './philhealth-eclaims.service';

// In-memory eligibility log (session-scoped, last 50 checks)
interface EligibilityLogEntry {
  id: string;
  philhealthNo: string;
  lastName: string;
  dateOfBirth: string;
  eligible: boolean;
  memberName?: string | null;
  memberType?: string | null;
  status?: string;
  message: string;
  checkedAt: string;
  isSimulated: boolean;
}

const eligibilityLog: EligibilityLogEntry[] = [];

// POST /api/philhealth/verify-eligibility
export const verifyEligibility = asyncHandler(async (req: Request, res: Response) => {
  const { philhealthNo, lastName, dateOfBirth } = req.body;

  if (!philhealthNo || !lastName || !dateOfBirth) {
    errorResponse(res, 'philhealthNo, lastName, and dateOfBirth are required', 400);
    return;
  }

  // ── Try PhilHealth API first ──────────────────────────────────────────────
  const apiResult = await verifyPhilHealthEligibility(
    philhealthNo as string,
    lastName     as string,
    dateOfBirth  as string,
  );

  // ── If API returned a definitive result, also cross-check local DB ────────
  let localPatient = null;
  if (apiResult.eligible) {
    localPatient = await prisma.patient.findFirst({
      where: { philhealthNo: { equals: philhealthNo as string, mode: 'insensitive' } },
    });
  } else if (!isPhilHealthEnabled()) {
    // Simulation mode: use the local DB as the source of truth
    localPatient = await prisma.patient.findFirst({
      where: { philhealthNo: { equals: philhealthNo as string, mode: 'insensitive' } },
    });

    const checkedAt = new Date().toISOString();
    const logId = `EL-${Date.now()}`;

    if (!localPatient) {
      const entry: EligibilityLogEntry = {
        id: logId, philhealthNo, lastName, dateOfBirth,
        eligible: false, status: 'NOT_FOUND',
        message: 'No PhilHealth member found with the provided PhilHealth number.',
        checkedAt, isSimulated: true,
      };
      eligibilityLog.unshift(entry);
      if (eligibilityLog.length > 50) eligibilityLog.splice(50);

      successResponse(res, {
        eligible: false, memberName: null, memberType: null,
        status: 'NOT_FOUND', coverageStart: null, coverageEnd: null,
        message: entry.message, isSimulated: true,
        philhealthApiEnabled: false,
      });
      return;
    }

    // Validate last name
    if (localPatient.lastName.toLowerCase() !== (lastName as string).toLowerCase()) {
      const entry: EligibilityLogEntry = {
        id: logId, philhealthNo, lastName, dateOfBirth,
        eligible: false, memberType: undefined, status: 'MISMATCH',
        message: 'Patient last name does not match PhilHealth records.',
        checkedAt, isSimulated: true,
      };
      eligibilityLog.unshift(entry);
      if (eligibilityLog.length > 50) eligibilityLog.splice(50);

      successResponse(res, {
        eligible: false, memberName: null, memberType: null,
        status: 'MISMATCH', coverageStart: null, coverageEnd: null,
        message: entry.message, isSimulated: true,
        philhealthApiEnabled: false,
      });
      return;
    }

    // Validate DOB
    const dobFromDb = new Date(localPatient.dateOfBirth).toISOString().split('T')[0];
    const dobInput  = new Date(dateOfBirth as string).toISOString().split('T')[0];
    if (dobFromDb !== dobInput) {
      const entry: EligibilityLogEntry = {
        id: logId, philhealthNo, lastName, dateOfBirth,
        eligible: false, memberType: undefined, status: 'MISMATCH',
        message: 'Date of birth does not match PhilHealth records.',
        checkedAt, isSimulated: true,
      };
      eligibilityLog.unshift(entry);
      if (eligibilityLog.length > 50) eligibilityLog.splice(50);

      successResponse(res, {
        eligible: false, memberName: null, memberType: null,
        status: 'MISMATCH', coverageStart: null, coverageEnd: null,
        message: entry.message, isSimulated: true,
        philhealthApiEnabled: false,
      });
      return;
    }

    // Local DB check passed — build local response
    const age = new Date().getFullYear() - new Date(localPatient.dateOfBirth).getFullYear();
    const memberType = age >= 60 ? 'SENIOR_CITIZEN' : 'EMPLOYED';
    const year = new Date().getFullYear();

    const entry: EligibilityLogEntry = {
      id: logId, philhealthNo, lastName, dateOfBirth,
      eligible: true,
      memberName: `${localPatient.lastName}, ${localPatient.firstName}`,
      memberType, status: 'ACTIVE',
      message: 'Patient is eligible for PhilHealth benefits.',
      checkedAt, isSimulated: true,
    };
    eligibilityLog.unshift(entry);
    if (eligibilityLog.length > 50) eligibilityLog.splice(50);

    successResponse(res, {
      eligible: true,
      memberName: `${localPatient.lastName}, ${localPatient.firstName} ${localPatient.middleName ?? ''}`.trim(),
      memberType, status: 'ACTIVE',
      coverageStart: `${year}-01-01`,
      coverageEnd:   `${year}-12-31`,
      message: 'Patient is eligible for PhilHealth benefits.',
      isSimulated: true,
      philhealthApiEnabled: false,
    });
    return;
  }

  // ── Record in log and respond ─────────────────────────────────────────────
  const logEntry: EligibilityLogEntry = {
    id:          `EL-${Date.now()}`,
    philhealthNo,
    lastName:    lastName as string,
    dateOfBirth: dateOfBirth as string,
    eligible:    apiResult.eligible,
    memberName:  apiResult.memberName,
    memberType:  apiResult.memberType,
    status:      apiResult.status,
    message:     apiResult.message,
    checkedAt:   new Date().toISOString(),
    isSimulated: apiResult.isSimulated,
  };
  eligibilityLog.unshift(logEntry);
  if (eligibilityLog.length > 50) eligibilityLog.splice(50);

  // Enrich memberName from local DB if API didn't provide it
  const memberName = apiResult.memberName ?? (localPatient
    ? `${localPatient.lastName}, ${localPatient.firstName} ${localPatient.middleName ?? ''}`.trim()
    : null);

  successResponse(res, {
    ...apiResult,
    memberName,
    philhealthApiEnabled: isPhilHealthEnabled(),
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
      patient: {
        select: {
          firstName: true, lastName: true, philhealthNo: true,
          dateOfBirth: true,
        },
      },
    },
  });

  if (!claim) { errorResponse(res, 'PhilHealth claim not found', 404); return; }

  if (claim.status === 'SUBMITTED' || claim.status === 'APPROVED') {
    errorResponse(res, `Claim is already ${claim.status}`, 400);
    return;
  }

  // ── Call PhilHealth API (or simulate) ─────────────────────────────────────
  const apiResult = await submitPhilHealthClaim({
    claimNo:          claim.claimNo,
    philhealthNo:     claim.patient.philhealthNo,
    patientLastName:  claim.patient.lastName,
    patientFirstName: claim.patient.firstName,
    claimAmount:      Number(claim.claimAmount),
    principalDiagnosis: (claim as unknown as Record<string, unknown>)['principalDiagnosis'] as string | undefined,
  });

  // ── Persist transmittal number ────────────────────────────────────────────
  const notesSuffix = `Transmittal: ${apiResult.transmittalNo}${apiResult.isSimulated ? ' [sim]' : ''}`;
  const updated = await prisma.philHealthClaim.update({
    where: { id: claimId },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      notes: claim.notes
        ? `${claim.notes} | ${notesSuffix}`
        : notesSuffix,
    },
  });

  successResponse(res, {
    success:      apiResult.success,
    transmittalNo: apiResult.transmittalNo,
    referenceNo:  apiResult.referenceNo,
    claimNo:      updated.claimNo,
    status:       apiResult.status,
    message:      apiResult.message,
    isSimulated:  apiResult.isSimulated,
    philhealthApiEnabled: isPhilHealthEnabled(),
  });
});

// GET /api/philhealth/claim-status/:claimId
export const getClaimStatus = asyncHandler(async (req: Request, res: Response) => {
  const claim = await prisma.philHealthClaim.findUnique({
    where: { id: req.params['claimId'] },
    include: {
      patient: {
        select: { id: true, patientNo: true, firstName: true, lastName: true, philhealthNo: true },
      },
    },
  });

  if (!claim) { errorResponse(res, 'PhilHealth claim not found', 404); return; }

  // Extract reference/transmittal no from notes
  const match = claim.notes?.match(/Transmittal:\s*(PH-TRN-[\w-]+)/);
  const referenceNo = match?.[1] ?? claim.claimNo;

  // ── Query PhilHealth API for live status ──────────────────────────────────
  const apiStatus = await getPhilHealthClaimStatus(referenceNo);

  // Sync local status if API says APPROVED/REJECTED
  let currentStatus = claim.status;
  if (!apiStatus.isSimulated) {
    if (apiStatus.status === 'APPROVED' && claim.status !== 'APPROVED') {
      currentStatus = 'APPROVED';
      await prisma.philHealthClaim.update({
        where: { id: claim.id },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });
    } else if (apiStatus.status === 'REJECTED' && claim.status !== 'REJECTED') {
      currentStatus = 'REJECTED';
      await prisma.philHealthClaim.update({
        where: { id: claim.id },
        data: { status: 'REJECTED' },
      });
    }
  } else {
    // Simulation fallback: progress after 60 seconds
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
  }

  const timeline = [
    { step: 'Claim Created',         date: claim.createdAt.toISOString(),                                                          done: true },
    { step: 'Submitted to PhilHealth', date: claim.submittedAt?.toISOString() ?? null,                                              done: !!claim.submittedAt },
    { step: 'Under Review',           date: claim.submittedAt ? new Date(new Date(claim.submittedAt).getTime() + 30_000).toISOString() : null, done: currentStatus === 'APPROVED' || currentStatus === 'REJECTED' },
    { step: 'Approved',               date: claim.approvedAt?.toISOString() ?? null,                                               done: currentStatus === 'APPROVED' },
  ];

  successResponse(res, {
    claimId:        claim.id,
    claimNo:        claim.claimNo,
    referenceNo,
    status:         currentStatus,
    claimAmount:    Number(claim.claimAmount),
    approvedAmount: apiStatus.approvedAmount,
    remarks:        apiStatus.remarks,
    patient:        claim.patient,
    submittedAt:    claim.submittedAt,
    approvedAt:     claim.approvedAt,
    timeline,
    isSimulated:    apiStatus.isSimulated,
    philhealthApiEnabled: isPhilHealthEnabled(),
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
  if (!patient) { errorResponse(res, 'Patient not found', 404); return; }

  let caseRate = null;
  if (caseRateId) {
    caseRate = await prisma.philHealthCaseRate.findUnique({ where: { id: caseRateId } });
  }

  // ── Call PhilHealth API (or simulate) ─────────────────────────────────────
  const apiResult = await requestPhilHealthAuthorization({
    philhealthNo:    patient.philhealthNo,
    patientLastName: patient.lastName,
    caseRateCode:    caseRate?.icdCode,
    estimatedAmount: Number(estimatedAmount),
    admissionDate:   admissionDate as string | undefined,
  });

  successResponse(res, {
    authorizationNo: apiResult.authorizationNo,
    patientName:     `${patient.lastName}, ${patient.firstName}`,
    philhealthNo:    patient.philhealthNo,
    caseRate:        caseRate ? { icdCode: caseRate.icdCode, description: caseRate.description } : null,
    estimatedAmount: Number(estimatedAmount),
    approvedAmount:  apiResult.approvedAmount,
    validUntil:      apiResult.validUntil,
    conditions:      apiResult.conditions,
    issuedAt:        new Date().toISOString(),
    isSimulated:     apiResult.isSimulated,
    philhealthApiEnabled: isPhilHealthEnabled(),
  });
});

// GET /api/philhealth/eligibility-log
export const getEligibilityLog = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, eligibilityLog.slice(0, 50));
});

// GET /api/philhealth/config
export const getPhilHealthConfig = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, {
    philhealthApiEnabled: isPhilHealthEnabled(),
    facilityCode: process.env['PHILHEALTH_FACILITY_CODE']
      ? `${process.env['PHILHEALTH_FACILITY_CODE'].slice(0, 3)}****`
      : null,
  });
});
