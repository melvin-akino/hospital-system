import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.service.create({
    data: req.body,
    include: { category: true },
  });
  successResponse(res, service, 'Service created', 201);
});

export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { search, categoryId, isActive } = req.query;

  const where: Record<string, unknown> = {};
  if (isActive !== undefined) where['isActive'] = isActive === 'true';
  else where['isActive'] = true;

  if (search) {
    where['OR'] = [
      { serviceName: { contains: search as string, mode: 'insensitive' } },
      { serviceCode: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where['categoryId'] = categoryId;

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      skip,
      take: limit,
      orderBy: { serviceName: 'asc' },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.service.count({ where }),
  ]);

  paginatedResponse(res, services, total, page, limit);
});

export const getService = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({
    where: { id: req.params['id'] },
    include: { category: true },
  });

  if (!service) {
    errorResponse(res, 'Service not found', 404);
    return;
  }

  successResponse(res, service);
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: req.params['id'] } });
  if (!service) {
    errorResponse(res, 'Service not found', 404);
    return;
  }

  const updated = await prisma.service.update({
    where: { id: req.params['id'] },
    data: req.body,
    include: { category: true },
  });

  successResponse(res, updated, 'Service updated');
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: req.params['id'] } });
  if (!service) {
    errorResponse(res, 'Service not found', 404);
    return;
  }

  await prisma.service.update({
    where: { id: req.params['id'] },
    data: { isActive: false },
  });

  successResponse(res, null, 'Service deactivated');
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { services: true } } },
  });
  successResponse(res, categories);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await prisma.serviceCategory.create({ data: req.body });
  successResponse(res, category, 'Category created', 201);
});

export const bulkUpdatePrices = asyncHandler(async (req: Request, res: Response) => {
  const { updates } = req.body as {
    updates: Array<{ id: string; basePrice: number }>;
  };

  if (!Array.isArray(updates) || updates.length === 0) {
    errorResponse(res, 'No updates provided', 400);
    return;
  }

  const results = await prisma.$transaction(
    updates.map((u) =>
      prisma.service.update({
        where: { id: u.id },
        data: { basePrice: u.basePrice },
      })
    )
  );

  successResponse(res, results, `Updated ${results.length} services`);
});
