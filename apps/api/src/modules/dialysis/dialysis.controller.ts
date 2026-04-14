import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { generateDialysisSessionNo } from '../../utils/generateNo';

// GET /api/dialysis-machines
export const getMachines = asyncHandler(async (_req: Request, res: Response) => {
  const machines = await prisma.dialysisMachine.findMany({
    include: {
      _count: { select: { sessions: true } },
      sessions: {
        where: { status: 'IN_PROGRESS' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
        },
        take: 1,
      },
    },
    orderBy: { machineCode: 'asc' },
  });

  successResponse(res, machines);
});

// POST /api/dialysis-machines
export const createMachine = asyncHandler(async (req: Request, res: Response) => {
  const { machineCode, model } = req.body;

  const existing = await prisma.dialysisMachine.findUnique({ where: { machineCode } });
  if (existing) {
    errorResponse(res, `Machine code ${machineCode} already exists`, 400);
    return;
  }

  const machine = await prisma.dialysisMachine.create({
    data: { machineCode, model, status: 'AVAILABLE' },
  });

  successResponse(res, machine, 'Machine registered', 201);
});

// PUT /api/dialysis-machines/:id
export const updateMachine = asyncHandler(async (req: Request, res: Response) => {
  const machine = await prisma.dialysisMachine.findUnique({ where: { id: req.params['id'] } });
  if (!machine) {
    errorResponse(res, 'Machine not found', 404);
    return;
  }

  const updated = await prisma.dialysisMachine.update({
    where: { id: req.params['id'] },
    data: req.body,
  });

  successResponse(res, updated, 'Machine updated');
});

// GET /api/dialysis/schedule (today's schedule)
export const getTodaySchedule = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const sessions = await prisma.dialysisSession.findMany({
    where: {
      scheduledAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
      machine: { select: { id: true, machineCode: true, model: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  successResponse(res, sessions);
});

// GET /api/dialysis-sessions
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status, patientId, date } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (patientId) where['patientId'] = patientId;

  if (date) {
    const d = new Date(date as string);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    where['scheduledAt'] = { gte: start, lte: end };
  }

  const [sessions, total] = await Promise.all([
    prisma.dialysisSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scheduledAt: 'desc' },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
        machine: { select: { id: true, machineCode: true, model: true } },
      },
    }),
    prisma.dialysisSession.count({ where }),
  ]);

  paginatedResponse(res, sessions, total, page, limit);
});

// GET /api/dialysis-sessions/:id
export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await prisma.dialysisSession.findUnique({
    where: { id: req.params['id'] },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true, phone: true } },
      machine: { select: { id: true, machineCode: true, model: true, status: true } },
    },
  });

  if (!session) {
    errorResponse(res, 'Session not found', 404);
    return;
  }

  successResponse(res, session);
});

// POST /api/dialysis-sessions
export const scheduleSession = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, machineId, scheduledAt, notes } = req.body;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  if (machineId) {
    const machine = await prisma.dialysisMachine.findUnique({ where: { id: machineId } });
    if (!machine) {
      errorResponse(res, 'Machine not found', 404);
      return;
    }
    if (machine.status === 'IN_USE') {
      errorResponse(res, `Machine ${machine.machineCode} is currently in use`, 400);
      return;
    }
    if (machine.status === 'MAINTENANCE') {
      errorResponse(res, `Machine ${machine.machineCode} is under maintenance`, 400);
      return;
    }
  }

  const sessionNo = await generateDialysisSessionNo();

  const session = await prisma.dialysisSession.create({
    data: {
      sessionNo,
      patientId,
      machineId,
      scheduledAt: new Date(scheduledAt),
      notes,
      status: 'SCHEDULED',
    },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
      machine: { select: { id: true, machineCode: true, model: true } },
    },
  });

  successResponse(res, session, 'Session scheduled', 201);
});

// PUT /api/dialysis-sessions/:id/start
export const startSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await prisma.dialysisSession.findUnique({
    where: { id: req.params['id'] },
    include: { machine: true },
  });

  if (!session) {
    errorResponse(res, 'Session not found', 404);
    return;
  }

  if (session.status !== 'SCHEDULED') {
    errorResponse(res, `Cannot start a session with status ${session.status}`, 400);
    return;
  }

  const ops: Parameters<typeof prisma.$transaction>[0] = [
    prisma.dialysisSession.update({
      where: { id: req.params['id'] },
      data: { startedAt: new Date(), status: 'IN_PROGRESS' },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
        machine: { select: { id: true, machineCode: true, model: true } },
      },
    }),
  ];

  if (session.machineId) {
    ops.push(
      prisma.dialysisMachine.update({
        where: { id: session.machineId },
        data: { status: 'IN_USE' },
      })
    );
  }

  const [updated] = await prisma.$transaction(ops);

  successResponse(res, updated, 'Session started');
});

// PUT /api/dialysis-sessions/:id/end
export const endSession = asyncHandler(async (req: Request, res: Response) => {
  const { ktv, notes, complications } = req.body;

  const session = await prisma.dialysisSession.findUnique({
    where: { id: req.params['id'] },
    include: { machine: true },
  });

  if (!session) {
    errorResponse(res, 'Session not found', 404);
    return;
  }

  if (session.status !== 'IN_PROGRESS') {
    errorResponse(res, 'Session is not in progress', 400);
    return;
  }

  const endedAt = new Date();
  const startedAt = session.startedAt || session.scheduledAt;
  const durationMinutes = Math.round((endedAt.getTime() - new Date(startedAt).getTime()) / 60000);

  const endNotes = [session.notes, notes, complications ? `Complications: ${complications}` : null]
    .filter(Boolean)
    .join('\n');

  const ops: Parameters<typeof prisma.$transaction>[0] = [
    prisma.dialysisSession.update({
      where: { id: req.params['id'] },
      data: {
        endedAt,
        duration: durationMinutes,
        status: 'COMPLETED',
        ktv,
        notes: endNotes || session.notes,
      },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
        machine: { select: { id: true, machineCode: true, model: true } },
      },
    }),
  ];

  if (session.machineId) {
    ops.push(
      prisma.dialysisMachine.update({
        where: { id: session.machineId },
        data: { status: 'AVAILABLE' },
      })
    );
  }

  const [updated] = await prisma.$transaction(ops);

  successResponse(res, updated, 'Session completed');
});

// GET /api/dialysis-patients/:patientId/sessions
export const getPatientSessions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);

  const [sessions, total] = await Promise.all([
    prisma.dialysisSession.findMany({
      where: { patientId: req.params['patientId'] },
      skip,
      take: limit,
      orderBy: { scheduledAt: 'desc' },
      include: {
        machine: { select: { id: true, machineCode: true, model: true } },
      },
    }),
    prisma.dialysisSession.count({ where: { patientId: req.params['patientId'] } }),
  ]);

  paginatedResponse(res, sessions, total, page, limit);
});
