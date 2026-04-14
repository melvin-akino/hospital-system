import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

const DATA_DIR = path.join(__dirname, '../../../data');
const CONSENTS_FILE = path.join(DATA_DIR, 'hie-consents.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'hie-requests.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'hie-referrals.json');
const AUDIT_FILE = path.join(DATA_DIR, 'hie-audit-log.json');

interface HieConsent {
  id: string;
  patientId: string;
  consentType: 'SHARE' | 'RESTRICT';
  authorizedHospital?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface HieRequest {
  id: string;
  requestNo: string;
  patientId: string;
  requestingFacility: string;
  requestedFacility: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  createdAt: string;
}

interface HieReferral {
  id: string;
  referralNo: string;
  patientId: string;
  referringDoctor: string;
  receivingFacility: string;
  reason: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: 'SENT' | 'RECEIVED' | 'COMPLETED';
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  patientId: string;
  performedBy: string;
  facility: string;
  details: string;
  createdAt: string;
}

function readFile<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeFile<T>(filePath: string, data: T[]): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function addAudit(action: string, patientId: string, performedBy: string, facility: string, details: string): void {
  const log = readFile<AuditEntry>(AUDIT_FILE);
  log.push({
    id: uuidv4(),
    action,
    patientId,
    performedBy,
    facility,
    details,
    createdAt: new Date().toISOString(),
  });
  writeFile(AUDIT_FILE, log);
}

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

  const consents = readFile<HieConsent>(CONSENTS_FILE);
  const existingIdx = consents.findIndex((c) => c.patientId === patientId);

  const consentRecord: HieConsent = {
    id: existingIdx >= 0 ? consents[existingIdx].id : uuidv4(),
    patientId,
    consentType,
    authorizedHospital,
    notes,
    createdAt: existingIdx >= 0 ? consents[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    consents[existingIdx] = consentRecord;
  } else {
    consents.push(consentRecord);
  }
  writeFile(CONSENTS_FILE, consents);

  addAudit(
    'CONSENT_RECORDED',
    patientId,
    req.user?.username || 'system',
    'PIBS Hospital',
    `Consent type: ${consentType}`
  );

  successResponse(res, consentRecord, 'Consent recorded');
});

export const getConsent = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const consents = readFile<HieConsent>(CONSENTS_FILE);
  const consent = consents.find((c) => c.patientId === patientId);
  if (!consent) {
    successResponse(res, { patientId, consentType: null, hasConsent: false });
    return;
  }
  successResponse(res, { ...consent, hasConsent: true });
});

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

  const requests = readFile<HieRequest>(REQUESTS_FILE);
  const requestNo = `HIE-REQ-${new Date().getFullYear()}-${String(requests.length + 1).padStart(4, '0')}`;

  const newRequest: HieRequest = {
    id: uuidv4(),
    requestNo,
    patientId,
    requestingFacility,
    requestedFacility,
    reason,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  requests.push(newRequest);
  writeFile(REQUESTS_FILE, requests);

  addAudit(
    'RECORDS_REQUESTED',
    patientId,
    req.user?.username || 'system',
    requestingFacility,
    `Requested from ${requestedFacility}: ${reason}`
  );

  successResponse(res, newRequest, 'Record request created', 201);
});

export const getRequests = asyncHandler(async (req: Request, res: Response) => {
  const requests = readFile<HieRequest>(REQUESTS_FILE);
  const enriched = await Promise.all(
    requests.map(async (r) => {
      const patient = await prisma.patient.findUnique({
        where: { id: r.patientId },
        select: { patientNo: true, firstName: true, lastName: true },
      });
      return { ...r, patient };
    })
  );
  enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  successResponse(res, enriched);
});

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

  const referrals = readFile<HieReferral>(REFERRALS_FILE);
  const referralNo = `HIE-REF-${new Date().getFullYear()}-${String(referrals.length + 1).padStart(4, '0')}`;

  const referral: HieReferral = {
    id: uuidv4(),
    referralNo,
    patientId,
    referringDoctor,
    receivingFacility,
    reason,
    urgency: urgency as HieReferral['urgency'],
    status: 'SENT',
    createdAt: new Date().toISOString(),
  };
  referrals.push(referral);
  writeFile(REFERRALS_FILE, referrals);

  addAudit(
    'REFERRAL_SENT',
    patientId,
    req.user?.username || 'system',
    'PIBS Hospital',
    `Referred to ${receivingFacility} by Dr. ${referringDoctor}. Urgency: ${urgency}`
  );

  // Generate FHIR bundle snapshot for referral
  const vitals = await prisma.vitalSigns.findMany({
    where: { patientId },
    take: 3,
    orderBy: { recordedAt: 'desc' },
  });
  const fhirBundle = buildFhirBundle(patient, vitals, []);

  successResponse(res, { referral, fhirBundle }, 'Referral sent', 201);
});

export const getReferrals = asyncHandler(async (req: Request, res: Response) => {
  const referrals = readFile<HieReferral>(REFERRALS_FILE);
  const enriched = await Promise.all(
    referrals.map(async (r) => {
      const patient = await prisma.patient.findUnique({
        where: { id: r.patientId },
        select: { patientNo: true, firstName: true, lastName: true },
      });
      return { ...r, patient };
    })
  );
  enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  successResponse(res, enriched);
});

function buildFhirBundle(patient: any, vitals: any[], consultations: any[]) {
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
          identifier: [{ system: 'https://pibs.hospital.ph/patients', value: patient.patientNo }],
          name: [
            {
              family: patient.lastName,
              given: [patient.firstName, patient.middleName].filter(Boolean),
            },
          ],
          gender: patient.gender?.toLowerCase(),
          birthDate: patient.dateOfBirth
            ? new Date(patient.dateOfBirth).toISOString().split('T')[0]
            : undefined,
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
            v.bloodPressureSystolic && {
              code: { text: 'Systolic BP' },
              valueQuantity: { value: v.bloodPressureSystolic, unit: 'mmHg' },
            },
            v.bloodPressureDiastolic && {
              code: { text: 'Diastolic BP' },
              valueQuantity: { value: v.bloodPressureDiastolic, unit: 'mmHg' },
            },
            v.heartRate && {
              code: { text: 'Heart Rate' },
              valueQuantity: { value: v.heartRate, unit: '/min' },
            },
            v.temperature && {
              code: { text: 'Temperature' },
              valueQuantity: { value: v.temperature, unit: '°C' },
            },
          ].filter(Boolean),
        },
      })),
    ],
  };
}

export const getFhirBundle = asyncHandler(async (req: Request, res: Response) => {
  const { patientId } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const vitals = await prisma.vitalSigns.findMany({
    where: { patientId },
    take: 5,
    orderBy: { recordedAt: 'desc' },
  });

  const consultations = await prisma.consultation.findMany({
    where: { patientId },
    take: 5,
    orderBy: { scheduledAt: 'desc' },
  });

  const bundle = buildFhirBundle(patient, vitals, consultations);

  addAudit(
    'FHIR_BUNDLE_GENERATED',
    patientId,
    req.user?.username || 'system',
    'PIBS Hospital',
    `FHIR R4 bundle generated for patient ${patient.patientNo}`
  );

  successResponse(res, bundle);
});

export const getAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const log = readFile<AuditEntry>(AUDIT_FILE);
  log.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  successResponse(res, log);
});
