import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

const TEMPLATES_FILE = path.join(__dirname, '../../../data/sms-templates.json');
const LOGS_FILE = path.join(__dirname, '../../../data/sms-logs.json');

interface SmsTemplate {
  id: string;
  name: string;
  template: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface SmsLog {
  id: string;
  recipient: string;
  message: string;
  templateId: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  messageId: string | null;
  createdAt: string;
  sentAt: string | null;
}

function readTemplates(): SmsTemplate[] {
  if (!fs.existsSync(TEMPLATES_FILE)) return [];
  return JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf-8'));
}

function writeTemplates(data: SmsTemplate[]): void {
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2));
}

function readLogs(): SmsLog[] {
  if (!fs.existsSync(LOGS_FILE)) return [];
  return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
}

function writeLogs(data: SmsLog[]): void {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(data, null, 2));
}

const DEFAULT_TEMPLATES: Omit<SmsTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'APPOINTMENT_REMINDER',
    category: 'APPOINTMENT',
    template:
      'Dear {{patientName}}, this is a reminder for your appointment with Dr. {{doctorName}} on {{date}} at {{time}}. Please arrive 15 minutes early. - iHIMS Hospital',
  },
  {
    name: 'LAB_RESULT_READY',
    category: 'LABORATORY',
    template:
      'Dear {{patientName}}, your laboratory results are now available. Please visit the hospital or check your patient portal. - iHIMS Hospital',
  },
  {
    name: 'BILL_READY',
    category: 'BILLING',
    template:
      'Dear {{patientName}}, your bill ({{billNo}}) of {{amount}} is ready for payment. - iHIMS Hospital',
  },
  {
    name: 'PRESCRIPTION_READY',
    category: 'PHARMACY',
    template:
      'Dear {{patientName}}, your prescription is ready for pickup at our pharmacy. - iHIMS Hospital',
  },
  {
    name: 'APPOINTMENT_CONFIRMED',
    category: 'APPOINTMENT',
    template:
      'Dear {{patientName}}, your appointment with Dr. {{doctorName}} on {{date}} has been confirmed. Room code: {{roomCode}}. - iHIMS Hospital',
  },
];

function seedTemplates(): void {
  const existing = readTemplates();
  if (existing.length === 0) {
    const seeded: SmsTemplate[] = DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    writeTemplates(seeded);
  }
}

// Real Semaphore SMS send (falls back to simulation if API key not set)
import { sendSms as semaphoreSend } from './sms.service';

async function doSend(
  recipient: string,
  message: string
): Promise<{ messageId: string; status: string }> {
  return semaphoreSend(recipient, message);
}

// Seed on module load
seedTemplates();

export const getTemplates = asyncHandler(async (req: Request, res: Response) => {
  const templates = readTemplates();
  successResponse(res, templates);
});

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { name, template, category } = req.body;
  if (!name || !template || !category) {
    errorResponse(res, 'name, template, and category are required', 400);
    return;
  }
  const templates = readTemplates();
  const newTemplate: SmsTemplate = {
    id: uuidv4(),
    name,
    template,
    category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  writeTemplates(templates);
  successResponse(res, newTemplate, 'Template created', 201);
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const templates = readTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) {
    errorResponse(res, 'Template not found', 404);
    return;
  }
  const { name, template, category } = req.body;
  templates[idx] = {
    ...templates[idx],
    ...(name && { name }),
    ...(template && { template }),
    ...(category && { category }),
    updatedAt: new Date().toISOString(),
  };
  writeTemplates(templates);
  successResponse(res, templates[idx]);
});

export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const templates = readTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) {
    errorResponse(res, 'Template not found', 404);
    return;
  }
  templates.splice(idx, 1);
  writeTemplates(templates);
  successResponse(res, null, 'Template deleted');
});

