import { Request } from 'express';
import { prisma } from '../lib/prisma';

export async function logAudit(
  req: Request,
  action: string,
  module: string,
  recordId?: string,
  details?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        username: req.user?.username,
        action,
        module,
        recordId: recordId ?? null,
        details: details ?? null,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });
  } catch {
    // Audit logging is non-fatal
  }
}
