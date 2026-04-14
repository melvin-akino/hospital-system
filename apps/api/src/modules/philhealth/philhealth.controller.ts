import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

// Generate unique claim number
const generateClaimNo = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.philHealthClaim.count();
  return `PH-${year}-${String(count + 1).padStart(6, '0')}`;
};

// GET /api/philhealth/case-rates
export const getCaseRates = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;

  const where: Record<string, unknown> = { isActive: true };
  if (q) {
    where['OR'] = [
      { icdCode: { contains: q as string, mode: 'insensitive' } },
      { description: { contains: q as string, mode: 'insensitive' } },
      { category: { contains: q as string, mode: 'insensitive' } },
    ];
  }

  const rates = await prisma.philHealthCaseRate.findMany({
    where,
    orderBy: { icdCode: 'asc' },
    take: 100,
  });

  successResponse(res, rates);
});

// GET /api/philhealth-claims
export const getClaims = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status, patientId, dateFrom, dateTo } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (patientId) where['patientId'] = patientId;
  if (dateFrom || dateTo) {
    where['createdAt'] = {
      ...(dateFrom && { gte: new Date(dateFrom as string) }),
      ...(dateTo && { lte: new Date(dateTo as string) }),
    };
  }

  const [claims, total] = await Promise.all([
    prisma.philHealthClaim.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
        bill: {
          select: { id: true, billNo: true, totalAmount: true },
        },
      },
    }),
    prisma.philHealthClaim.count({ where }),
  ]);

  // Attach case rate info manually since no direct relation on model
  const caseRateIds = claims
    .map((c) => c.caseRateId)
    .filter((id): id is string => !!id);

  const caseRates = caseRateIds.length
    ? await prisma.philHealthCaseRate.findMany({
        where: { id: { in: caseRateIds } },
      })
    : [];

  const caseRateMap = Object.fromEntries(caseRates.map((r) => [r.id, r]));

  const enriched = claims.map((c) => ({
    ...c,
    caseRate: c.caseRateId ? caseRateMap[c.caseRateId] ?? null : null,
  }));

  paginatedResponse(res, enriched, total, page, limit);
});

// GET /api/philhealth-claims/:id
export const getClaim = asyncHandler(async (req: Request, res: Response) => {
  const claim = await prisma.philHealthClaim.findUnique({
    where: { id: req.params['id'] },
    include: {
      patient: true,
      bill: {
        include: {
          items: true,
          payments: true,
        },
      },
    },
  });

  if (!claim) {
    errorResponse(res, 'PhilHealth claim not found', 404);
    return;
  }

  let caseRate = null;
  if (claim.caseRateId) {
    caseRate = await prisma.philHealthCaseRate.findUnique({
      where: { id: claim.caseRateId },
    });
  }

  successResponse(res, { ...claim, caseRate });
});

// POST /api/philhealth-claims
export const createClaim = asyncHandler(async (req: Request, res: Response) => {
  const { billId, patientId, caseRateId, claimAmount, notes } = req.body;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  if (billId) {
    const existing = await prisma.philHealthClaim.findFirst({
      where: { billId },
    });
    if (existing) {
      errorResponse(res, 'A PhilHealth claim already exists for this bill', 400);
      return;
    }
  }

  const claimNo = await generateClaimNo();

  const claim = await prisma.$transaction(async (tx) => {
    const newClaim = await tx.philHealthClaim.create({
      data: {
        claimNo,
        billId: billId || null,
        patientId,
        caseRateId: caseRateId || null,
        claimAmount,
        notes,
        status: 'PENDING',
      },
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

    // Auto-update bill's philhealthDeduction and recalculate totals
    if (billId) {
      const bill = await tx.bill.findUnique({
        where: { id: billId },
        include: { items: true },
      });

      if (bill) {
        const subtotal = Number(bill.subtotal);
        const discountAmount = Number(bill.discountAmount);
        const hmoDeduction = Number(bill.hmoDeduction);
        const newTotal = Math.max(
          0,
          subtotal - discountAmount - claimAmount - hmoDeduction
        );
        const newBalance = Math.max(0, newTotal - Number(bill.paidAmount));

        await tx.bill.update({
          where: { id: billId },
          data: {
            philhealthDeduction: claimAmount,
            totalAmount: newTotal,
            balance: newBalance,
          },
        });
      }
    }

    return newClaim;
  });

  successResponse(res, claim, 'PhilHealth claim created', 201);
});

// PUT /api/philhealth-claims/:id
export const updateClaim = asyncHandler(async (req: Request, res: Response) => {
  const claim = await prisma.philHealthClaim.findUnique({
    where: { id: req.params['id'] },
  });

  if (!claim) {
    errorResponse(res, 'PhilHealth claim not found', 404);
    return;
  }

  const { status, notes, submittedAt, approvedAt } = req.body;

  const updated = await prisma.philHealthClaim.update({
    where: { id: req.params['id'] },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(submittedAt && { submittedAt: new Date(submittedAt) }),
      ...(approvedAt && { approvedAt: new Date(approvedAt) }),
    },
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

  successResponse(res, updated, 'Claim updated');
});

// POST /api/philhealth-claims/:id/generate-cf4
export const generateCF4 = asyncHandler(async (req: Request, res: Response) => {
  const claim = await prisma.philHealthClaim.findUnique({
    where: { id: req.params['id'] },
    include: {
      patient: true,
    },
  });

  if (!claim) {
    errorResponse(res, 'PhilHealth claim not found', 404);
    return;
  }

  let caseRate = null;
  if (claim.caseRateId) {
    caseRate = await prisma.philHealthCaseRate.findUnique({
      where: { id: claim.caseRateId },
    });
  }

  const submissionDate = new Date().toISOString().split('T')[0];
  const icdCode = caseRate?.icdCode ?? 'N/A';
  const diagnosis = caseRate?.description ?? 'Not Specified';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PhilHealthClaim>
  <ClaimNo>${claim.claimNo}</ClaimNo>
  <PatientName>${claim.patient.lastName}, ${claim.patient.firstName}</PatientName>
  <PhilHealthNo>${claim.patient.philhealthNo ?? 'NOT REGISTERED'}</PhilHealthNo>
  <IcdCode>${icdCode}</IcdCode>
  <Diagnosis>${diagnosis}</Diagnosis>
  <ClaimAmount>${Number(claim.claimAmount).toFixed(2)}</ClaimAmount>
  <HospitalCode>PIBS-001</HospitalCode>
  <SubmissionDate>${submissionDate}</SubmissionDate>
</PhilHealthClaim>`;

  // Mark CF4 as generated
  await prisma.philHealthClaim.update({
    where: { id: req.params['id'] },
    data: { cf4Generated: true },
  });

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="CF4-${claim.claimNo}.xml"`
  );
  res.send(xml);
});

// GET /api/philhealth-claims/stats
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const [total, pending, approved, amountAgg, approvedAgg] = await Promise.all([
    prisma.philHealthClaim.count(),
    prisma.philHealthClaim.count({ where: { status: 'PENDING' } }),
    prisma.philHealthClaim.count({ where: { status: 'APPROVED' } }),
    prisma.philHealthClaim.aggregate({ _sum: { claimAmount: true } }),
    prisma.philHealthClaim.aggregate({
      where: { status: 'APPROVED' },
      _sum: { claimAmount: true },
    }),
  ]);

  successResponse(res, {
    totalClaims: total,
    pending,
    approved,
    totalAmount: Number(amountAgg._sum.claimAmount ?? 0),
    approvedAmount: Number(approvedAgg._sum.claimAmount ?? 0),
  });
});