export const sendSms = asyncHandler(async (req: Request, res: Response) => {
  const { recipient, message, templateId } = req.body;
  if (!recipient || !message) {
    errorResponse(res, 'recipient and message are required', 400);
    return;
  }

  const logs = readLogs();
  const logEntry: SmsLog = {
    id: uuidv4(),
    recipient,
    message,
    templateId: templateId || null,
    status: 'PENDING',
    messageId: null,
    createdAt: new Date().toISOString(),
    sentAt: null,
  };
  logs.push(logEntry);
  writeLogs(logs);

  try {
    const result = await doSend(recipient, message);
    const allLogs = readLogs();
    const idx = allLogs.findIndex((l) => l.id === logEntry.id);
    if (idx !== -1) {
      allLogs[idx].status = 'SENT';
      allLogs[idx].messageId = result.messageId;
      allLogs[idx].sentAt = new Date().toISOString();
      writeLogs(allLogs);
      logEntry.status = 'SENT';
      logEntry.messageId = result.messageId;
      logEntry.sentAt = allLogs[idx].sentAt;
    }
    successResponse(res, logEntry, 'SMS sent successfully');
  } catch {
    const allLogs = readLogs();
    const idx = allLogs.findIndex((l) => l.id === logEntry.id);
    if (idx !== -1) {
      allLogs[idx].status = 'FAILED';
      writeLogs(allLogs);
    }
    errorResponse(res, 'Failed to send SMS', 500);
  }
});

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

  const logs = readLogs();
  const results: SmsLog[] = [];

  for (const recipient of recipients) {
    const logEntry: SmsLog = {
      id: uuidv4(),
      recipient,
      message,
      templateId: templateId || null,
      status: 'PENDING',
      messageId: null,
      createdAt: new Date().toISOString(),
      sentAt: null,
    };
    logs.push(logEntry);
    try {
      const result = await doSend(recipient, message);
      logEntry.status = 'SENT';
      logEntry.messageId = result.messageId;
      logEntry.sentAt = new Date().toISOString();
      const idx = logs.findIndex((l) => l.id === logEntry.id);
      if (idx !== -1) {
        logs[idx] = logEntry;
      }
    } catch {
      logEntry.status = 'FAILED';
      const idx = logs.findIndex((l) => l.id === logEntry.id);
      if (idx !== -1) {
        logs[idx] = logEntry;
      }
    }
    results.push(logEntry);
  }

  writeLogs(logs);
  successResponse(res, {
    total: results.length,
    sent: results.filter((r) => r.status === 'SENT').length,
    failed: results.filter((r) => r.status === 'FAILED').length,
    results,
  });
});

export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const { status, dateFrom, dateTo, recipient } = req.query;
  let logs = readLogs();

  if (status) {
    logs = logs.filter((l) => l.status === status);
  }
  if (recipient) {
    logs = logs.filter((l) =>
      l.recipient.toLowerCase().includes((recipient as string).toLowerCase())
    );
  }
  if (dateFrom) {
    logs = logs.filter((l) => new Date(l.createdAt) >= new Date(dateFrom as string));
  }
  if (dateTo) {
    logs = logs.filter((l) => new Date(l.createdAt) <= new Date(dateTo as string));
  }

  // newest first
  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  successResponse(res, logs);
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const logs = readLogs();
  const templates = readTemplates();
  const today = new Date().toISOString().split('T')[0];

  const stats = {
    totalSent: logs.filter((l) => l.status === 'SENT').length,
    delivered: logs.filter((l) => l.status === 'SENT').length,
    failed: logs.filter((l) => l.status === 'FAILED').length,
    pendingCount: logs.filter((l) => l.status === 'PENDING').length,
    todayCount: logs.filter((l) => l.createdAt.startsWith(today)).length,
    templateCount: templates.length,
  };

  successResponse(res, stats);
});

export const sendAppointmentReminder = asyncHandler(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
    },
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

  const templates = readTemplates();
  const reminderTemplate = templates.find((t) => t.name === 'APPOINTMENT_REMINDER');

  const scheduledDate = new Date(appointment.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = scheduledDate.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });

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

  const logs = readLogs();
  const logEntry: SmsLog = {
    id: uuidv4(),
    recipient: patient.phone,
    message,
    templateId: reminderTemplate?.id || null,
    status: 'PENDING',
    messageId: null,
    createdAt: new Date().toISOString(),
    sentAt: null,
  };
  logs.push(logEntry);

  const result = await doSend(patient.phone, message);
  logEntry.status = 'SENT';
  logEntry.messageId = result.messageId;
  logEntry.sentAt = new Date().toISOString();
  const idx = logs.findIndex((l) => l.id === logEntry.id);
  if (idx !== -1) logs[idx] = logEntry;
  writeLogs(logs);

  successResponse(res, logEntry, 'Appointment reminder sent');
});
