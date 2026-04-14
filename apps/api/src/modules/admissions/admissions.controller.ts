import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { generateAdmissionNo } from '../../utils/generateNo';

// GET /api/rooms
export const getRooms = asyncHandler(async (req: Request, res: Response) => {
  const { roomTypeId, floor, building } = req.query;

  const where: Record<string, unknown> = { isActive: true };
  if (roomTypeId) where['roomTypeId'] = roomTypeId;
  if (floor) where['floor'] = floor;
  if (building) where['building'] = building;

  const rooms = await prisma.room.findMany({
    where,
    include: {
      roomType: true,
      department: { select: { id: true, name: true } },
      admissions: {
        where: { status: 'ADMITTED' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, patientNo: true } },
        },
        take: 1,
      },
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  });

  successResponse(res, rooms);
});

// POST /api/rooms
export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const { roomNumber, roomTypeId, departmentId, floor, building, beds, notes } = req.body;

  const existing = await prisma.room.findUnique({ where: { roomNumber } });
  if (existing) {
    errorResponse(res, `Room number ${roomNumber} already exists`, 400);
    return;
  }

  const room = await prisma.room.create({
    data: { roomNumber, roomTypeId, departmentId, floor, building, beds: beds || 1, notes },
    include: { roomType: true, department: { select: { id: true, name: true } } },
  });

  successResponse(res, room, 'Room created', 201);
});

// PUT /api/rooms/:id
export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await prisma.room.findUnique({ where: { id: req.params['id'] } });
  if (!room) {
    errorResponse(res, 'Room not found', 404);
    return;
  }

  const updated = await prisma.room.update({
    where: { id: req.params['id'] },
    data: req.body,
    include: { roomType: true, department: { select: { id: true, name: true } } },
  });

  successResponse(res, updated, 'Room updated');
});

// GET /api/room-types
export const getRoomTypes = asyncHandler(async (_req: Request, res: Response) => {
  const roomTypes = await prisma.roomType.findMany({
    include: { _count: { select: { rooms: true } } },
    orderBy: { name: 'asc' },
  });
  successResponse(res, roomTypes);
});

// POST /api/room-types
export const createRoomType = asyncHandler(async (req: Request, res: Response) => {
  const { name, ratePerDay, description } = req.body;

  const existing = await prisma.roomType.findUnique({ where: { name } });
  if (existing) {
    errorResponse(res, `Room type "${name}" already exists`, 400);
    return;
  }

  const roomType = await prisma.roomType.create({
    data: { name, ratePerDay, description },
  });

  successResponse(res, roomType, 'Room type created', 201);
});

// GET /api/admissions/stats  — must be registered before /:id
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalAdmitted, totalRooms, occupiedRooms, avgResult] = await Promise.all([
    prisma.admission.count({ where: { status: 'ADMITTED' } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.room.count({ where: { isOccupied: true, isActive: true } }),
    prisma.admission.findMany({
      where: { status: 'DISCHARGED', dischargedAt: { not: null } },
      select: { admittedAt: true, dischargedAt: true },
      take: 100,
      orderBy: { admittedAt: 'desc' },
    }),
  ]);

  const availableRooms = totalRooms - occupiedRooms;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  let avgLengthOfStay = 0;
  if (avgResult.length > 0) {
    const totalDays = avgResult.reduce((sum, a) => {
      const diff = (new Date(a.dischargedAt!).getTime() - new Date(a.admittedAt).getTime());
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    avgLengthOfStay = parseFloat((totalDays / avgResult.length).toFixed(1));
  }

  successResponse(res, { totalAdmitted, availableRooms, occupancyRate, avgLengthOfStay, totalRooms });
});

// GET /api/admissions
export const getAdmissions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status = 'ADMITTED', patientId, search } = req.query;

  const where: Record<string, unknown> = {};
  if (status && status !== 'ALL') where['status'] = status;
  if (patientId) where['patientId'] = patientId;

  if (search) {
    where['OR'] = [
      { admissionNo: { contains: search as string, mode: 'insensitive' } },
      { patient: { firstName: { contains: search as string, mode: 'insensitive' } } },
      { patient: { lastName: { contains: search as string, mode: 'insensitive' } } },
    ];
  }

  const [admissions, total] = await Promise.all([
    prisma.admission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { admittedAt: 'desc' },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
        room: { include: { roomType: true } },
      },
    }),
    prisma.admission.count({ where }),
  ]);

  const admissionsWithDays = admissions.map((a) => {
    const end = a.dischargedAt ? new Date(a.dischargedAt) : new Date();
    const daysStayed = Math.ceil((end.getTime() - new Date(a.admittedAt).getTime()) / (1000 * 60 * 60 * 24));
    return { ...a, daysStayed };
  });

  paginatedResponse(res, admissionsWithDays, total, page, limit);
});

