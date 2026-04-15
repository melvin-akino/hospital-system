import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

function generateSessionNo(count: number): string {
  const year = new Date().getFullYear();
  return `TEL-${year}-${String(count + 1).padStart(6, '0')}`;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function enrichSession(session: any) {
  const [patient, doctor] = await Promise.all([
    prisma.patient.findUnique({ where: { id: session.patientId }, select: { id: true, patientNo: true, firstName: true, lastName: true, phone: true } }).catch(() => null),
    prisma.doctor.findUnique({ where: { id: session.doctorId }, select: { id: true, doctorNo: true, firstName: true, lastName: true, specialty: true } }).catch(() => null),
  ]);
  return { ...session, patient, doctor };
}

// GET /api/telemedicine-sessions
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const { status, doctorId, patientId, roomCode } = req.query;

  const where: any = {};
  if (status) where.status = status;
  if (doctorId) where.doctorId = doctorId;
  if (patientId) where.patientId = patientId;
  if (roomCode) where.roomCode = roomCode;

  const sessions = await prisma.telemedicineSession.findMany({ where, orderBy: { scheduledAt: 'desc' } });
  const enriched = await Promise.all(sessions.map(enrichSession));
  successResponse(res, enriched);
});

// GET /api/telemedicine-sessions/stats
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const [scheduled, inProgress, completed, cancelled, today, totalMinutesData] = await Promise.all([
    prisma.telemedicineSession.count({ where: { status: 'SCHEDULED' } }),
    prisma.telemedicineSession.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.telemedicineSession.count({ where: { status: 'COMPLETED' } }),
    prisma.telemedicineSession.count({ where: { status: 'CANCELLED' } }),
    prisma.telemedicineSession.count({ where: { scheduledAt: { gte: todayStart, lt: todayEnd } } }),
    prisma.telemedicineSession.aggregate({ where: { duration: { not: null } }, _sum: { duration: true } }),
  ]);

  successResponse(res, {
    scheduled, inProgress, completed, cancelled, today,
    totalMinutes: totalMinutesData._sum.duration ?? 0,
    total: scheduled + inProgress + completed + cancelled,
  });
});

// GET /api/telemedicine-sessions/:id
export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await prisma.telemedicineSession.findUnique({ where: { id: req.params['id'] } });
  if (!session) {
    errorResponse(res, 'Session not found', 404);
    return;
  }
  successResponse(res, await enrichSession(session));
});

// POST /api/telemedicine-sessions
export const bookSession = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, doctorId, scheduledAt, notes } = req.body;

  if (!patientId || !doctorId || !scheduledAt) {
    errorResponse(res, 'patientId, doctorId, and scheduledAt are required', 400);
    return;
  }

  const [patient, doctor] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.doctor.findUnique({ where: { id: doctorId } }),
  ]);

  if (!patient) { errorResponse(res, 'Patient not found', 404); return; }
  if (!doctor) { errorResponse(res, 'Doctor not found', 404); return; }

  const count = await prisma.telemedicineSession.count();
  const sessionNo = generateSessionNo(count);

  // Keep trying until roomCode is unique
  let roomCode = generateRoomCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.telemedicineSession.findUnique({ where: { roomCode } });
    if (!existing) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  const session = await prisma.telemedicineSession.create({
    data: { sessionNo, patientId, doctorId, scheduledAt: new Date(scheduledAt), status: 'SCHEDULED', roomCode, notes: notes ?? '' },
  });

  successResponse(res, await enrichSession(session), 'Telemedicine session booked', 201);
});

// PUT /api/telemedicine-sessions/:id
export const updateSession = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.telemedicineSession.findUnique({ where: { id: req.params['id'] } });
  if (!existing) {
    errorResponse(res, 'Session not found', 404);
    return;
  }

  const { scheduledAt, notes } = req.body;
  const session = await prisma.telemedicineSession.update({
    where: { id: req.params['id'] },
    data: { ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }), ...(notes !== undefined && { notes }) },
  });

  successResponse(res, await enrichSession(session), 'Session updated');
});

// PUT /api/telemedicine-sessions/:id/start
export const startSession = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.telemedicineSession.findUnique({ where: { id: req.params['id'] } });
  if (!existing) { errorResponse(res, 'Session not found', 404); return; }
  if (existing.status === 'CANCELLED' || existing.status === 'COMPLETED') {
    errorResponse(res, 'Cannot start a cancelled or completed session', 400);
    return;
  }

  const session = await prisma.telemedicineSession.update({
    where: { id: req.params['id'] },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  successResponse(res, await enrichSession(session), 'Session started');
});

// PUT /api/telemedicine-sessions/:id/end
export const endSession = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.telemedicineSession.findUnique({ where: { id: req.params['id'] } });
  if (!existing) { errorResponse(res, 'Session not found', 404); return; }

  const { duration, notes, prescription } = req.body;
  const session = await prisma.telemedicineSession.update({
    where: { id: req.params['id'] },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(notes !== undefined && { notes }),
      ...(prescription !== undefined && { prescription }),
    },
  });

  successResponse(res, await enrichSession(session), 'Session ended');
});

// PUT /api/telemedicine-sessions/:id/cancel
export const cancelSession = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.telemedicineSession.findUnique({ where: { id: req.params['id'] } });
  if (!existing) { errorResponse(res, 'Session not found', 404); return; }
  if (existing.status === 'COMPLETED') { errorResponse(res, 'Cannot cancel a completed session', 400); return; }

  const session = await prisma.telemedicineSession.update({
    where: { id: req.params['id'] },
    data: { status: 'CANCELLED' },
  });

  successResponse(res, session, 'Session cancelled');
});
