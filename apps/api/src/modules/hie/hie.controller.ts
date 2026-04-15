import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

// ── Helper: write audit entry ──────────────────────────────────────────────────
async function addAudit(
  action: string,
  patientId: string,
  performedBy: string,
  facility: string,
  details: string
): Promise<void> {
  await prisma.hieAuditEntry.create({
    data: { action, patientId, performedBy, facility, details },
  });
}

// POST /api/hie/consent
export const recordConsent = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, consentType, authorizedHospital, notes } = req.body;
  if (!patientId || !consentType) {
    errorResponse(res, 'patientId and consentType are required', 400);
    return;
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const consent = await prisma.hieConsent.upsert({
    where: { patientId },
    update: { consentType, authorizedHospital: authorizedHospital ?? null, notes: notes ?? null },
    create: { patientId, consentType, authorizedHospital: authorizedHospital ?? null, notes: notes ?? null },
  });

  await addAudit('CONSENT_RECORDED', patientId, req.user?.username || 'system', 'iHIMS Hospital', `Consent type: ${consentType}`);

  successResponse(res, consent, 'Consent recorded');
});

// GET /api/hie/consent/:patientId
export const getConsent = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const consent = await prisma.hieConsent.findUnique({ where: { patientId } });
  if (!consent) {
    successResponse(res, { patientId, consentType: null, hasConsent: false });
    return;
  }
  successResponse(res, { ...consent, hasConsent: true });
});

// POST /api/hie/request-records
export const requestRecords = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, requestingFacility, requestedFacility, reason } = req.body;
  if (!patientId || !requestingFacility || !requestedFacility || !reason) {
    errorResponse(res, 'patientId, requestingFacility, requestedFacility, and reason are required', 400);
    return;
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const year = new Date().getFullYear();
  const count = await prisma.hieRequest.count();
  const requestNo = `HIE-REQ-${year}-${String(count + 1).padStart(4, '0')}`;

  const newRequest = await prisma.hieRequest.create({
    data: { requestNo, patientId, requestingFacility, requestedFacility, reason, status: 'PENDING' },
  });

  await addAudit('RECORDS_REQUESTED', patientId, req.user?.username || 'system', requestingFacility, `Requested from ${requestedFacility}: ${reason}`);

  successResponse(res, newRequest, 'Record request created', 201);
});

// GET /api/hie/requests
export const getRequests = asyncHandler(async (req: Request, res: Response) => {
  const requests = await prisma.hieRequest.findMany({ orderBy: { createdAt: 'desc' } });
  const enriched = await Promise.all(
    requests.map(async (r) => {
      const patient = await prisma.patient.findUnique({
        where: { id: r.patientId },
        select: { patientNo: true, firstName: true, lastName: true },
      });
      return { ...r, patient };
    })
  );
  successResponse(res, enriched);
});

// POST /api/hie/referral
export const sendReferral = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, referringDoctor, receivingFacility, reason, urgency = 'ROUTINE' } = req.body;
  if (!patientId || !referringDoctor || !receivingFacility || !reason) {
    errorResponse(res, 'patientId, referringDoctor, receivingFacility, and reason are required', 400);
    return;
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const year = new Date().getFullYear();
  const count = await prisma.hieReferral.count();
  const referralNo = `HIE-REF-${year}-${String(count + 1).padStart(4, '0')}`;

  const referral = await prisma.hieReferral.create({
    data: { referralNo, patientId, referringDoctor, receivingFacility, reason, urgency, status: 'SENT' },
  });

  await addAudit('REFERRAL_SENT', patientId, req.user?.username || 'system', 'iHIMS Hospital', `Referred to ${receivingFacility} by Dr. ${referringDoctor}. Urgency: ${urgency}`);

  // Generate FHIR bundle snapshot
  const vitals = await prisma.vitalSigns.findMany({ where: { patientId }, take: 3, orderBy: { recordedAt: 'desc' } });
  const fhirBundle = buildFhirBundle(patient, vitals, []);

  successResponse(res, { referral, fhirBundle }, 'Referral sent', 201);
});

// GET /api/hie/referrals
export const getReferrals = asyncHandler(async (req: Request, res: Response) => {
  const referrals = await prisma.hieReferral.findMany({ orderBy: { createdAt: 'desc' } });
  const enriched = await Promise.all(
    referrals.map(async (r) => {
      const patient = await prisma.patient.findUnique({
        where: { id: r.patientId },
        select: { patientNo: true, firstName: true, lastName: true },
      });
      return { ...r, patient };
    })
  );
  successResponse(res, enriched);
});

// GET /api/hie/fhir/:patientId
export const getFhirBundle = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const [vitals, consultations] = await Promise.all([
    prisma.vitalSigns.findMany({ where: { patientId }, take: 5, orderBy: { recordedAt: 'desc' } }),
    prisma.consultation.findMany({ where: { patientId }, take: 5, orderBy: { scheduledAt: 'desc' } }),
  ]);

  const bundle = buildFhirBundle(patient, vitals, consultations);

  await addAudit('FHIR_BUNDLE_GENERATED', patientId, req.user?.username || 'system', 'iHIMS Hospital', `FHIR R4 bundle generated for patient ${patient.patientNo}`);

  successResponse(res, bundle);
});

// GET /api/hie/audit-log
export const getAuditLog = asyncHandler(async (_req: Request, res: Response) => {
  const log = await prisma.hieAuditEntry.findMany({ orderBy: { createdAt: 'desc' } });
  successResponse(res, log);
});

// ── FHIR R4 bundle builder ─────────────────────────────────────────────────────
function buildFhirBundle(patient: any, vitals: any[], _consultations: any[]) {
  return {
    resourceType: 'Bundle',
    id: uuidv4(),
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: [{ system: 'https://ihims.hospital.ph/patients', value: patient.patientNo }],
          name: [{ family: patient.lastName, given: [patient.firstName, patient.middleName].filter(Boolean) }],
          gender: patient.gender?.toLowerCase(),
          birthDate: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : undefined,
          telecom: patient.phone ? [{ system: 'phone', value: patient.phone }] : [],
        },
      },
      ...vitals.slice(0, 5).map((v) => ({
        resource: {
          resourceType: 'Observation',
          id: v.id,
          status: 'final',
          code: { text: 'Vital Signs' },
          subject: { reference: `Patient/${patient.id}` },
          effectiveDateTime: v.recordedAt,
          component: [
            v.bloodPressureSystolic && { code: { text: 'Systolic BP' }, valueQuantity: { value: v.bloodPressureSystolic, unit: 'mmHg' } },
            v.bloodPressureDiastolic && { code: { text: 'Diastolic BP' }, valueQuantity: { value: v.bloodPressureDiastolic, unit: 'mmHg' } },
            v.heartRate && { code: { text: 'Heart Rate' }, valueQuantity: { value: v.heartRate, unit: '/min' } },
            v.temperature && { code: { text: 'Temperature' }, valueQuantity: { value: v.temperature, unit: '°C' } },
          ].filter(Boolean),
        },
      })),
    ],
  };
}
