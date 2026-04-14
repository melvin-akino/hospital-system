import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

const DATA_DIR = path.join(__dirname, '../../../../data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  ensureDataDir();
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// In-memory completed tasks per process lifetime
const completedTasks = new Set<string>();

// GET /api/nurses/patients
export const getAssignedPatients = asyncHandler(async (_req: Request, res: Response) => {
  const admissions = await prisma.admission.findMany({
    where: { status: 'ADMITTED' },
    include: {
      patient: {
        include: {
          allergies: { where: { isActive: true } },
          medications: { where: { isActive: true } },
        },
      },
      room: true,
    },
    orderBy: { admittedAt: 'asc' },
  });
  successResponse(res, admissions);
});

// GET /api/nurses/tasks
export const getTaskList = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  const [admissions, pendingLab, recentVitals] = await Promise.all([
    prisma.admission.findMany({
      where: { status: 'ADMITTED' },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        room: true,
      },
    }),
    prisma.labRequisition.findMany({
      where: { status: 'PENDING' },
      include: { patient: { select: { firstName: true, lastName: true } } },
      take: 20,
    }),
    prisma.vitalSign.findMany({
      where: { recordedAt: { gte: fourHoursAgo } },
      select: { patientId: true },
    }),
  ]);

  const recentVitalPatients = new Set(recentVitals.map((v) => v.patientId));

  const tasks: Array<{
    id: string;
    type: string;
    priority: string;
    patientName: string;
    patientId: string;
    description: string;
    dueAt: string;
    status: string;
  }> = [];

  for (const adm of admissions) {
    if (!recentVitalPatients.has(adm.patientId)) {
      const tid = `vitals-${adm.patientId}`;
      tasks.push({
        id: tid,
        type: 'VITALS',
        priority: 'ROUTINE',
        patientId: adm.patientId,
        patientName: `${adm.patient.lastName}, ${adm.patient.firstName}`,
        description: `Record vital signs — Room ${adm.room?.roomNumber ?? 'N/A'}`,
        dueAt: new Date(now.getTime() + 30 * 60000).toISOString(),
        status: completedTasks.has(tid) ? 'COMPLETED' : 'PENDING',
      });
    }
  }

  for (const req of pendingLab) {
    const tid = `lab-${req.id}`;
    tasks.push({
      id: tid,
      type: 'LAB_COLLECT',
      priority: req.priority === 'STAT' ? 'URGENT' : 'ROUTINE',
      patientId: req.patientId,
      patientName: `${req.patient.lastName}, ${req.patient.firstName}`,
      description: `Collect specimen — Requisition ${req.requisitionNo}`,
      dueAt: new Date(now.getTime() + (req.priority === 'STAT' ? 15 : 60) * 60000).toISOString(),
      status: completedTasks.has(tid) ? 'COMPLETED' : 'PENDING',
    });
  }

  tasks.sort((a, b) => {
    if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
    if (b.priority === 'URGENT' && a.priority !== 'URGENT') return 1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  successResponse(res, tasks);
});

// POST /api/nurses/tasks/:taskId/complete
export const completeTask = asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  if (!taskId) {
    errorResponse(res, 'taskId required', 400);
    return;
  }
  completedTasks.add(taskId);
  successResponse(res, { taskId, status: 'COMPLETED' }, 'Task marked complete');
});

// POST /api/nurses/vitals
export const recordVitals = asyncHandler(async (req: Request, res: Response) => {
  const {
    patientId,
    temperature,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    heartRate,
    respiratoryRate,
    oxygenSaturation,
    weight,
    height,
    notes,
  } = req.body;

  if (!patientId) {
    errorResponse(res, 'patientId required', 400);
    return;
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  let bmi: number | null = null;
  if (weight && height) {
    const hm = Number(height) / 100;
    bmi = Math.round((Number(weight) / (hm * hm)) * 10) / 10;
  }

  const vital = await prisma.vitalSign.create({
    data: {
      patientId,
      temperature: temperature != null ? Number(temperature) : null,
      bloodPressureSystolic: bloodPressureSystolic != null ? Number(bloodPressureSystolic) : null,
      bloodPressureDiastolic: bloodPressureDiastolic != null ? Number(bloodPressureDiastolic) : null,
      heartRate: heartRate != null ? Number(heartRate) : null,
      respiratoryRate: respiratoryRate != null ? Number(respiratoryRate) : null,
      oxygenSaturation: oxygenSaturation != null ? Number(oxygenSaturation) : null,
      weight: weight != null ? Number(weight) : null,
      height: height != null ? Number(height) : null,
      bmi: bmi != null ? Number(bmi) : null,
      notes,
    },
  });

  successResponse(res, vital, 'Vitals recorded', 201);
});

// GET /api/nurses/care-plans/:patientId
export const getCareplan = asyncHandler(async (req: Request, res: Response) => {
  const plans = readJson<Record<string, unknown>[]>('care-plans.json', []);
  const plan = plans.find((p) => p['patientId'] === req.params['patientId']);
  successResponse(res, plan ?? null);
});

// POST /api/nurses/care-plans
export const saveCareplan = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, goals, interventions, evaluation, nurseNotes } = req.body;
  if (!patientId) {
    errorResponse(res, 'patientId required', 400);
    return;
  }

  const plans = readJson<Record<string, unknown>[]>('care-plans.json', []);
  const idx = plans.findIndex((p) => p['patientId'] === patientId);

  const plan = {
    id: uuidv4(),
    patientId,
    goals,
    interventions,
    evaluation,
    nurseNotes,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    plans[idx] = plan;
  } else {
    plans.push(plan);
  }

  writeJson('care-plans.json', plans);
  successResponse(res, plan, 'Care plan saved', 201);
});

// POST /api/nurses/shift-handover
export const saveHandover = asyncHandler(async (req: Request, res: Response) => {
  const { outgoingNurse, incomingNurse, shift, generalNotes, patientUpdates } = req.body;

  const handovers = readJson<unknown[]>('shift-handovers.json', []);
  const handover = {
    id: uuidv4(),
    outgoingNurse,
    incomingNurse,
    shift,
    generalNotes,
    patientUpdates: patientUpdates ?? [],
    createdAt: new Date().toISOString(),
  };

  handovers.unshift(handover);
  writeJson('shift-handovers.json', handovers);
  successResponse(res, handover, 'Handover saved', 201);
});

// GET /api/nurses/shift-handover/latest
export const getLatestHandover = asyncHandler(async (_req: Request, res: Response) => {
  const handovers = readJson<unknown[]>('shift-handovers.json', []);
  successResponse(res, handovers[0] ?? null);
});
