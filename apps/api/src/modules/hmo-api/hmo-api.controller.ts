import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

// ============ ADAPTER PATTERN ============

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
  generateReferenceNo: (claimNo: string) => string;
}

function getHmoAdapter(hmoCode: string): HmoAdapter {
  const code = hmoCode.toUpperCase();

  if (code === 'MAXICARE') {
    return {
      formatEligibilityResponse: (reg, eligible) => {
        // Maxicare format: { eligibilityStatus: 'ACTIVE', benefit: {...} }
        const raw = reg
          ? {
              eligibilityStatus: eligible ? 'ACTIVE' : 'INACTIVE',
              benefit: {
                planName: reg.plan ?? 'Standard',
                coverageType: 'COMPREHENSIVE',
                annualLimit: 1_000_000,
                roomAndBoard: 3_000,
              },
            }
          : { eligibilityStatus: 'NOT_FOUND', benefit: {} };

        return {
          eligible,
          memberNo: reg?.memberNo ?? null,
          plan: reg?.plan ?? null,
          coverageDetails: raw,
          validUntil: reg?.validUntil ? reg.validUntil.toISOString().split('T')[0] : null,
          hmoName: reg?.hmoCompany.name ?? 'Maxicare Healthcare',
        };
      },
      generateReferenceNo: (claimNo) => {
        const seq = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
        return `MAX-${new Date().getFullYear()}-${seq}-${claimNo.slice(-4)}`;
      },
    };
  }

  if (code === 'PHILAM') {
    return {
      formatEligibilityResponse: (reg, eligible) => {
        // Philam format: { status: 'eligible', coverage: {...} }
        const raw = reg
          ? {
              status: eligible ? 'eligible' : 'ineligible',
              coverage: {
                plan: reg.plan ?? 'Basic',
                in_patient_limit: 500_000,
                out_patient_limit: 50_000,
                dental: true,
              },
            }
          : { status: 'not_found', coverage: {} };

        return {
          eligible,
          memberNo: reg?.memberNo ?? null,
          plan: reg?.plan ?? null,
          coverageDetails: raw,
          validUntil: reg?.validUntil ? reg.validUntil.toISOString().split('T')[0] : null,
          hmoName: reg?.hmoCompany.name ?? 'PhilamHealth',
        };
      },
      generateReferenceNo: (claimNo) => {
        const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
        return `PA${new Date().getFullYear()}${seq}${claimNo.slice(-3)}`;
      },
    };
  }

  // Generic adapter for all other HMOs
  return {
    formatEligibilityResponse: (reg, eligible) => {
      const raw = reg
        ? {
            eligible,
            details: {
              plan: reg.plan ?? 'Standard',
              memberNo: reg.memberNo,
              validUntil: reg.validUntil,
            },
          }
        : { eligible: false, details: {} };

      return {
        eligible,
        memberNo: reg?.memberNo ?? null,
        plan: reg?.plan ?? null,
        coverageDetails: raw,
        validUntil: reg?.validUntil ? reg.validUntil.toISOString().split('T')[0] : null,
        hmoName: reg?.hmoCompany.name ?? 'HMO Company',
      };
    },
    generateReferenceNo: (claimNo) => {
      const seq = String(Math.floor(Math.random() * 9999999)).padStart(7, '0');
      return `HMO-REF-${seq}`;
    },
  };
}

// POST /api/hmo/:hmoId/verify-eligibility/:patientId
export const verifyHmoEligibility = asyncHandler(async (req: Request, res: Response) => {
  const { hmoId, patientId } = req.params;

  const [hmo, patient] = await Promise.all([
    prisma.hmoCompany.findUnique({ where: { id: hmoId } }),
    prisma.patient.findUnique({ where: { id: patientId } }),
  ]);

  if (!hmo) {
    errorResponse(res, 'HMO company not found', 404);
    return;
  }
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const now = new Date();
  const registration = await prisma.hmoRegistration.findFirst({
    where: {
      patientId,
      hmoCompanyId: hmoId,
      isActive: true,
    },
    include: {
      hmoCompany: { select: { name: true, code: true } },
    },
    orderBy: { validUntil: 'desc' },
  });

  const eligible = !!registration && (!registration.validUntil || registration.validUntil > now);

  const adapter = getHmoAdapter(hmo.code);
  const normalized = adapter.formatEligibilityResponse(registration, eligible);

  successResponse(res, {
    ...normalized,
    patientName: `${patient.lastName}, ${patient.firstName}`,
    patientNo: patient.patientNo,
    checkedAt: now.toISOString(),
  });
});

