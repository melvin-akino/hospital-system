import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

// ============ JSON FILE HELPERS ============
const DATA_DIR = path.join(__dirname, '../../../../data');
const SESSIONS_FILE = path.join(DATA_DIR, 'telemedicine-sessions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface TelemedicineSession {
  id: string;
  sessionNo: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  roomCode: string;
  notes: string;
  prescription: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  createdAt: string;
}

function readSessions(): TelemedicineSession[] {
  ensureDataDir();
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, '[]', 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeSessions(sessions: TelemedicineSession[]) {
  ensureDataDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

function generateSessionNo(sessions: TelemedicineSession[]): string {
  const year = new Date().getFullYear();
  const maxNo = sessions
    .filter((s) => s.sessionNo.startsWith(`TEL-${year}-`))
    .map((s) => parseInt(s.sessionNo.split('-')[2] ?? '0', 10))
    .reduce((a, b) => Math.max(a, b), 0);
  return `TEL-${year}-${String(maxNo + 1).padStart(6, '0')}`;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Enrich session with patient/doctor info
async function enrichSession(session: TelemedicineSession) {
  const [patient, doctor] = await Promise.all([
    prisma.patient
      .findUnique({
        where: { id: session.patientId },
        select: { id: true, patientNo: true, firstName: true, lastName: true, phone: true },
      })
      .catch(() => null),
    prisma.doctor
      .findUnique({
        where: { id: session.doctorId },
        select: { id: true, doctorNo: true, firstName: true, lastName: true, specialty: true },
      })
      .catch(() => null),
  ]);
  return { ...session, patient, doctor };
}

// GET /api/telemedicine-sessions
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const { status, doctorId, patientId, roomCode } = req.query;
  let sessions = readSessions();

  if (status) sessions = sessions.filter((s) => s.status === status);
  if (doctorId) sessions = sessions.filter((s) => s.doctorId === doctorId);
  if (patientId) sessions = sessions.filter((s) => s.patientId === patientId);
  if (roomCode) sessions = sessions.filter((s) => s.roomCode === roomCode);

  sessions.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const enriched = await Promise.all(sessions.map(enrichSession));
  successResponse(res, enriched);
});

// GET /api/telemedicine-sessions/stats
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const sessions = readSessions();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const stats = {
    scheduled: sessions.filter((s) => s.status === 'SCHEDULED').length,
    inProgress: sessions.filter((s) => s.status === 'IN_PROGRESS').length,
    completed: sessions.filter((s) => s.status === 'COMPLETED').length,
    cancelled: sessions.filter((s) => s.status === 'CANCELLED').length,
    today: sessions.filter((s) => {
      const d = new Date(s.scheduledAt);
      return d >= todayStart && d < todayEnd;
    }).length,
    totalMinutes: sessions
      .filter((s) => s.duration !== null)
      .reduce((sum, s) => sum + (s.duration ?? 0), 0),
    total: sessions.length,
  };

  successResponse(res, stats);
});

// GET /api/telemedicine-sessions/:id
export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const sessions = readSessions();
  const session = sessions.find((s) => s.id === req.params['id']);
  if (!session) {
    errorResponse(res, 'Session not found', 404);
    return;
  }
  const enriched = await enrichSession(session);
  successResponse(res, enriched);
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

  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }
  if (!doctor) {
    errorResponse(res, 'Doctor not found', 404);
    return;
  }

  const sessions = readSessions();
  const newSession: TelemedicineSession = {
    id: uuidv4(),
    sessionNo: generateSessionNo(sessions),
    patientId,
    doctorId,
    scheduledAt: new Date(scheduledAt).toISOString(),
    status: 'SCHEDULED',
    roomCode: generateRoomCode(),
    notes: notes ?? '',
    prescription: '',
    startedAt: null,
    endedAt: null,
    duration: null,
    createdAt: new Date().toISOString(),
  };

  sessions.push(newSession);
  writeSessions(sessions);

  const enriched = await enrichSession(newSession);
  successResponse(res, enriched, 'Telemedicine session booked', 201);
});

// PUT /api/telemedicine-sessions/:id
export const updateSession = asyncHandler(async (req: Request, res: Response) => {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === req.params['id']);
  if (idx === -1) {
    errorResponse(res, 'Session not found', 404);
    return;
  }

  const { scheduledAt, notes } = req.body;
  if (scheduledAt) sessions[idx]!.scheduledAt = new Date(scheduledAt).toISOString();
  if (notes !== undefined) sessions[idx]!.notes = notes;

  writeSessions(sessions);
  const enriched = await enrichSession(sessions[idx]!);
  successResponse(res, enriched, 'Session updated');
});

// PUT /api/telemedicine-sessions/:id/start
export const startSession = asyncHandler(async (req: Request, res: Response) => {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === req.params['id']);
  if (idx === -1) {
    errorResponse(res, 'Session not found', 404);
    return;
  }

  if (sessions[idx]!.status === 'CANCELLED' || sessions[idx]!.status === 'COMPLETED') {
    errorResponse(res, 'Cannot start a cancelled or completed session', 400);
    return;
  }

  sessions[idx]!.status = 'IN_PROGRESS';
  sessions[idx]!.startedAt = new Date().toISOString();
  writeSessions(sessions);

  const enriched = await enrichSession(sessions[idx]!);
  successResponse(res, enriched, 'Session started');
});

// PUT /api/telemedicine-sessions/:id/end
export const endSession = asyncHandler(async (req: Request, res: Response) => {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === req.params['id']);
  if (idx === -1) {
    errorResponse(res, 'Session not found', 404);
    return;
  }

  const { duration, notes, prescription } = req.body;
  sessions[idx]!.status = 'COMPLETED';
  sessions[idx]!.endedAt = new Date().toISOString();
  if (duration !== undefined) sessions[idx]!.duration = Number(duration);
  if (notes !== undefined) sessions[idx]!.notes = notes;
  if (prescription !== undefined) sessions[idx]!.prescription = prescription;

  writeSessions(sessions);
  const enriched = await enrichSession(sessions[idx]!);
  successResponse(res, enriched, 'Session ended');
});

// PUT /api/telemedicine-sessions/:id/cancel
export const cancelSession = asyncHandler(async (req: Request, res: Response) => {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === req.params['id']);
  if (idx === -1) {
    errorResponse(res, 'Session not found', 404);
    return;
  }

  if (sessions[idx]!.status === 'COMPLETED') {
    errorResponse(res, 'Cannot cancel a completed session', 400);
    return;
  }

  sessions[idx]!.status = 'CANCELLED';
  writeSessions(sessions);

  successResponse(res, sessions[idx], 'Session cancelled');
});
