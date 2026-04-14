import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

const ICD10_CODES = [
  { code: 'J00', description: 'Acute nasopharyngitis (common cold)' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism' },
  { code: 'J45.909', description: 'Unspecified asthma, uncomplicated' },
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' },
  { code: 'I50.9', description: 'Heart failure, unspecified' },
  { code: 'I63.9', description: 'Cerebral infarction, unspecified' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications' },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia' },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
  { code: 'E03.9', description: 'Hypothyroidism, unspecified' },
  { code: 'E05.90', description: 'Thyrotoxicosis, unspecified, without thyrotoxic crisis' },
  { code: 'N18.3', description: 'Chronic kidney disease, stage 3' },
  { code: 'N18.6', description: 'End stage renal disease' },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified' },
  { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis' },
  { code: 'K57.30', description: 'Diverticulosis of large intestine without perforation' },
  { code: 'K92.1', description: 'Melena' },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis, unspecified' },
  { code: 'A90', description: 'Dengue fever (classical dengue)' },
  { code: 'A91', description: 'Dengue hemorrhagic fever' },
  { code: 'B15.9', description: 'Hepatitis A without hepatic coma' },
  { code: 'B16.9', description: 'Acute hepatitis B without delta-agent and without hepatic coma' },
  { code: 'B50.9', description: 'Plasmodium falciparum malaria, unspecified' },
  { code: 'B34.9', description: 'Viral infection, unspecified' },
  { code: 'C34.90', description: 'Malignant neoplasm of unspecified part of unspecified bronchus and lung' },
  { code: 'C50.919', description: 'Malignant neoplasm of unspecified site of unspecified female breast' },
  { code: 'C18.9', description: 'Malignant neoplasm of colon, unspecified' },
  { code: 'M54.5', description: 'Low back pain' },
  { code: 'M79.3', description: 'Panniculitis, unspecified' },
  { code: 'G43.909', description: 'Migraine, unspecified, not intractable, without status migrainosus' },
  { code: 'G40.909', description: 'Epilepsy, unspecified, not intractable' },
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
  { code: 'F41.1', description: 'Generalized anxiety disorder' },
  { code: 'Z87.891', description: 'Personal history of other specified conditions' },
  { code: 'Z79.899', description: 'Other long term (current) drug therapy' },
  { code: 'S00.01XA', description: 'Unspecified superficial injury of scalp, initial encounter' },
  { code: 'S09.90XA', description: 'Unspecified injury of head, initial encounter' },
  { code: 'T14.90', description: 'Injury, unspecified' },
  { code: 'O80', description: 'Encounter for full-term uncomplicated delivery' },
  { code: 'O34.21', description: 'Maternal care for scar from previous cesarean delivery' },
  { code: 'O10.012', description: 'Pre-existing essential hypertension complicating pregnancy' },
  { code: 'J44.1', description: 'Chronic obstructive pulmonary disease with (acute) exacerbation' },
  { code: 'L29.9', description: 'Pruritus, unspecified' },
  { code: 'H52.4', description: 'Presbyopia' },
  { code: 'H26.9', description: 'Unspecified cataract' },
  { code: 'R05', description: 'Cough' },
  { code: 'R50.9', description: 'Fever, unspecified' },
];

export const getEMR = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 20 },
      allergies: { where: { isActive: true } },
      medications: { orderBy: { createdAt: 'desc' } },
      labResults: { orderBy: { createdAt: 'desc' }, take: 20 },
      consultations: {
        orderBy: { scheduledAt: 'desc' },
        take: 20,
        include: {
          doctor: { select: { firstName: true, lastName: true, specialty: true } },
        },
      },
      hmoRegistrations: {
        where: { isActive: true },
        include: { hmoCompany: true },
      },
    },
  });

  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  successResponse(res, patient);
});

export const getVitalSigns = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, limit, skip } = getPagination(req);

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const [vitals, total] = await Promise.all([
    prisma.vitalSign.findMany({
      where: { patientId: id },
      orderBy: { recordedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.vitalSign.count({ where: { patientId: id } }),
  ]);

  paginatedResponse(res, vitals, total, page, limit);
});

export const addVitalSigns = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const { weight, height, temperature, bloodPressureSystolic, bloodPressureDiastolic, ...rest } = req.body;

  let bmi: number | undefined;
  if (weight && height) {
    const heightM = parseFloat(height) / 100;
    bmi = parseFloat(weight) / (heightM * heightM);
  }

  const vital = await prisma.vitalSign.create({
    data: {
      patientId: id,
      ...rest,
      ...(temperature !== undefined && { temperature: parseFloat(temperature) }),
      ...(bloodPressureSystolic !== undefined && { bloodPressureSystolic: parseInt(bloodPressureSystolic) }),
      ...(bloodPressureDiastolic !== undefined && { bloodPressureDiastolic: parseInt(bloodPressureDiastolic) }),
      ...(weight !== undefined && { weight: parseFloat(weight) }),
      ...(height !== undefined && { height: parseFloat(height) }),
      ...(bmi !== undefined && { bmi: Math.round(bmi * 10) / 10 }),
    },
  });

  successResponse(res, vital, 'Vital signs recorded', 201);
});

export const getAllergies = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const allergies = await prisma.allergy.findMany({
    where: { patientId: id },
    orderBy: { createdAt: 'desc' },
  });

  successResponse(res, allergies);
});

export const addAllergy = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const allergy = await prisma.allergy.create({
    data: {
      patientId: id,
      ...req.body,
    },
  });

  successResponse(res, allergy, 'Allergy added', 201);
});

export const updateAllergy = asyncHandler(async (req: Request, res: Response) => {
  const { id, allergyId } = req.params;

  const allergy = await prisma.allergy.findFirst({
    where: { id: allergyId, patientId: id },
  });

  if (!allergy) {
    errorResponse(res, 'Allergy not found', 404);
    return;
  }

  const updated = await prisma.allergy.update({
    where: { id: allergyId },
    data: req.body,
  });

  successResponse(res, updated, 'Allergy updated');
});

export const getMedications = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const medications = await prisma.medicationHistory.findMany({
    where: { patientId: id },
    include: {
      medication: { select: { genericName: true, brandName: true, dosageForm: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  successResponse(res, medications);
});

export const addMedication = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const medication = await prisma.medicationHistory.create({
    data: {
      patientId: id,
      ...req.body,
      ...(req.body.startDate && { startDate: new Date(req.body.startDate) }),
      ...(req.body.endDate && { endDate: new Date(req.body.endDate) }),
    },
  });

  successResponse(res, medication, 'Medication added', 201);
});

export const searchIcd10 = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || (q as string).length < 2) {
    successResponse(res, []);
    return;
  }

  const query = (q as string).toLowerCase();
  const results = ICD10_CODES.filter(
    (c) =>
      c.code.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
  ).slice(0, 20);

  successResponse(res, results);
});
