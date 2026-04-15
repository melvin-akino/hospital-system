import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { paginatedResponse } from '../../utils/response';

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const module = req.query.module as string;
  const action = req.query.action as string;
  const username = req.query.username as string;
  const from = req.query.from as string;
  const to = req.query.to as string;

  const where: Record<string, unknown> = {};
  if (module) where.module = module;
  if (action) where.action = action;
  if (username) where.username = { contains: username, mode: 'insensitive' };
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  paginatedResponse(res, logs, total, page, limit);
});