// POST /api/hmo/:hmoId/request-authorization
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

  if (!hmo) {
    errorResponse(res, 'HMO company not found', 404);
    return;
  }
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  const authorizationNo = `${hmo.code.toUpperCase().slice(0, 3)}-AUTH-${yr}${mo}-${seq}`;

  // Approved amount: 95% of estimated
  const approvedAmount = Math.round(Number(estimatedAmount) * 0.95 * 100) / 100;

  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);

  // If there's a pending HMO claim for this patient+HMO, update it
  const pendingClaim = await prisma.hmoClaim.findFirst({
    where: { patientId, hmoCompanyId: hmoId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  if (pendingClaim) {
    await prisma.hmoClaim.update({
      where: { id: pendingClaim.id },
      data: {
        notes: pendingClaim.notes
          ? `${pendingClaim.notes} | Auth: ${authorizationNo}`
          : `Auth: ${authorizationNo}`,
      },
    });
  }

  successResponse(res, {
    authorizationNo,
    hmoName: hmo.name,
    hmoCode: hmo.code,
    patientName: `${patient.lastName}, ${patient.firstName}`,
    patientNo: patient.patientNo,
    procedureCodes: procedureCodes || [],
    diagnosis: diagnosis || null,
    estimatedAmount: Number(estimatedAmount),
    approvedAmount,
    validUntil: validUntil.toISOString().split('T')[0],
    issuedAt: now.toISOString(),
    conditions: [
      'Authorization is valid for 30 days.',
      'Actual billed amount may differ from approved amount.',
      'All procedures must be medically necessary.',
      `Contact ${hmo.name} for benefit queries.`,
    ],
  });
});

// POST /api/hmo/:hmoId/submit-claim
export const submitClaim = asyncHandler(async (req: Request, res: Response) => {
  const { hmoId } = req.params;
  const { claimId } = req.body;

  if (!claimId) {
    errorResponse(res, 'claimId is required', 400);
    return;
  }

  const [hmo, claim] = await Promise.all([
    prisma.hmoCompany.findUnique({ where: { id: hmoId } }),
    prisma.hmoClaim.findUnique({
      where: { id: claimId },
      include: { hmoCompany: { select: { name: true, code: true } } },
    }),
  ]);

  if (!hmo) {
    errorResponse(res, 'HMO company not found', 404);
    return;
  }
  if (!claim) {
    errorResponse(res, 'HMO claim not found', 404);
    return;
  }
  if (claim.hmoCompanyId !== hmoId) {
    errorResponse(res, 'Claim does not belong to this HMO', 400);
    return;
  }
  if (claim.status === 'SUBMITTED' || claim.status === 'APPROVED') {
    errorResponse(res, `Claim is already ${claim.status}`, 400);
    return;
  }

  const adapter = getHmoAdapter(hmo.code);
  const referenceNo = adapter.generateReferenceNo(claim.claimNo);

  const updated = await prisma.hmoClaim.update({
    where: { id: claimId },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      notes: claim.notes
        ? `${claim.notes} | Ref: ${referenceNo}`
        : `Ref: ${referenceNo}`,
    },
    include: { hmoCompany: { select: { name: true, code: true } } },
  });

  successResponse(res, {
    success: true,
    referenceNo,
    claimNo: updated.claimNo,
    hmoName: hmo.name,
    submittedAt: updated.submittedAt,
    message: `Claim ${updated.claimNo} submitted to ${hmo.name}. Reference No: ${referenceNo}`,
  });
});

// GET /api/hmo/:hmoId/claim-status/:claimId
export const getClaimStatus = asyncHandler(async (req: Request, res: Response) => {
  const { hmoId, claimId } = req.params;

  const [hmo, claim] = await Promise.all([
    prisma.hmoCompany.findUnique({ where: { id: hmoId } }),
    prisma.hmoClaim.findUnique({
      where: { id: claimId },
      include: { hmoCompany: true },
    }),
  ]);

  if (!hmo) {
    errorResponse(res, 'HMO company not found', 404);
    return;
  }
  if (!claim) {
    errorResponse(res, 'HMO claim not found', 404);
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
    await prisma.hmoClaim.update({
      where: { id: claim.id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  const timeline = [
    { step: 'Claim Created', date: claim.createdAt.toISOString(), done: true },
    { step: 'Submitted to HMO', date: claim.submittedAt?.toISOString() ?? null, done: !!claim.submittedAt },
    {
      step: 'Under Review',
      date: claim.submittedAt
        ? new Date(new Date(claim.submittedAt).getTime() + 30_000).toISOString()
        : null,
      done: currentStatus === 'APPROVED' || currentStatus === 'REJECTED',
    },
    { step: 'Approved', date: claim.approvedAt?.toISOString() ?? null, done: currentStatus === 'APPROVED' },
  ];

  successResponse(res, {
    claimId: claim.id,
    claimNo: claim.claimNo,
    status: currentStatus,
    amount: Number(claim.amount),
    hmoName: hmo.name,
    hmoCode: hmo.code,
    submittedAt: claim.submittedAt,
    approvedAt: claim.approvedAt,
    timeline,
  });
});
