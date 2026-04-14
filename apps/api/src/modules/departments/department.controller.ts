import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await prisma.department.create({ data: req.body });
  successResponse(res, department, 'Department created', 201);
});

export const getDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { doctors: true, rooms: true } },
    },
  });
  successResponse(res, departments);
});

export const getDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await prisma.department.findUnique({
    where: { id: req.params['id'] },
    include: {
      doctors: {
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true, specialty: true },
      },
      rooms: { where: { isActive: true } },
    },
  });

  if (!department) {
    errorResponse(res, 'Department not found', 404);
    return;
  }

  successResponse(res, department);
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await prisma.department.findUnique({ where: { id: req.params['id'] } });
  if (!department) {
    errorResponse(res, 'Department not found', 404);
    return;
  }

  const updated = await prisma.department.update({
    where: { id: req.params['id'] },
    data: req.body,
  });

  successResponse(res, updated, 'Department updated');
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await prisma.department.findUnique({ where: { id: req.params['id'] } });
  if (!department) {
    errorResponse(res, 'Department not found', 404);
    return;
  }

  await prisma.department.update({
    where: { id: req.params['id'] },
    data: { isActive: false },
  });

  successResponse(res, null, 'Department deactivated');
});