// GET /api/admissions/:id
export const getAdmission = asyncHandler(async (req: Request, res: Response) => {
  const admission = await prisma.admission.findUnique({
    where: { id: req.params['id'] },
    include: {
      patient: true,
      room: { include: { roomType: true, department: true } },
    },
  });

  if (!admission) {
    errorResponse(res, 'Admission not found', 404);
    return;
  }

  const end = admission.dischargedAt ? new Date(admission.dischargedAt) : new Date();
  const daysStayed = Math.ceil((end.getTime() - new Date(admission.admittedAt).getTime()) / (1000 * 60 * 60 * 24));

  successResponse(res, { ...admission, daysStayed });
});

// POST /api/admissions
export const createAdmission = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, roomId, attendingDoctor, diagnosis, notes } = req.body;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      errorResponse(res, 'Room not found', 404);
      return;
    }
    if (room.isOccupied) {
      errorResponse(res, `Room ${room.roomNumber} is already occupied`, 400);
      return;
    }
  }

  // Check if patient is already admitted
  const existing = await prisma.admission.findFirst({
    where: { patientId, status: 'ADMITTED' },
  });
  if (existing) {
    errorResponse(res, 'Patient is already admitted', 400);
    return;
  }

  const admissionNo = await generateAdmissionNo();

  const [admission] = await prisma.$transaction([
    prisma.admission.create({
      data: { admissionNo, patientId, roomId, attendingDoctor, diagnosis, notes, status: 'ADMITTED' },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
        room: { include: { roomType: true } },
      },
    }),
    ...(roomId
      ? [prisma.room.update({ where: { id: roomId }, data: { isOccupied: true } })]
      : []),
  ]);

  successResponse(res, admission, 'Patient admitted successfully', 201);
});

// PUT /api/admissions/:id/discharge
export const dischargePatient = asyncHandler(async (req: Request, res: Response) => {
  const { dischargeNotes, dischargedAt } = req.body;

  const admission = await prisma.admission.findUnique({
    where: { id: req.params['id'] },
    include: { room: true },
  });

  if (!admission) {
    errorResponse(res, 'Admission not found', 404);
    return;
  }

  if (admission.status === 'DISCHARGED') {
    errorResponse(res, 'Patient is already discharged', 400);
    return;
  }

  const dischargeDate = dischargedAt ? new Date(dischargedAt) : new Date();

  const [updated] = await prisma.$transaction([
    prisma.admission.update({
      where: { id: req.params['id'] },
      data: {
        status: 'DISCHARGED',
        dischargedAt: dischargeDate,
        notes: dischargeNotes
          ? `${admission.notes || ''}\nDischarge notes: ${dischargeNotes}`.trim()
          : admission.notes,
      },
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
        room: { include: { roomType: true } },
      },
    }),
    ...(admission.roomId
      ? [prisma.room.update({ where: { id: admission.roomId }, data: { isOccupied: false } })]
      : []),
  ]);

  successResponse(res, updated, 'Patient discharged successfully');
});
