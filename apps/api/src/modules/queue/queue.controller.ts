import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';
import { emitQueueUpdate } from '../../lib/socket';

const generateTicketNo = async (departmentCode: string, queueId: string): Promise<string> => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const count = await prisma.queueEntry.count({
    where: {
      queueId,
      createdAt: { gte: startOfDay },
    },
  });
  return `${departmentCode.toUpperCase()}${String(count + 1).padStart(3, '0')}`;
};

export const getDepartmentQueues = asyncHandler(async (req: Request, res: Response) => {
  const queues = await prisma.queue.findMany({
    where: { isActive: true },
    include: {
      department: { select: { name: true, code: true } },
      entries: {
        where: { status: 'WAITING' },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const result = queues.map((q) => ({
    id: q.id,
    name: q.name,
    departmentId: q.departmentId,
    department: q.department,
    waitingCount: q.entries.length,
  }));

  successResponse(res, result);
});

export const getQueueStatus = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;

  const queue = await prisma.queue.findFirst({
    where: { departmentId, isActive: true },
    include: {
      department: { select: { name: true, code: true } },
      entries: {
        where: { status: { in: ['WAITING', 'IN_SERVICE'] } },
        include: {
          patient: { select: { firstName: true, lastName: true, patientNo: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!queue) {
    errorResponse(res, 'Queue not found for this department', 404);
    return;
  }

  const nowServing = queue.entries.find((e) => e.status === 'IN_SERVICE');
  const waiting = queue.entries.filter((e) => e.status === 'WAITING');

  successResponse(res, {
    queue: { id: queue.id, name: queue.name, department: queue.department },
    nowServing,
    waiting,
    waitingCount: waiting.length,
  });
});

export const addToQueue = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const { patientId, isSeniorOrPwd } = req.body;

  const [queue, patient] = await Promise.all([
    prisma.queue.findFirst({ where: { departmentId, isActive: true }, include: { department: true } }),
    prisma.patient.findUnique({ where: { id: patientId } }),
  ]);

  if (!queue) {
    errorResponse(res, 'Queue not found for this department', 404);
    return;
  }

  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const ticketNo = await generateTicketNo(queue.department.code, queue.id);
  const priority = isSeniorOrPwd || patient.isSenior || patient.isPwd ? 1 : 0;

  const entry = await prisma.queueEntry.create({
    data: {
      queueId: queue.id,
      patientId,
      ticketNo,
      priority,
      status: 'WAITING',
    },
    include: {
      patient: { select: { firstName: true, lastName: true, patientNo: true, isSenior: true, isPwd: true } },
      queue: { select: { name: true } },
    },
  });

  successResponse(res, entry, 'Patient added to queue', 201);
  // Push real-time update to all display screens
  await emitQueueUpdate(departmentId);
});

export const callNext = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;

  const queue = await prisma.queue.findFirst({
    where: { departmentId, isActive: true },
  });

  if (!queue) {
    errorResponse(res, 'Queue not found', 404);
    return;
  }

  // Mark current IN_SERVICE entries as needing attention
  const currentInService = await prisma.queueEntry.findFirst({
    where: { queueId: queue.id, status: 'IN_SERVICE' },
  });

  if (currentInService) {
    await prisma.queueEntry.update({
      where: { id: currentInService.id },
      data: { status: 'WAITING' },
    });
  }

  // Get next: highest priority first, then FIFO
  const next = await prisma.queueEntry.findFirst({
    where: { queueId: queue.id, status: 'WAITING' },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: {
      patient: { select: { firstName: true, lastName: true, patientNo: true } },
    },
  });

  if (!next) {
    errorResponse(res, 'No patients waiting in queue', 404);
    return;
  }

  const updated = await prisma.queueEntry.update({
    where: { id: next.id },
    data: { status: 'IN_SERVICE', calledAt: new Date() },
    include: {
      patient: { select: { firstName: true, lastName: true, patientNo: true } },
    },
  });

  successResponse(res, updated, `Now serving: ${updated.ticketNo}`);
  await emitQueueUpdate(departmentId);
});

export const completeEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const entry = await prisma.queueEntry.findUnique({ where: { id } });
  if (!entry) {
    errorResponse(res, 'Queue entry not found', 404);
    return;
  }

  const updated = await prisma.queueEntry.update({
    where: { id },
    data: { status: 'SERVED', servedAt: new Date() },
    include: { queue: { select: { departmentId: true } } },
  });

  successResponse(res, updated, 'Entry completed');
  await emitQueueUpdate(updated.queue.departmentId);
});

export const skipEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const entry = await prisma.queueEntry.findUnique({ where: { id } });
  if (!entry) {
    errorResponse(res, 'Queue entry not found', 404);
    return;
  }

  const updated = await prisma.queueEntry.update({
    where: { id },
    data: { status: 'SKIPPED' },
    include: { queue: { select: { departmentId: true } } },
  });

  successResponse(res, updated, 'Entry skipped');
  await emitQueueUpdate(updated.queue.departmentId);
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;

  const queue = await prisma.queue.findFirst({
    where: { departmentId, isActive: true },
  });

  if (!queue) {
    errorResponse(res, 'Queue not found', 404);
    return;
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [totalServed, skipped, waiting, served] = await Promise.all([
    prisma.queueEntry.count({
      where: { queueId: queue.id, status: 'SERVED', servedAt: { gte: startOfDay } },
    }),
    prisma.queueEntry.count({
      where: { queueId: queue.id, status: 'SKIPPED', createdAt: { gte: startOfDay } },
    }),
    prisma.queueEntry.count({
      where: { queueId: queue.id, status: 'WAITING' },
    }),
    prisma.queueEntry.findMany({
      where: {
        queueId: queue.id,
        status: 'SERVED',
        servedAt: { gte: startOfDay },
        calledAt: { not: null },
      },
      select: { createdAt: true, calledAt: true },
    }),
  ]);

  let avgWaitMinutes = 0;
  if (served.length > 0) {
    const totalWait = served.reduce((sum, e) => {
      if (e.calledAt) {
        return sum + (e.calledAt.getTime() - e.createdAt.getTime()) / 60000;
      }
      return sum;
    }, 0);
    avgWaitMinutes = Math.round(totalWait / served.length);
  }

  successResponse(res, {
    totalServedToday: totalServed,
    skippedToday: skipped,
    currentlyWaiting: waiting,
    avgWaitTimeMinutes: avgWaitMinutes,
  });
});
