import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const role = req.query.role as string;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  paginatedResponse(res, users, total, page, limit);
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
  });
  if (!user) { errorResponse(res, 'User not found', 404); return; }
  successResponse(res, user);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;

  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) { errorResponse(res, 'Username or email already exists', 409); return; }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, passwordHash, role },
    select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
  });

  // Audit
  await prisma.auditLog.create({
    data: { userId: req.user?.id, username: req.user?.username, action: 'CREATE', module: 'users', recordId: user.id, details: `Created user ${username}` },
  });

  successResponse(res, user, 'User created', 201);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, role, password } = req.body;

  const data: Record<string, unknown> = {};
  if (username) data.username = username;
  if (email) data.email = email;
  if (role) data.role = role;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, username: true, email: true, role: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: { userId: req.user?.id, username: req.user?.username, action: 'UPDATE', module: 'users', recordId: user.id, details: `Updated user ${user.username}` },
  });

  successResponse(res, user, 'User updated');
});

export const toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) { errorResponse(res, 'User not found', 404); return; }

  // Prevent deactivating yourself
  if (existing.id === req.user?.id) { errorResponse(res, 'Cannot deactivate your own account', 400); return; }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !existing.isActive },
    select: { id: true, username: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: { userId: req.user?.id, username: req.user?.username, action: 'UPDATE', module: 'users', recordId: user.id, details: `${user.isActive ? 'Activated' : 'Deactivated'} user ${user.username}` },
  });

  successResponse(res, user, `User ${user.isActive ? 'activated' : 'deactivated'}`);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) { errorResponse(res, 'User not found', 404); return; }
  if (existing.id === req.user?.id) { errorResponse(res, 'Cannot delete your own account', 400); return; }

  await prisma.user.delete({ where: { id: req.params.id } });

  await prisma.auditLog.create({
    data: { userId: req.user?.id, username: req.user?.username, action: 'DELETE', module: 'users', recordId: req.params.id, details: `Deleted user ${existing.username}` },
  });

  successResponse(res, null, 'User deleted');
});
