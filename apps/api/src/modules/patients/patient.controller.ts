import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as XLSX from 'xlsx';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { generatePatientNo } from '../../utils/generateNo';

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const patientNo = await generatePatientNo();
  const patient = await prisma.patient.create({
    data: {
      ...req.body,
      patientNo,
      dateOfBirth: new Date(req.body.dateOfBirth),
    },
  });
  successResponse(res, patient, 'Patient created successfully', 201);
});

export const getPatients = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { search, gender, isSenior, isPwd } = req.query;

  const where: Record<string, unknown> = { isActive: true };

  if (search) {
    where['OR'] = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { patientNo: { contains: search as string, mode: 'insensitive' } },
      { phone: { contains: search as string, mode: 'insensitive' } },
      { philhealthNo: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  if (gender) where['gender'] = gender;
  if (isSenior === 'true') where['isSenior'] = true;
  if (isPwd === 'true') where['isPwd'] = true;

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        patientNo: true,
        firstName: true,
        middleName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        email: true,
        isSenior: true,
        isPwd: true,
        philhealthNo: true,
        createdAt: true,
      },
    }),
    prisma.patient.count({ where }),
  ]);

  paginatedResponse(res, patients, total, page, limit);
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params['id'] },
    include: {
      vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 5 },
      allergies: { where: { isActive: true } },
      medications: { where: { isActive: true } },
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

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.params['id'] } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const updated = await prisma.patient.update({
    where: { id: req.params['id'] },
    data: {
      ...req.body,
      ...(req.body.dateOfBirth && { dateOfBirth: new Date(req.body.dateOfBirth) }),
    },
  });

  successResponse(res, updated, 'Patient updated');
});

export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.params['id'] } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  await prisma.patient.update({
    where: { id: req.params['id'] },
    data: { isActive: false },
  });

  successResponse(res, null, 'Patient deactivated');
});

export const getPatientHistory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const [consultations, bills, admissions, labResults] = await Promise.all([
    prisma.consultation.findMany({
      where: { patientId: id },
      include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
    }),
    prisma.bill.findMany({
      where: { patientId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.admission.findMany({
      where: { patientId: id },
      include: { room: true },
      orderBy: { admittedAt: 'desc' },
      take: 5,
    }),
    prisma.labResult.findMany({
      where: { patientId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  successResponse(res, { consultations, bills, admissions, labResults });
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    errorResponse(res, 'No file uploaded', 400);
    return;
  }

  const patient = await prisma.patient.findUnique({ where: { id: req.params['id'] } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const doc = await prisma.patientDocument.create({
    data: {
      patientId: req.params['id'],
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      description: req.body.description,
    },
  });

  successResponse(res, doc, 'Document uploaded', 201);
});

export const searchPatients = asyncHandler(async (req: Request, res: Response) => {
  const { q, limit = '10' } = req.query;

  if (!q || (q as string).length < 2) {
    successResponse(res, []);
    return;
  }

  const patients = await prisma.patient.findMany({
    where: {
      isActive: true,
      OR: [
        { firstName: { contains: q as string, mode: 'insensitive' } },
        { lastName: { contains: q as string, mode: 'insensitive' } },
        { patientNo: { contains: q as string, mode: 'insensitive' } },
        { phone: { contains: q as string } },
      ],
    },
    select: {
      id: true,
      patientNo: true,
      firstName: true,
      middleName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      phone: true,
      isSenior: true,
      isPwd: true,
    },
    take: parseInt(limit as string),
    orderBy: { lastName: 'asc' },
  });

  successResponse(res, patients);
});

export const bulkImportPatients = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    errorResponse(res, 'No file uploaded', 400);
    return;
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    errorResponse(res, 'Empty workbook', 400);
    return;
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    errorResponse(res, 'Sheet not found', 400);
    return;
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const imported: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    try {
      const patientNo = await generatePatientNo();
      await prisma.patient.create({
        data: {
          patientNo,
          firstName: String(row['firstName'] || row['First Name'] || ''),
          lastName: String(row['lastName'] || row['Last Name'] || ''),
          middleName: row['middleName']
            ? String(row['middleName'])
            : undefined,
          dateOfBirth: new Date(String(row['dateOfBirth'] || row['Date of Birth'] || new Date())),
          gender: (String(row['gender'] || row['Gender'] || 'OTHER').toUpperCase()) as 'MALE' | 'FEMALE' | 'OTHER',
          phone: row['phone'] ? String(row['phone']) : undefined,
          email: row['email'] ? String(row['email']) : undefined,
        },
      });
      imported.push(`Row ${i + 2}`);
    } catch (err) {
      errors.push(`Row ${i + 2}: ${(err as Error).message}`);
    }
  }

  successResponse(res, { imported: imported.length, errors }, 'Import completed');
});
