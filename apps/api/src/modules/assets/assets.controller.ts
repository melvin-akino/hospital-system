import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

// GET /api/assets/stats — must be registered before /:id
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [totalAssets, totalValueResult, maintenanceDue, byCategory] = await Promise.all([
    prisma.asset.count({ where: { status: { not: 'DISPOSED' } } }),
    prisma.asset.aggregate({ _sum: { currentValue: true }, where: { status: { not: 'DISPOSED' } } }),
    prisma.assetMaintenance.count({
      where: { nextDueDate: { lte: in30Days, gte: now } },
    }),
    prisma.asset.groupBy({
      by: ['category'],
      _count: { _all: true },
      _sum: { currentValue: true },
    }),
  ]);

  successResponse(res, {
    totalAssets,
    totalValue: Number(totalValueResult._sum.currentValue || 0),
    maintenanceDue,
    byCategory: byCategory.map(c => ({
      category: c.category,
      count: c._count._all,
      totalValue: Number(c._sum.currentValue || 0),
    })),
  });
});

// GET /api/assets
export const getAssets = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { category, status, departmentId, search } = req.query;

  const where: Record<string, unknown> = {};
  if (category) where['category'] = category;
  if (status) where['status'] = status;
  if (departmentId) where['departmentId'] = departmentId;
  if (search) {
    where['OR'] = [
      { assetCode: { contains: search as string, mode: 'insensitive' } },
      { assetName: { contains: search as string, mode: 'insensitive' } },
      { serialNo: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { maintenance: true } },
        maintenance: {
          orderBy: { performedAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.asset.count({ where }),
  ]);

  // Attach department names
  const deptIds = [...new Set(assets.filter(a => a.departmentId).map(a => a.departmentId as string))];
  const departments = deptIds.length > 0
    ? await prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
    : [];
  const deptMap = new Map(departments.map(d => [d.id, d]));

  const result = assets.map(a => ({
    ...a,
    department: a.departmentId ? deptMap.get(a.departmentId) || null : null,
  }));

  paginatedResponse(res, result, total, page, limit);
});

// GET /api/assets/:id
export const getAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await prisma.asset.findUnique({
    where: { id: req.params['id'] },
    include: {
      maintenance: { orderBy: { performedAt: 'desc' } },
    },
  });

  if (!asset) {
    errorResponse(res, 'Asset not found', 404);
    return;
  }

  let department = null;
  if (asset.departmentId) {
    department = await prisma.department.findUnique({
      where: { id: asset.departmentId },
      select: { id: true, name: true },
    });
  }

  successResponse(res, { ...asset, department });
});

// POST /api/assets
export const createAsset = asyncHandler(async (req: Request, res: Response) => {
  const { assetCode, assetName, category, departmentId, purchaseDate, purchaseCost, serialNo, location, notes } = req.body;

  const existing = await prisma.asset.findUnique({ where: { assetCode } });
  if (existing) {
    errorResponse(res, `Asset code ${assetCode} already exists`, 400);
    return;
  }

  const cost = purchaseCost || 0;

  const asset = await prisma.asset.create({
    data: {
      assetCode,
      assetName,
      category,
      departmentId,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchaseCost: cost,
      currentValue: cost,
      serialNo,
      location,
      notes,
      status: 'ACTIVE',
    },
  });

  successResponse(res, asset, 'Asset registered', 201);
});

// PUT /api/assets/:id
export const updateAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await prisma.asset.findUnique({ where: { id: req.params['id'] } });
  if (!asset) {
    errorResponse(res, 'Asset not found', 404);
    return;
  }

  const updated = await prisma.asset.update({
    where: { id: req.params['id'] },
    data: req.body,
  });

  successResponse(res, updated, 'Asset updated');
});

// GET /api/assets/:id/maintenance
export const getMaintenanceHistory = asyncHandler(async (req: Request, res: Response) => {
  const asset = await prisma.asset.findUnique({ where: { id: req.params['id'] } });
  if (!asset) {
    errorResponse(res, 'Asset not found', 404);
    return;
  }

  const history = await prisma.assetMaintenance.findMany({
    where: { assetId: req.params['id'] },
    orderBy: { performedAt: 'desc' },
  });

  successResponse(res, history);
});

// POST /api/assets/:id/maintenance
export const logMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { type, description, cost, performedAt, nextDueDate, performedBy } = req.body;

  const asset = await prisma.asset.findUnique({ where: { id: req.params['id'] } });
  if (!asset) {
    errorResponse(res, 'Asset not found', 404);
    return;
  }

  const maintenance = await prisma.assetMaintenance.create({
    data: {
      assetId: req.params['id'],
      type,
      description,
      cost: cost || 0,
      performedAt: performedAt ? new Date(performedAt) : new Date(),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      performedBy,
    },
  });

  // Update asset status if maintenance type is corrective/emergency
  if (type === 'CORRECTIVE' || type === 'EMERGENCY') {
    await prisma.asset.update({
      where: { id: req.params['id'] },
      data: { status: 'ACTIVE' },
    });
  }

  successResponse(res, maintenance, 'Maintenance logged', 201);
});

// POST /api/assets/:id/depreciate
export const depreciate = asyncHandler(async (req: Request, res: Response) => {
  const { depreciationRate, method = 'STRAIGHT_LINE' } = req.body;

  const asset = await prisma.asset.findUnique({ where: { id: req.params['id'] } });
  if (!asset) {
    errorResponse(res, 'Asset not found', 404);
    return;
  }

  const purchaseCost = Number(asset.purchaseCost);
  const currentValue = Number(asset.currentValue);

  let depreciationAmount = 0;

  if (method === 'STRAIGHT_LINE') {
    depreciationAmount = purchaseCost * (depreciationRate / 100);
  } else {
    // Declining balance
    depreciationAmount = currentValue * (depreciationRate / 100);
  }

  const newValue = Math.max(0, currentValue - depreciationAmount);

  const updated = await prisma.asset.update({
    where: { id: req.params['id'] },
    data: { currentValue: newValue },
  });

  // Log as maintenance entry for audit trail
  await prisma.assetMaintenance.create({
    data: {
      assetId: req.params['id'],
      type: 'DEPRECIATION',
      description: `Depreciation applied: ${method} @ ${depreciationRate}% — ₱${depreciationAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} deducted`,
      cost: depreciationAmount,
      performedAt: new Date(),
    },
  });

  successResponse(res, {
    ...updated,
    depreciationAmount: parseFloat(depreciationAmount.toFixed(2)),
    previousValue: currentValue,
    newValue: parseFloat(newValue.toFixed(2)),
  }, `Depreciation of ₱${depreciationAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} applied`);
});
