import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { generateSurgeryNo } from '../../utils/generateNo';

const WHO_CHECKLIST = {
  signIn: [
    { id: 1, phase: 'SIGN_IN', item: 'Patient has confirmed identity, site, procedure, and consent' },
    { id: 2, phase: 'SIGN_IN', item: 'Anaesthesia machine and medication check complete' },
    { id: 3, phase: 'SIGN_IN', item: 'Pulse oximeter on patient and functioning' },
    { id: 4, phase: 'SIGN_IN', item: 'Known allergy? If yes, confirmed' },
    { id: 5, phase: 'SIGN_IN', item: 'Difficult airway/aspiration risk? Equipment available' },
    { id: 6, phase: 'SIGN_IN', item: 'Risk of blood loss > 500ml? Two IVs/central access and fluids planned' },
  ],
  timeOut: [
    { id: 7, phase: 'TIME_OUT', item: 'Confirm all team members introduced by name and role' },
    { id: 8, phase: 'TIME_OUT', item: 'Surgeon, anaesthesia professional, and nurse verbally confirm patient, site, and procedure' },
    { id: 9, phase: 'TIME_OUT', item: 'Anticipated critical events reviewed' },
    { id: 10, phase: 'TIME_OUT', item: 'Has antibiotic prophylaxis been given within 60 minutes?' },
    { id: 11, phase: 'TIME_OUT', item: 'Is essential imaging displayed?' },
  ],
  signOut: [
    { id: 12, phase: 'SIGN_OUT', item: 'Nurse verbally confirms name of the procedure recorded' },
    { id: 13, phase: 'SIGN_OUT', item: 'Instrument, sponge, and needle counts correct' },
    { id: 14, phase: 'SIGN_OUT', item: 'Specimen labelled correctly' },
    { id: 15, phase: 'SIGN_OUT', item: 'Any equipment problems to be addressed' },
    { id: 16, phase: 'SIGN_OUT', item: 'Surgeon, anaesthesia professional, and nurse review key recovery concerns' },
  ],
};

const surgeryInclude = {
  surgeon: { select: { id: true, firstName: true, lastName: true, specialty: true, phone: true } },
  patient: { select: { id: true, patientNo: true, firstName: true, lastName: true, bloodType: true, gender: true } },
  admission: { select: { id: true, admissionNo: true, room: { include: { roomType: true } } } },
};

// GET /api/surgeries
export const getSurgeries = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status, from, to, surgeonId, search, today } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (surgeonId) where['surgeonId'] = surgeonId;

  if (today === 'true') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    where['scheduledAt'] = { gte: start, lte: end };
  } else if (from || to) {
    where['scheduledAt'] = {
      ...(from && { gte: new Date(from as string) }),
      ...(to && { lte: new Date(to as string) }),
    };
  }

  if (search) {
    where['OR'] = [
      { surgeryNo: { contains: search as string, mode: 'insensitive' } },
      { procedure: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [surgeries, total] = await Promise.all([
    prisma.surgery.findMany({ where, skip, take: limit, orderBy: { scheduledAt: 'asc' }, include: surgeryInclude }),
    prisma.surgery.count({ where }),
  ]);

  paginatedResponse(res, surgeries, total, page, limit);
});

// GET /api/surgeries/:id
export const getSurgery = asyncHandler(async (req: Request, res: Response) => {
  const surgery = await prisma.surgery.findUnique({
    where: { id: req.params['id'] },
    include: surgeryInclude,
  });
  if (!surgery) { errorResponse(res, 'Surgery not found', 404); return; }
  successResponse(res, surgery);
});

// POST /api/surgeries
export const scheduleSurgery = asyncHandler(async (req: Request, res: Response) => {
  const {
    patientId, admissionId, surgeonId, procedure, scheduledAt, duration, orRoom, notes,
    anesthesiaType, anesthesiologist, scrubNurse, circulatingNurse, preOpNotes,
  } = req.body;

  if (patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) { errorResponse(res, 'Patient not found', 404); return; }
  }
  if (surgeonId) {
    const surgeon = await prisma.doctor.findUnique({ where: { id: surgeonId } });
    if (!surgeon) { errorResponse(res, 'Surgeon not found', 404); return; }
  }

  const surgeryNo = await generateSurgeryNo();
  const surgery = await prisma.surgery.create({
    data: {
      surgeryNo, patientId, admissionId, surgeonId, procedure,
      scheduledAt: new Date(scheduledAt), duration, orRoom, notes,
      anesthesiaType, anesthesiologist, scrubNurse, circulatingNurse, preOpNotes,
      status: 'SCHEDULED',
    },
    include: surgeryInclude,
  });
  successResponse(res, surgery, 'Surgery scheduled', 201);
});

