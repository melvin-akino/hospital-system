import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';
import { generateAppointmentNo } from '../../utils/generateNo';

export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
  const { doctorId, patientId, status, date, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (doctorId) where.doctorId = doctorId;
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;
  if (date) {
    const d = new Date(date as string);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.scheduledAt = { gte: d, lt: next };
  }

  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, patientNo: true, firstName: true, lastName: true, phone: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
  ]);

  res.json({ success: true, data: appointments, total, page: parseInt(page as string), limit: parseInt(limit as string) });
});

export const getAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
    },
  });
  if (!appointment) {
    errorResponse(res, 'Appointment not found', 404);
    return;
  }
  successResponse(res, appointment);
});

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, doctorId, serviceId, scheduledAt, duration = 30, notes } = req.body;

  if (!patientId || !scheduledAt) {
    errorResponse(res, 'patientId and scheduledAt are required', 400);
    return;
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    errorResponse(res, 'Patient not found', 404);
    return;
  }

  const appointmentNo = await generateAppointmentNo();

  const appointment = await prisma.appointment.create({
    data: {
      appointmentNo,
      patientId,
      doctorId: doctorId || null,
      serviceId: serviceId || null,
      scheduledAt: new Date(scheduledAt),
      duration,
      notes,
      status: 'SCHEDULED',
    },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
    },
  });

  successResponse(res, appointment, 'Appointment booked', 201);
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { scheduledAt, duration, notes, status, doctorId, serviceId } = req.body;

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    errorResponse(res, 'Appointment not found', 404);
    return;
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
      ...(duration !== undefined && { duration }),
      ...(notes !== undefined && { notes }),
      ...(status && { status }),
      ...(doctorId !== undefined && { doctorId }),
      ...(serviceId !== undefined && { serviceId }),
    },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true } },
    },
  });

  successResponse(res, updated, 'Appointment updated');
});

export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    errorResponse(res, 'Appointment not found', 404);
    return;
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  successResponse(res, updated, 'Appointment cancelled');
});

export const getDoctorAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { doctorId } = req.params;
  const { date } = req.query;

  if (!date) {
    errorResponse(res, 'date query parameter is required (YYYY-MM-DD)', 400);
    return;
  }

  const day = new Date(date as string);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);

  // Fetch booked slots for this doctor on this date
  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledAt: { gte: day, lt: nextDay },
      status: { not: 'CANCELLED' },
    },
    select: { scheduledAt: true, duration: true },
  });

  // Default schedule: 8am-5pm, 30 min slots
  const schedule = { startTime: '08:00', endTime: '17:00', slotDuration: 30 };

  // Generate all slots
  const slots: string[] = [];
  const startH = 8;
  const endH = 17;
  for (let h = startH; h < endH; h++) {
    for (let m = 0; m < 60; m += schedule.slotDuration) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }

  // Mark booked slots
  const bookedSlots = booked.map((b) => {
    const d = new Date(b.scheduledAt);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const availableSlots = slots.filter((s) => !bookedSlots.includes(s));

  successResponse(res, {
    doctorId,
    date,
    schedule,
    bookedSlots,
    availableSlots,
    allSlots: slots,
  });
});

export const getTodayAppointments = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: today, lt: tomorrow },
    },
    include: {
      patient: { select: { id: true, patientNo: true, firstName: true, lastName: true, phone: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  successResponse(res, appointments);
});
