import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import { generateDoctorNo } from '../../utils/generateNo';

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctorNo = await generateDoctorNo();
  const doctor = await prisma.doctor.create({
    data: {
      ...req.body,
      doctorNo,
      consultingFee: req.body.consultingFee || 0,
      ...(req.body.prcExpiryDate && { prcExpiryDate: new Date(req.body.prcExpiryDate) }),
    },
    include: {
      department: { select: { id: true, name: true } },
      user: { select: { id: true, username: true, email: true } },
    },
  });
  successResponse(res, doctor, 'Doctor created', 201);
});

export const getDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { search, departmentId, specialty } = req.query;

  const where: Record<string, unknown> = { isActive: true };
  if (search) {
    where['OR'] = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { doctorNo: { contains: search as string, mode: 'insensitive' } },
      { licenseNo: { contains: search as string } },
    ];
  }
  if (departmentId) where['departmentId'] = departmentId;
  if (specialty) where['specialty'] = { contains: specialty as string, mode: 'insensitive' };

  const [doctors, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastName: 'asc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.doctor.count({ where }),
  ]);

  paginatedResponse(res, doctors, total, page, limit);
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: req.params['id'] },
    include: {
      department: true,
      schedules: { where: { isActive: true } },
      user: { select: { id: true, username: true, email: true, role: true } },
    },
  });

  if (!doctor) {
    errorResponse(res, 'Doctor not found', 404);
    return;
  }

  successResponse(res, doctor);
});

export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: req.params['id'] } });
  if (!doctor) {
    errorResponse(res, 'Doctor not found', 404);
    return;
  }

  const updated = await prisma.doctor.update({
    where: { id: req.params['id'] },
    data: {
      ...req.body,
      ...(req.body.prcExpiryDate && { prcExpiryDate: new Date(req.body.prcExpiryDate) }),
    },
    include: { department: true },
  });

  successResponse(res, updated, 'Doctor updated');
});

export const deleteDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: req.params['id'] } });
  if (!doctor) {
    errorResponse(res, 'Doctor not found', 404);
    return;
  }

  await prisma.doctor.update({
    where: { id: req.params['id'] },
    data: { isActive: false },
  });

  successResponse(res, null, 'Doctor deactivated');
});

export const getDoctorSchedules = asyncHandler(async (req: Request, res: Response) => {
  const schedules = await prisma.doctorSchedule.findMany({
    where: { doctorId: req.params['id'] },
    orderBy: { dayOfWeek: 'asc' },
  });
  successResponse(res, schedules);
});

export const createSchedule = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await prisma.doctorSchedule.create({
    data: {
      ...req.body,
      doctorId: req.params['id'],
    },
  });
  successResponse(res, schedule, 'Schedule created', 201);
});

export const updateSchedule = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await prisma.doctorSchedule.update({
    where: { id: req.params['scheduleId'] },
    data: req.body,
  });
  successResponse(res, schedule, 'Schedule updated');
});