// PUT /api/surgeries/:id
export const updateSurgery = asyncHandler(async (req: Request, res: Response) => {
  const surgery = await prisma.surgery.findUnique({ where: { id: req.params['id'] } });
  if (!surgery) { errorResponse(res, 'Surgery not found', 404); return; }
  if (surgery.status === 'CANCELLED') { errorResponse(res, 'Cannot update a cancelled surgery', 400); return; }

  // Auto-set timestamps for status transitions
  const data: any = { ...req.body };
  if (req.body.status === 'IN_PROGRESS' && !surgery.startedAt) data.startedAt = new Date();
  if (req.body.status === 'COMPLETED' && !surgery.completedAt) {
    data.completedAt = new Date();
    if (surgery.startedAt) data.actualDuration = Math.round((Date.now() - new Date(surgery.startedAt).getTime()) / 60000);
  }

  const updated = await prisma.surgery.update({ where: { id: req.params['id'] }, data, include: surgeryInclude });
  successResponse(res, updated, 'Surgery updated');
});

// PUT /api/surgeries/:id/cancel
export const cancelSurgery = asyncHandler(async (req: Request, res: Response) => {
  const surgery = await prisma.surgery.findUnique({ where: { id: req.params['id'] } });
  if (!surgery) {
    errorResponse(res, 'Surgery not found', 404);
    return;
  }

  if (surgery.status === 'COMPLETED') {
    errorResponse(res, 'Cannot cancel a completed surgery', 400);
    return;
  }

  const updated = await prisma.surgery.update({
    where: { id: req.params['id'] },
    data: { status: 'CANCELLED' },
  });

  successResponse(res, updated, 'Surgery cancelled');
});

// GET /api/surgeries/:id/checklist
export const getChecklist = asyncHandler(async (req: Request, res: Response) => {
  const surgery = await prisma.surgery.findUnique({
    where: { id: req.params['id'] },
    include: {
      surgeon: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!surgery) {
    errorResponse(res, 'Surgery not found', 404);
    return;
  }

  let patient = null;
  if (surgery.patientId) {
    patient = await prisma.patient.findUnique({
      where: { id: surgery.patientId },
      select: { id: true, firstName: true, lastName: true, patientNo: true },
    });
  }

  successResponse(res, {
    surgery: { ...surgery, patient },
    checklist: WHO_CHECKLIST,
  });
});

// GET /api/or-availability
export const getORAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date as string) : new Date();

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const orRooms = ['OR-1', 'OR-2', 'OR-3', 'OR-4'];

  const surgeries = await prisma.surgery.findMany({
    where: {
      scheduledAt: { gte: startOfDay, lte: endOfDay },
      status: { not: 'CANCELLED' },
    },
    include: {
      surgeon: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const availability = orRooms.map((room) => {
    const roomSurgeries = surgeries.filter(s => s.orRoom === room);
    return {
      room,
      surgeries: roomSurgeries,
      isBusy: roomSurgeries.some(s => s.status === 'IN_PROGRESS'),
    };
  });

  successResponse(res, availability);
});
