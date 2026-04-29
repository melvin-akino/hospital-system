import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

interface PatientPortalUser {
  patientId: string;
  role: 'PATIENT_PORTAL';
}

declare global {
  namespace Express {
    interface Request {
      patientPortalUser?: PatientPortalUser;
    }
  }
}

export const patientPortalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as PatientPortalUser;
    if (decoded.role !== 'PATIENT_PORTAL') {
      res.status(401).json({ success: false, message: 'Invalid portal token' });
      return;
    }
    req.patientPortalUser = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { patientNo, dateOfBirth } = req.body;
  if (!patientNo || !dateOfBirth) {
    errorResponse(res, 'patientNo and dateOfBirth are required', 400);
    return;
  }

  const patient = await prisma.patient.findFirst({ where: { patientNo } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 401);
    return;
  }

  // Use dateOfBirth as the password — compare date only (YYYY-MM-DD)
  const inputDob = new Date(dateOfBirth).toISOString().split('T')[0];
  const storedDob = new Date(patient.dateOfBirth).toISOString().split('T')[0];

  if (inputDob !== storedDob) {
    errorResponse(res, 'Invalid credentials', 401);
    return;
  }

  const token = jwt.sign({ patientId: patient.id, role: 'PATIENT_PORTAL' }, JWT_SECRET, {
    expiresIn: '7d',
  });

  successResponse(res, {
    token,
    patient: {
      id: patient.id,
      patientNo: patient.patientNo,
      firstName: patient.firstName,
      lastName: patient.lastName,
      middleName: patient.middleName,
    },
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.patientPortalUser!.patientId;
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      patientNo: true,
      firstName: true,
      lastName: true,
      middleName: true,
      gender: true,
      dateOfBirth: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      province: true,
      philhealthNo: true,
      isSenior: true,
      isPwd: true,
    },
  });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }
  successResponse(res, patient);
});

export const getMedicalRecords = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.patientPortalUser!.patientId;
  const consultations = await prisma.consultation.findMany({
    where: { patientId },
    include: {
      doctor: { select: { firstName: true, lastName: true, specialization: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  });
  successResponse(res, consultations);
});

export const getLabResults = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.patientPortalUser!.patientId;
  const results = await prisma.labResult.findMany({
    where: { requisition: { patientId } },
    include: {
      requisition: {
        select: { requisitionNo: true, testName: true, requestedAt: true },
      },
    },
    orderBy: { resultDate: 'desc' },
  });
  successResponse(res, results);
});

export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.patientPortalUser!.patientId;
  const appointments = await prisma.appointment.findMany({
    where: { patientId },
    include: {
      doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  });
  successResponse(res, appointments);
});

export const bookAppointment = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.patientPortalUser!.patientId;
  const { doctorId, scheduledAt, notes } = req.body;
  if (!scheduledAt) {
    errorResponse(res, 'scheduledAt is required', 400);
    return;
  }

  // Generate appointment number
  const count = await prisma.appointment.count();
  const appointmentNo = `APT-${String(count + 1).padStart(6, '0')}`;

  const appointment = await prisma.appointment.create({
    data: {
      appointmentNo,
      patientId,
      doctorId: doctorId || null,
      scheduledAt: new Date(scheduledAt),
      duration: 30,
      notes,
      status: 'SCHEDULED',
    },
  });
  successResponse(res, appointment, 'Appointment booked', 201);
});

export const getBills = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.patientPortalUser!.patientId;
  const bills = await prisma.bill.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
  });
  successResponse(res, bills);
});

export const getVitalSigns = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.patientPortalUser!.patientId;
  const vitals = await prisma.vitalSigns.findMany({
    where: { patientId },
    orderBy: { recordedAt: 'desc' },
    take: 20,
  });
  successResponse(res, vitals);
});

// Public — no auth needed (patient needs doctor list to book appointments)
export const getPortalDoctors = asyncHandler(async (req: Request, res: Response) => {
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      subspecialty: true,
      department: { select: { name: true } },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  successResponse(res, doctors);
});

export const getPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.patientPortalUser!.patientId;
  const prescriptions = await prisma.prescription.findMany({
    where: { patientId },
    include: {
      items: {
        select: {
          drugName: true, dosage: true, frequency: true,
          duration: true, quantity: true, instructions: true,
        },
      },
    },
    orderBy: { prescribedAt: 'desc' },
  });
  successResponse(res, prescriptions);
});
