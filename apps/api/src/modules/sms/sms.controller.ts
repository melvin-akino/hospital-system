import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';
import { sendSms as semaphoreSend } from './sms.service';

async function doSend(recipient: string, message: string): Promise<{ messageId: string; status: string }> {
  return semaphoreSend(recipient, message);
}

// ── Seed default templates on first run ───────────────────────────────────────
const DEFAULT_TEMPLATES = [
  { name: 'APPOINTMENT_REMINDER', category: 'APPOINTMENT', template: 'Dear {{patientName}}, this is a reminder for your appointment with Dr. {{doctorName}} on {{date}} at {{time}}. Please arrive 15 minutes early. - iHIMS Hospital' },
  { name: 'LAB_RESULT_READY', category: 'LABORATORY', template: 'Dear {{patientName}}, your laboratory results are now available. Please visit the hospital or check your patient portal. - iHIMS Hospital' },
  { name: 'BILL_READY', category: 'BILLING', template: 'Dear {{patientName}}, your bill ({{billNo}}) of {{amount}} is ready for payment. - iHIMS Hospital' },
  { name: 'PRESCRIPTION_READY', category: 'PHARMACY', template: 'Dear {{patientName}}, your prescription is ready for pickup at our pharmacy. - iHIMS Hospital' },
  { name: 'APPOINTMENT_CONFIRMED', category: 'APPOINTMENT', template: 'Dear {{patientName}}, your appointment with Dr. {{doctorName}} on {{date}} has been confirmed. Room code: {{roomCode}}. - iHIMS Hospital' },
];

async function seedTemplates(): Promise<void> {
  const count = await prisma.smsTemplate.count();
  if (count === 0) {
    await prisma.smsTemplate.createMany({ data: DEFAULT_TEMPLATES });
  }
}
seedTemplates().catch(() => {/* ignore on startup */});

// GET /api/sms/templates
export const getTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await prisma.smsTemplate.findMany({ orderBy: { name: 'asc' } });
  successResponse(res, templates);
});

// POST /api/sms/templates
export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { name, template, category } = req.body;
  if (!name || !template || !category) {
    errorResponse(res, 'name, template, and category are required', 400);
    return;
  }
  const newTemplate = await prisma.smsTemplate.create({ data: { name, template, category } });
  successResponse(res, newTemplate, 'Template created', 201);
});

// PUT /api/sms/templates/:id
export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.smsTemplate.findUnique({ where: { id } });
  if (!existing) {
    errorResponse(res, 'Template not found', 404);
    return;
  }
  const { name, template, category } = req.body;
  const updated = await prisma.smsTemplate.update({
    where: { id },
    data: { ...(name && { name }), ...(template && { template }), ...(category && { category }) },
  });
  successResponse(res, updated);
});

// DELETE /api/sms/templates/:id
export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.smsTemplate.findUnique({ where: { id } });
  if (!existing) {
    errorResponse(res, 'Template not found', 404);
    return;
  }
  await prisma.smsTemplate.delete({ where: { id } });
  successResponse(res, null, 'Template deleted');
});

// POST /api/sms/send
export const sendSms = asyncHandler(async (req: Request, res: Response) => {
  const { recipient, message, templateId } = req.body;
  if (!recipient || !message) {
    errorResponse(res, 'recipient and message are required', 400);
    return;
  }

  const logEntry = await prisma.smsLog.create({
    data: { recipient, message, templateId: templateId || null, status: 'PENDING' },
  });

  try {
    const result = await doSend(recipient, message);
    const updated = await prisma.smsLog.update({
      where: { id: logEntry.id },
      data: { status: 'SENT', messageId: result.messageId, sentAt: new Date() },
    });
    successResponse(res, updated, 'SMS sent successfully');
  } catch {
    await prisma.smsLog.update({ where: { id: logEntry.id }, data: { status: 'FAILED' } });
    errorResponse(res, 'Failed to send SMS', 500);
  }
});

// POST /api/sms/send-bulk
export const sendBulkSms = asyncHandler(async (req: Request, res: Response) => {
  const { recipients, message, templateId } = req.body;
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    errorResponse(res, 'recipients array is required', 400);
    return;
  }
  if (!message) {
    errorResponse(res, 'message is required', 400);
    return;
  }

  const results = await Promise.all(
    (recipients as string[]).map(async (recipient) => {
      const log = await prisma.smsLog.create({
        data: { recipient, message, templateId: templateId || null, status: 'PENDING' },
      });
      try {
        const result = await doSend(recipient, message);
        return prisma.smsLog.update({
          where: { id: log.id },
          data: { status: 'SENT', messageId: result.messageId, sentAt: new Date() },
        });
      } catch {
        return prisma.smsLog.update({ where: { id: log.id }, data: { status: 'FAILED' } });
      }
    })
  );

  successResponse(res, {
    total: results.length,
    sent: results.filter((r) => r.status === 'SENT').length,
    failed: results.filter((r) => r.status === 'FAILED').length,
    results,
  });
});

// GET /api/sms/logs
export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const { status, dateFrom, dateTo, recipient } = req.query;

  const where: any = {};
  if (status) where.status = status;
  if (recipient) where.recipient = { contains: recipient as string };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
    if (dateTo) where.createdAt.lte = new Date(dateTo as string);
  }

  const logs = await prisma.smsLog.findMany({ where, orderBy: { createdAt: 'desc' } });
  successResponse(res, logs);
});

// GET /api/sms/stats
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalSent, failed, pending, todayCount, templateCount] = await Promise.all([
    prisma.smsLog.count({ where: { status: 'SENT' } }),
    prisma.smsLog.count({ where: { status: 'FAILED' } }),
    prisma.smsLog.count({ where: { status: 'PENDING' } }),
    prisma.smsLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.smsTemplate.count(),
  ]);

  successResponse(res, { totalSent, delivered: totalSent, failed, pendingCount: pending, todayCount, templateCount });
});

// POST /api/sms/appointment-reminder/:appointmentId
export const sendAppointmentReminder = asyncHandler(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true },
  });

  if (!appointment) {
    errorResponse(res, 'Appointment not found', 404);
    return;
  }

  const patient = appointment.patient;
  if (!patient.phone) {
    errorResponse(res, 'Patient has no phone number', 400);
    return;
  }

  const reminderTemplate = await prisma.smsTemplate.findUnique({ where: { name: 'APPOINTMENT_REMINDER' } });

  const scheduledDate = new Date(appointment.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = scheduledDate.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  let message: string;
  if (reminderTemplate) {
    message = reminderTemplate.template
      .replace('{{patientName}}', `${patient.firstName} ${patient.lastName}`)
      .replace('{{doctorName}}', 'your doctor')
      .replace('{{date}}', dateStr)
      .replace('{{time}}', timeStr);
  } else {
    message = `Dear ${patient.firstName} ${patient.lastName}, reminder for your appointment on ${dateStr} at ${timeStr}. - iHIMS Hospital`;
  }

  const logEntry = await prisma.smsLog.create({
    data: { recipient: patient.phone, message, templateId: reminderTemplate?.id ?? null, status: 'PENDING' },
  });

  const result = await doSend(patient.phone, message);
  const updated = await prisma.smsLog.update({
    where: { id: logEntry.id },
    data: { status: 'SENT', messageId: result.messageId, sentAt: new Date() },
  });

  successResponse(res, updated, 'Appointment reminder sent');
});
