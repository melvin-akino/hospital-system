import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';
import {
  checkHmoEligibility,
  requestHmoAuthorization,
  submitHmoClaim,
  getHmoClaimStatus,
  generateRefNo,
  isHmoApiEnabled,
} from './hmo-api.service';

// ============ ADAPTER PATTERN (local DB simulation) ============

interface NormalizedEligibility {
  eligible: boolean;
  memberNo: string | null;
  plan: string | null;
  coverageDetails: Record<string, unknown>;
  validUntil: string | null;
  hmoName: string;
}

interface HmoAdapter {
  formatEligibilityResponse: (
    registration: {
      memberNo: string;
      plan?: string | null;
      validUntil?: Date | null;
      hmoCompany: { name: string; code: string };
    } | null,
    eligible: boolean
  ) => NormalizedEligibility;
}

function getLocalAdapter(hmoCode: string): HmoAdapter {
  const code = hmoCode.toUpperCase();

  if (code === 'MAXICARE') {
    return {
      formatEligibilityResponse: (reg, eligible) => ({
        eligible,
        memberNo: reg?.memberNo ?? null,
        plan:     reg?.plan ?? null,
        coverageDetails: reg
          ? {
              eligibilityStatus: eligible ? 'ACTIVE' : 'INACTIVE',
              benefit: { planName: reg.plan ?? 'Standard', coverageType: 'COMPREHENSIVE', annualLimit: 1_000_000, roomAndBoard: 3_000 },
            }
          : { eligibilityStatus: 'NOT_FOUND', benefit: {} },
        validUntil: reg?.validUntil ? reg.validUntil.toISOString().split('T')[0]! : null,
        hmoName: reg?.hmoCompany.name ?? 'Maxicare Healthcare',
      }),
    };
  }

  if (code === 'PHILAM') {
    return {
      formatEligibilityResponse: (reg, eligible) => ({
        eligible,
        memberNo: reg?.memberNo ?? null,
        plan:     reg?.plan ?? null,
        coverageDetails: reg
          ? {
              status: eligible ? 'eligible' : 'ineligible',
              coverage: { plan: reg.plan ?? 'Basic', in_patient_limit: 500_000, out_patient_limit: 50_000, dental: true },
            }
          : { status: 'not_found', coverage: {} },
        validUntil: reg?.validUntil ? reg.validUntil.toISOString().split('T')[0]! : null,
        hmoName: reg?.hmoCompany.name ?? 'PhilamHealth',
      }),
    };
  }

  // Generic adapter
  return {
    formatEligibilityResponse: (reg, eligible) => ({
      eligible,
      memberNo: reg?.memberNo ?? null,
      plan:     reg?.plan ?? null,
      coverageDetails: reg
        ? { eligible, details: { plan: reg.plan ?? 'Standard', memberNo: reg.memberNo, validUntil: reg.validUntil } }
        : { eligible: false, details: {} },
      validUntil: reg?.validUntil ? reg.validUntil.toISOString().split('T')[0]! : null,
      hmoName: reg?.hmoCompany.name ?? 'HMO Company',
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hmo/:hmoId/verify-eligibility/:patientId
// ─────────────────────────────────────────────────────────────────────────────
export const verifyHmoEligibility = asyncHandler(async (req: Request, res: Response) => {
  const { hmoId, patientId } = req.params;

  const [hmo, patient] = await Promise.all([
    prisma.hmoCompany.findUnique({ where: { id: hmoId } }),
    prisma.patient.findUnique({ where: { id: patientId } }),
  ]);

  if (!hmo)     { errorResponse(res, 'HMO company not found', 404); return; }
  if (!patient) { errorResponse(res, 'Patient not found', 404); return; }

  const now = new Date();

  // Look up local registration (needed for memberNo in API call)
  const registration = await prisma.hmoRegistration.findFirst({
    where: { patientId, hmoCompanyId: hmoId, isActive: true },
    include: { hmoCompany: { select: { name: true, code: true } } },
    orderBy: { validUntil: 'desc' },
  });

  const localEligible = !!registration && (!registration.validUntil || registration.validUntil > now);

  // ── Try real HMO API if credentials configured ────────────────────────────
  if (isHmoApiEnabled(hmo.code) && registration?.memberNo) {
    const apiResult = await checkHmoEligibility(
      hmo.code,
      hmo.name,
      registration.memberNo,
      `${patient.lastName}, ${patient.firstName}`,
    );

    if (apiResult) {
      successResponse(res, {
        ...apiResult,
        patientName: `${patient.lastName}, ${patient.firstName}`,
        patientNo: patient.patientNo,
        checkedAt: now.toISOString(),
        hmoApiEnabled: true,
      });
      return;
    }
  }

  // ── Fall back to local DB ─────────────────────────────────────────────────
  const adapter    = getLocalAdapter(hmo.code);
  const normalized = adapter.formatEligibilityResponse(registration, localEligible);

  successResponse(res, {
    ...normalized,
    patientName: `${patient.lastName}, ${patient.firstName}`,
    patientNo: patient.patientNo,
    checkedAt: now.toISOString(),
    isSimulated: true,
    hmoApiEnabled: false,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hmo/:hmoId/request-authorization
// ─────────────────────────────────────────────────────────────────────────────
export const requestAuthorization = asyncHandler(async (req: Request, res: Response) => {
  const { hmoId } = req.params;
  const { patientId, procedureCodes, estimatedAmount, diagnosis } = req.body;

  if (!patientId || !estimatedAmount) {
    errorResponse(res, 'patientId and estimatedAmount are required', 400);
    return;
  }

  const [hmo, patient] = await Promise.all([
    prisma.hmoCompany.findUnique({ where: { id: hmoId } }),
    prisma.patient.findUnique({ where: { id: patientId } }),
  ]);

  if (!hmo)     { errorResponse(res, 'HMO company not found', 404); return; }
  if (!patient) { errorResponse(res, 'Patient not found', 404); return; }

  // Find member no for API call
  const registration = await prisma.hmoRegistration.findFirst({
    where: { patientId, hmoCompanyId: hmoId, isActive: true },
    orderBy: { validUntil: 'desc' },
  });

  const now = new Date();

  // ── Try real HMO API ──────────────────────────────────────────────────────
  if (isHmoApiEnabled(hmo.code) && registration?.memberNo) {
    const apiResult = await requestHmoAuthorization(hmo.code, hmo.name, {
      memberNo:        registration.memberNo,
      patientName:     `${patient.lastName}, ${patient.firstName}`,
      procedureCodes:  Array.isArray(procedureCodes) ? procedureCodes : [],
      diagnosis:       (diagnosis as string | undefined) ?? null,
      estimatedAmount: Number(estimatedAmount),
    });

    if (apiResult) {
      // Update pending claim with auth no
      await attachAuthToClaim(patientId, hmoId, apiResult.authorizationNo);

      successResponse(res, {
        ...apiResult,
        hmoName: hmo.name,
        hmoCode: hmo.code,
        patientName:    `${patient.lastName}, ${patient.firstName}`,
        patientNo:      patient.patientNo,
        procedureCodes: Array.isArray(procedureCodes) ? procedureCodes : [],
        diagnosis:      diagnosis ?? null,
        estimatedAmount: Number(estimatedAmount),
        issuedAt: now.toISOString(),
        hmoApiEnabled: true,
      });
      return;
    }
  }

  // ── Simulation fallback ───────────────────────────────────────────────────
  const yr  = now.getFullYear();
  const mo  = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  const authorizationNo = `${hmo.code.toUpperCase().slice(0, 3)}-AUTH-${yr}${mo}-${seq}`;
  const approvedAmount  = Math.round(Number(estimatedAmount) * 0.95 * 100) / 100;
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);

  await attachAuthToClaim(patientId, hmoId, authorizationNo);

  successResponse(res, {
    authorizationNo,
    hmoName: hmo.name,
    hmoCode: hmo.code,
    patientName:    `${patient.lastName}, ${patient.firstName}`,
    patientNo:      patient.patientNo,
    procedureCodes: procedureCodes || [],
    diagnosis:      diagnosis || null,
    estimatedAmount: Number(estimatedAmount),
    approvedAmount,
    validUntil: validUntil.toISOString().split('T')[0],
    issuedAt:   now.toISOString(),
    isSimulated: true,
    hmoApiEnabled: false,
    conditions: [
      'Authorization is valid for 30 days.',
      'Actual billed amount may differ from approved amount.',
      'All procedures must be medically necessary.',
      `Contact ${hmo.name} for benefit queries.`,
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/hmo/:hmoId/submit-claim
// ─────────────────────────────────────────────────────────────────────────────
export const submitClaim = asyncHandler(async (req: Request, res: Response) => {
  const { hmoId } = req.params;
  const { claimId } = req.body;

  if (!claimId) { errorResponse(res, 'claimId is required', 400); return; }

  const [hmo, claim] = await Promise.all([
    prisma.hmoCompany.findUnique({ where: { id: hmoId } }),
    prisma.hmoClaim.findUnique({
      where: { id: claimId },
      include: {
        hmoCompany: { select: { name: true, code: true } },
        patient:    { select: { firstName: true, lastName: true } },
        hmoRegistration: { select: { memberNo: true } },
      },
    }),
  ]);

  if (!hmo)   { errorResponse(res, 'HMO company not found', 404); return; }
  if (!claim) { errorResponse(res, 'HMO claim not found', 404); return; }
  if (claim.hmoCompanyId !== hmoId)                    { errorResponse(res, 'Claim does not belong to this HMO', 400); return; }
  if (claim.status === 'SUBMITTED' || claim.status === 'APPROVED') {
    errorResponse(res, `Claim is already ${claim.status}`, 400);
    return;
  }

  const memberNo = (claim as unknown as Record<string, unknown>)['hmoRegistration'] &&
    ((claim as unknown as Record<string, { memberNo?: string }>)['hmoRegistration']?.memberNo);

  // Extract existing auth no from notes if present
  const authMatch = claim.notes?.match(/Auth:\s*([\w-]+)/);
  const authorizationNo = authMatch?.[1] ?? undefined;

  // ── Try real HMO API ──────────────────────────────────────────────────────
  let referenceNo: string;
  let isSimulated = true;
  let status = 'SUBMITTED';

  if (isHmoApiEnabled(hmo.code) && memberNo) {
    const apiResult = await submitHmoClaim(hmo.code, hmo.name, {
      claimNo:         claim.claimNo,
      memberNo:        memberNo as string,
      patientName:     `${claim.patient.lastName}, ${claim.patient.firstName}`,
      diagnosis:       null,
      claimAmount:     Number(claim.amount),
      authorizationNo,
    });

    if (apiResult) {
      referenceNo  = apiResult.referenceNo;
      isSimulated  = false;
      status       = apiResult.status;
    } else {
      referenceNo = generateRefNo(hmo.code);
    }
  } else {
    // Use adapter-based reference number generation
    referenceNo = generateRefNo(hmo.code);
  }

  const notesSuffix = `Ref: ${referenceNo}${isSimulated ? ' [sim]' : ''}`;
  const updated = await prisma.hmoClaim.update({
    where: { id: claimId },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      notes: claim.notes ? `${claim.notes} | ${notesSuffix}` : notesSuffix,
    },
    include: { hmoCompany: { select: { name: true, code: true } } },
  });

  successResponse(res, {
    success:     true,
    referenceNo,
    claimNo:     updated.claimNo,
    hmoName:     hmo.name,
    status,
    submittedAt: updated.submittedAt,
    isSimulated,
    hmoApiEnabled: isHmoApiEnabled(hmo.code),
    message: `Claim ${updated.claimNo} submitted to ${hmo.name}. Reference No: ${referenceNo}`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hmo/:hmoId/claim-status/:claimId
// ─────────────────────────────────────────────────────────────────────────────
export const getClaimStatus = asyncHandler(async (req: Request, res: Response) => {
  const { hmoId, claimId } = req.params;

  const [hmo, claim] = await Promise.all([
    prisma.hmoCompany.findUnique({ where: { id: hmoId } }),
    prisma.hmoClaim.findUnique({
      where: { id: claimId },
      include: { hmoCompany: true },
    }),
  ]);

  if (!hmo)   { errorResponse(res, 'HMO company not found', 404); return; }
  if (!claim) { errorResponse(res, 'HMO claim not found', 404); return; }

  // Extract reference no from notes
  const match = claim.notes?.match(/Ref:\s*([\w-]+)/);
  const referenceNo = match?.[1] ?? claim.claimNo;

  // ── Try live status from HMO API ──────────────────────────────────────────
  let currentStatus = claim.status;
  let apiRemarks: string | null = null;
  let apiApprovedAmount: number | null = null;
  let isSimulated = true;

  if (isHmoApiEnabled(hmo.code)) {
    const apiStatus = await getHmoClaimStatus(hmo.code, referenceNo);
    if (apiStatus) {
      isSimulated = false;
      apiRemarks = apiStatus.remarks;
      apiApprovedAmount = apiStatus.approvedAmount;

      if (apiStatus.status === 'APPROVED' && claim.status !== 'APPROVED') {
        currentStatus = 'APPROVED';
        await prisma.hmoClaim.update({ where: { id: claim.id }, data: { status: 'APPROVED', approvedAt: new Date() } });
      } else if (apiStatus.status === 'REJECTED' && claim.status !== 'REJECTED') {
        currentStatus = 'REJECTED';
        await prisma.hmoClaim.update({ where: { id: claim.id }, data: { status: 'REJECTED' } });
      }
    }
  }

  // Simulation fallback: auto-progress after 60 s
  if (isSimulated && claim.status === 'SUBMITTED' && claim.submittedAt &&
      Date.now() - new Date(claim.submittedAt).getTime() > 60_000) {
    currentStatus = 'APPROVED';
    await prisma.hmoClaim.update({ where: { id: claim.id }, data: { status: 'APPROVED', approvedAt: new Date() } });
  }

  const timeline = [
    { step: 'Claim Created',   date: claim.createdAt.toISOString(),                                                                done: true },
    { step: 'Submitted to HMO', date: claim.submittedAt?.toISOString() ?? null,                                                   done: !!claim.submittedAt },
    { step: 'Under Review',    date: claim.submittedAt ? new Date(new Date(claim.submittedAt).getTime() + 30_000).toISOString() : null, done: currentStatus === 'APPROVED' || currentStatus === 'REJECTED' },
    { step: 'Approved',        date: claim.approvedAt?.toISOString() ?? null,                                                     done: currentStatus === 'APPROVED' },
  ];

  successResponse(res, {
    claimId:       claim.id,
    claimNo:       claim.claimNo,
    referenceNo,
    status:        currentStatus,
    amount:        Number(claim.amount),
    approvedAmount: apiApprovedAmount,
    remarks:       apiRemarks,
    hmoName:       hmo.name,
    hmoCode:       hmo.code,
    submittedAt:   claim.submittedAt,
    approvedAt:    claim.approvedAt,
    timeline,
    isSimulated,
    hmoApiEnabled: isHmoApiEnabled(hmo.code),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/hmo/config
// ─────────────────────────────────────────────────────────────────────────────
export const getHmoApiConfig = asyncHandler(async (_req: Request, res: Response) => {
  const hmoCompanies = await prisma.hmoCompany.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });

  const config = hmoCompanies.map((h) => ({
    id:             h.id,
    name:           h.name,
    code:           h.code,
    apiEnabled:     isHmoApiEnabled(h.code),
  }));

  successResponse(res, { hmoCompanies: config });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function attachAuthToClaim(patientId: string, hmoCompanyId: string, authNo: string) {
  const pendingClaim = await prisma.hmoClaim.findFirst({
    where: { patientId, hmoCompanyId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
  if (pendingClaim) {
    await prisma.hmoClaim.update({
      where: { id: pendingClaim.id },
      data: {
        notes: pendingClaim.notes
          ? `${pendingClaim.notes} | Auth: ${authNo}`
          : `Auth: ${authNo}`,
      },
    });
  }
}
