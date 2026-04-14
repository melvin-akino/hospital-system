import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

// ============ NOTIFIABLE DISEASES ============
const NOTIFIABLE_DISEASES = [
  { icdCode: 'A90', disease: 'Dengue Fever' },
  { icdCode: 'A91', disease: 'Dengue Hemorrhagic Fever' },
  { icdCode: 'A01', disease: 'Typhoid Fever' },
  { icdCode: 'A00', disease: 'Cholera' },
  { icdCode: 'A15', disease: 'Tuberculosis (Respiratory)' },
  { icdCode: 'B54', disease: 'Malaria' },
  { icdCode: 'A82', disease: 'Rabies' },
  { icdCode: 'B50', disease: 'Malaria due to P. falciparum' },
  { icdCode: 'J09', disease: 'Influenza (novel virus)' },
  { icdCode: 'A97', disease: 'Dengue (unspecified)' },
  { icdCode: 'B16', disease: 'Acute Hepatitis B' },
  { icdCode: 'A27', disease: 'Leptospirosis' },
];

// ============ JSON FILE HELPERS ============
const DATA_DIR = path.join(__dirname, '../../../../data');
const DOH_LOGS_FILE = path.join(DATA_DIR, 'doh-logs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readDohLogs(): DohSubmissionLog[] {
  ensureDataDir();
  if (!fs.existsSync(DOH_LOGS_FILE)) {
    fs.writeFileSync(DOH_LOGS_FILE, '[]', 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(DOH_LOGS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeDohLogs(logs: DohSubmissionLog[]) {
  ensureDataDir();
  fs.writeFileSync(DOH_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

interface DohSubmissionLog {
  id: string;
  reportType: string;
  period: string;
  notes?: string;
  submittedAt: string;
}

// ============ AGE GROUP HELPER ============
function getAgeGroup(dateOfBirth: Date): string {
  const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
  if (age < 1) return '<1 year';
  if (age <= 4) return '1-4 years';
  if (age <= 9) return '5-9 years';
  if (age <= 14) return '10-14 years';
  if (age <= 19) return '15-19 years';
  if (age <= 29) return '20-29 years';
  if (age <= 39) return '30-39 years';
  if (age <= 49) return '40-49 years';
  if (age <= 59) return '50-59 years';
  return '60+ years';
}

const AGE_GROUPS = [
  '<1 year',
  '1-4 years',
  '5-9 years',
  '10-14 years',
  '15-19 years',
  '20-29 years',
  '30-39 years',
  '40-49 years',
  '50-59 years',
  '60+ years',
];

// GET /api/doh/fhsis-report?month=&year=
export const generateFHSIS = asyncHandler(async (req: Request, res: Response) => {
  const month = parseInt(req.query['month'] as string) || new Date().getMonth() + 1;
  const year = parseInt(req.query['year'] as string) || new Date().getFullYear();

  if (month < 1 || month > 12) {
    errorResponse(res, 'Month must be between 1 and 12', 400);
    return;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get consultations in period
  const consultations = await prisma.consultation.findMany({
    where: {
      scheduledAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
    include: {
      patient: {
        select: { id: true, dateOfBirth: true, gender: true },
      },
    },
  });

  // Get admissions in period
  const admissions = await prisma.admission.findMany({
    where: {
      admittedAt: { gte: startDate, lte: endDate },
    },
    select: { id: true, diagnosis: true },
  });

  // OPD stats
  const patientsSeen = new Set<string>();
  const ageGroupStats: Record<string, { male: number; female: number }> = {};
  AGE_GROUPS.forEach((g) => { ageGroupStats[g] = { male: 0, female: 0 }; });

  let newCases = 0;
  let oldCases = 0;

  for (const c of consultations) {
    const isNew = !patientsSeen.has(c.patient.id);
    patientsSeen.add(c.patient.id);
    if (isNew) newCases++;
    else oldCases++;

    const group = getAgeGroup(c.patient.dateOfBirth);
    if (!ageGroupStats[group]) ageGroupStats[group] = { male: 0, female: 0 };
    if (c.patient.gender === 'MALE') ageGroupStats[group].male++;
    else ageGroupStats[group].female++;
  }

  const byAgeGroup = AGE_GROUPS.map((group) => ({
    group,
    male: ageGroupStats[group]?.male ?? 0,
    female: ageGroupStats[group]?.female ?? 0,
    total: (ageGroupStats[group]?.male ?? 0) + (ageGroupStats[group]?.female ?? 0),
  }));

  // Admissions by diagnosis (using raw diagnosis field)
  const diagnosisMap: Record<string, number> = {};
  for (const a of admissions) {
    if (a.diagnosis) {
      const key = a.diagnosis;
      diagnosisMap[key] = (diagnosisMap[key] ?? 0) + 1;
    }
  }
  const byDiagnosis = Object.entries(diagnosisMap)
    .map(([description, count]) => ({ icdCode: 'N/A', description, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  successResponse(res, {
    reportingPeriod: { month, year },
    opd: {
      totalVisits: consultations.length,
      newCases,
      oldCases,
      byAgeGroup,
    },
    admissions: {
      total: admissions.length,
      byDiagnosis,
    },
    deaths: 0,
    reportGeneratedAt: new Date().toISOString(),
  });
});

// GET /api/doh/pidsr-report?dateFrom=&dateTo=
export const generatePIDSR = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;

  const startDate = dateFrom ? new Date(dateFrom as string) : (() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  })();
  const endDate = dateTo ? new Date(dateTo as string) : new Date();

  // Get consultations with ICD codes in the period
  const consultations = await prisma.consultation.findMany({
    where: {
      scheduledAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    },
    select: { id: true, icdCodes: true, scheduledAt: true },
  });

  // Map ICD codes to notifiable diseases
  const diseaseMap: Record<string, { cases: number; casesByWeek: Record<number, number> }> = {};

  for (const c of consultations) {
    for (const icd of c.icdCodes) {
      const disease = NOTIFIABLE_DISEASES.find((d) => icd.startsWith(d.icdCode));
      if (disease) {
        if (!diseaseMap[disease.icdCode]) {
          diseaseMap[disease.icdCode] = { cases: 0, casesByWeek: {} };
        }
        diseaseMap[disease.icdCode].cases++;

        // Week number within period
        const weekNo = Math.ceil(
          (c.scheduledAt.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        ) + 1;
        diseaseMap[disease.icdCode].casesByWeek[weekNo] =
          (diseaseMap[disease.icdCode].casesByWeek[weekNo] ?? 0) + 1;
      }
    }
  }

  const result = NOTIFIABLE_DISEASES.map((nd) => {
    const stats = diseaseMap[nd.icdCode];
    const casesByWeek = stats
      ? Object.entries(stats.casesByWeek).map(([week, count]) => ({ week: Number(week), count }))
      : [];
    const thisWeekNo = Math.ceil(
      (new Date().getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const thisWeek = casesByWeek.find((w) => w.week === thisWeekNo)?.count ?? 0;
    return {
      disease: nd.disease,
      icdCode: nd.icdCode,
      cases: stats?.cases ?? 0,
      deaths: 0,
      thisWeek,
      casesByWeek,
    };
  }).filter((d) => d.cases > 0 || true); // include all for reference

  successResponse(res, {
    dateFrom: startDate.toISOString().split('T')[0],
    dateTo: endDate.toISOString().split('T')[0],
    diseases: result,
    reportGeneratedAt: new Date().toISOString(),
  });
});

// GET /api/doh/disease-cases?icdCode=&dateFrom=&dateTo=
export const getDiseaseCases = asyncHandler(async (req: Request, res: Response) => {
  const { icdCode, dateFrom, dateTo } = req.query;

  if (!icdCode) {
    errorResponse(res, 'icdCode is required', 400);
    return;
  }

  const startDate = dateFrom ? new Date(dateFrom as string) : (() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  })();
  const endDate = dateTo ? new Date(dateTo as string) : new Date();

  const consultations = await prisma.consultation.findMany({
    where: {
      scheduledAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
      icdCodes: { has: icdCode as string },
    },
    include: {
      patient: {
        select: {
          id: true,
          patientNo: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
        },
      },
      doctor: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { scheduledAt: 'desc' },
    take: 200,
  });

  const disease = NOTIFIABLE_DISEASES.find((d) => (icdCode as string).startsWith(d.icdCode));

  successResponse(res, {
    icdCode,
    disease: disease?.disease ?? 'Unknown Disease',
    dateFrom: startDate.toISOString().split('T')[0],
    dateTo: endDate.toISOString().split('T')[0],
    total: consultations.length,
    cases: consultations.map((c) => ({
      consultationId: c.id,
      consultationNo: c.consultationNo,
      scheduledAt: c.scheduledAt,
      patient: c.patient,
      doctor: `${c.doctor.lastName}, ${c.doctor.firstName}`,
      icdCodes: c.icdCodes,
    })),
  });
});

// POST /api/doh/fhsis-submission-log
export const logSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { reportType, period, notes } = req.body;

  if (!reportType || !period) {
    errorResponse(res, 'reportType and period are required', 400);
    return;
  }

  const log: DohSubmissionLog = {
    id: `DOH-${Date.now()}`,
    reportType,
    period,
    notes: notes || undefined,
    submittedAt: new Date().toISOString(),
  };

  const logs = readDohLogs();
  logs.unshift(log);
  writeDohLogs(logs);

  successResponse(res, log, 'Submission logged', 201);
});

// GET /api/doh/submission-history
export const getSubmissionHistory = asyncHandler(async (_req: Request, res: Response) => {
  const logs = readDohLogs();
  successResponse(res, logs);
});
