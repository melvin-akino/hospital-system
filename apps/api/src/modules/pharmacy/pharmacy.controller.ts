import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response';
import { getPagination } from '../../utils/pagination';

// ============ MEDICATIONS ============

export const getMedications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { q } = req.query;

  const where: Record<string, unknown> = { isActive: true };
  if (q) {
    where['OR'] = [
      { genericName: { contains: q as string, mode: 'insensitive' } },
      { brandName: { contains: q as string, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.medication.findMany({
      where,
      skip,
      take: limit,
      orderBy: { genericName: 'asc' },
      include: {
        inventoryItems: {
          where: { isActive: true },
          select: { currentStock: true, sellingPrice: true, expiryDate: true },
          take: 1,
        },
      },
    }),
    prisma.medication.count({ where }),
  ]);

  paginatedResponse(res, data, total, page, limit);
});

export const getMedication = asyncHandler(async (req: Request, res: Response) => {
  const medication = await prisma.medication.findUnique({
    where: { id: req.params['id'] },
    include: {
      inventoryItems: { where: { isActive: true } },
    },
  });

  if (!medication) {
    errorResponse(res, 'Medication not found', 404);
    return;
  }

  successResponse(res, medication);
});

export const createMedication = asyncHandler(async (req: Request, res: Response) => {
  const medication = await prisma.medication.create({
    data: req.body,
  });

  successResponse(res, medication, 'Medication created', 201);
});

export const updateMedication = asyncHandler(async (req: Request, res: Response) => {
  const medication = await prisma.medication.findUnique({ where: { id: req.params['id'] } });
  if (!medication) {
    errorResponse(res, 'Medication not found', 404);
    return;
  }

  const updated = await prisma.medication.update({
    where: { id: req.params['id'] },
    data: req.body,
  });

  successResponse(res, updated, 'Medication updated');
});

export const checkInteractions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { with: withParam } = req.query;

  if (!withParam) {
    successResponse(res, []);
    return;
  }

  const drugIds = (withParam as string).split(',').filter(Boolean);

  const interactions = await prisma.drugInteraction.findMany({
    where: {
      OR: [
        { drug1Id: id, drug2Id: { in: drugIds } },
        { drug2Id: id, drug1Id: { in: drugIds } },
      ],
    },
    include: {
      drug1: { select: { genericName: true, brandName: true } },
      drug2: { select: { genericName: true, brandName: true } },
    },
  });

  successResponse(res, interactions);
});

// ============ INVENTORY ============

export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { category, q } = req.query;

  const where: Record<string, unknown> = { isActive: true };
  if (category) where['category'] = category;
  if (q) {
    where['OR'] = [
      { itemName: { contains: q as string, mode: 'insensitive' } },
      { itemCode: { contains: q as string, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { itemName: 'asc' },
      include: {
        medication: { select: { genericName: true, brandName: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  paginatedResponse(res, data, total, page, limit);
});

export const getInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: req.params['id'] },
    include: {
      medication: true,
      supplier: true,
    },
  });

  if (!item) {
    errorResponse(res, 'Inventory item not found', 404);
    return;
  }

  successResponse(res, item);
});

export const createInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.inventoryItem.create({
    data: {
      ...req.body,
      ...(req.body.expiryDate && { expiryDate: new Date(req.body.expiryDate) }),
    },
  });

  successResponse(res, item, 'Inventory item created', 201);
});

export const updateInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await prisma.inventoryItem.findUnique({ where: { id: req.params['id'] } });
  if (!item) {
    errorResponse(res, 'Inventory item not found', 404);
    return;
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: req.params['id'] },
    data: {
      ...req.body,
      ...(req.body.expiryDate && { expiryDate: new Date(req.body.expiryDate) }),
    },
  });

  successResponse(res, updated, 'Inventory item updated');
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { adjustment, reason } = req.body;

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) {
    errorResponse(res, 'Inventory item not found', 404);
    return;
  }

  const newStock = item.currentStock + parseInt(adjustment);
  if (newStock < 0) {
    errorResponse(res, 'Insufficient stock', 400);
    return;
  }

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { currentStock: newStock },
  });

  successResponse(res, { ...updated, adjustment, reason }, 'Stock adjusted');
});

export const getLowStockAlerts = asyncHandler(async (req: Request, res: Response) => {
  const items = await prisma.inventoryItem.findMany({
    where: {
      isActive: true,
    },
    include: {
      medication: { select: { genericName: true, brandName: true } },
      supplier: { select: { name: true, phone: true } },
    },
    orderBy: { currentStock: 'asc' },
  });

  const lowStock = items.filter((item) => item.currentStock <= item.minimumStock);
  successResponse(res, lowStock);
});

export const getExpiryAlerts = asyncHandler(async (req: Request, res: Response) => {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const items = await prisma.inventoryItem.findMany({
    where: {
      isActive: true,
      expiryDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
    },
    include: {
      medication: { select: { genericName: true, brandName: true } },
      supplier: { select: { name: true, phone: true } },
    },
    orderBy: { expiryDate: 'asc' },
  });

  successResponse(res, items);
});

// ============ SUPPLIERS ============

export const getSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  successResponse(res, suppliers);
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.create({
    data: req.body,
  });

  successResponse(res, supplier, 'Supplier created', 201);
});

// ============ PURCHASE ORDERS ============

const generatePoNumber = async (): Promise<string> => {
  const today = new Date();
  const prefix = `PO${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.purchaseOrder.count({
    where: { poNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

export const createPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const { supplierId, notes, items } = req.body;

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    errorResponse(res, 'Supplier not found', 404);
    return;
  }

  const poNumber = await generatePoNumber();
  const totalAmount = (items as Array<{ unitCost: number; quantity: number }>).reduce(
    (sum, item) => sum + item.unitCost * item.quantity,
    0
  );

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId,
      notes,
      totalAmount,
      items: {
        create: (items as Array<{ itemName: string; quantity: number; unitCost: number }>).map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.unitCost * item.quantity,
        })),
      },
    },
    include: {
      items: true,
      supplier: { select: { name: true, phone: true } },
    },
  });

  successResponse(res, po, 'Purchase order created', 201);
});

export const getPurchaseOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req);
  const { status } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;

  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { orderedAt: 'desc' },
      include: {
        supplier: { select: { name: true } },
        items: true,
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  paginatedResponse(res, data, total, page, limit);
});
