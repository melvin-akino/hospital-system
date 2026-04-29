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
  const { category, q, search, isActive } = req.query;
  const term = (search as string) || (q as string) || '';

  const where: Record<string, unknown> = {};
  // default to active only; pass isActive=false to include inactive
  if (isActive !== 'false') where['isActive'] = true;
  if (category) where['category'] = category;
  if (term) {
    where['OR'] = [
      { itemName:  { contains: term, mode: 'insensitive' } },
      { itemCode:  { contains: term, mode: 'insensitive' } },
      { medication: { is: { genericName: { contains: term, mode: 'insensitive' } } } },
      { medication: { is: { brandName:   { contains: term, mode: 'insensitive' } } } },
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
  const { q, all } = req.query;
  const where: Record<string, unknown> = {};
  if (all !== 'true') where['isActive'] = true;
  if (q) where['OR'] = [
    { name:    { contains: q as string, mode: 'insensitive' } },
    { contact: { contains: q as string, mode: 'insensitive' } },
    { email:   { contains: q as string, mode: 'insensitive' } },
  ];

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { inventoryItems: true, purchaseOrders: true } },
    },
  });

  successResponse(res, suppliers);
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params['id'] },
    include: {
      inventoryItems: {
        where: { isActive: true },
        select: { id: true, itemName: true, itemCode: true, currentStock: true, sellingPrice: true },
        orderBy: { itemName: 'asc' },
        take: 20,
      },
      purchaseOrders: {
        orderBy: { orderedAt: 'desc' },
        take: 10,
        select: { id: true, poNumber: true, status: true, orderedAt: true, totalAmount: true },
      },
      _count: { select: { inventoryItems: true, purchaseOrders: true } },
    },
  });

  if (!supplier) { errorResponse(res, 'Supplier not found', 404); return; }
  successResponse(res, supplier);
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { name, contact, phone, email, address } = req.body;
  if (!name) { errorResponse(res, 'Supplier name is required', 400); return; }

  const supplier = await prisma.supplier.create({
    data: { name, contact, phone, email, address },
  });

  successResponse(res, supplier, 'Supplier created', 201);
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.supplier.findUnique({ where: { id: req.params['id'] } });
  if (!existing) { errorResponse(res, 'Supplier not found', 404); return; }

  const { name, contact, phone, email, address, isActive } = req.body;
  const supplier = await prisma.supplier.update({
    where: { id: req.params['id'] },
    data: { name, contact, phone, email, address, ...(isActive !== undefined && { isActive }) },
  });

  successResponse(res, supplier, 'Supplier updated');
});

export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.supplier.findUnique({
    where: { id: req.params['id'] },
    include: { _count: { select: { purchaseOrders: true } } },
  });
  if (!existing) { errorResponse(res, 'Supplier not found', 404); return; }

  // Soft-delete: flag inactive so linked PO history is preserved
  await prisma.supplier.update({
    where: { id: req.params['id'] },
    data: { isActive: false },
  });

  successResponse(res, null, 'Supplier deactivated');
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
  const { status, supplierId } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status;
  if (supplierId) where['supplierId'] = supplierId;

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

export const getPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params['id'] },
    include: {
      supplier: true,
      items: { orderBy: { id: 'asc' } },
    },
  });
  if (!po) { errorResponse(res, 'Purchase order not found', 404); return; }
  successResponse(res, po);
});

export const updatePurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params['id'] } });
  if (!po) { errorResponse(res, 'Purchase order not found', 404); return; }
  if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
    errorResponse(res, `Cannot update a ${po.status} purchase order`, 400); return;
  }

  const { status, notes } = req.body;
  const updated = await prisma.purchaseOrder.update({
    where: { id: req.params['id'] },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: { supplier: { select: { name: true } }, items: true },
  });

  successResponse(res, updated, 'Purchase order updated');
});

/**
 * POST /purchase-orders/:id/receive
 * Marks the PO as RECEIVED, records actual received quantities and costs,
 * and updates inventory stock levels (upserts InventoryItem by item name if match found).
 */
export const receivePurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params['id'] },
    include: { items: true, supplier: true },
  });
  if (!po) { errorResponse(res, 'Purchase order not found', 404); return; }
  if (po.status === 'RECEIVED')  { errorResponse(res, 'PO already received', 400); return; }
  if (po.status === 'CANCELLED') { errorResponse(res, 'Cannot receive a cancelled PO', 400); return; }

  // receivedItems: [{ poItemId, receivedQty, unitCost?, inventoryItemId? }]
  // If inventoryItemId is provided → update that item directly
  // Otherwise → try to find by name/code, then fallback to create
  const { receivedItems = [], notes } = req.body as {
    receivedItems?: Array<{
      poItemId: string;
      receivedQty?: number;
      unitCost?: number;
      inventoryItemId?: string;
      batchNo?: string;
      expiryDate?: string;
    }>;
    notes?: string;
  };

  const result = await prisma.$transaction(async (tx) => {
    const stockUpdates: string[] = [];

    for (const r of receivedItems) {
      const poItem = po.items.find((i) => i.id === r.poItemId);
      if (!poItem) continue;

      const qty = r.receivedQty ?? poItem.quantity;
      const cost = r.unitCost ?? Number(poItem.unitCost);
      if (qty <= 0) continue;

      let invItem = r.inventoryItemId
        ? await tx.inventoryItem.findUnique({ where: { id: r.inventoryItemId } })
        : await tx.inventoryItem.findFirst({
            where: { itemName: { equals: poItem.itemName, mode: 'insensitive' } },
          });

      if (invItem) {
        await tx.inventoryItem.update({
          where: { id: invItem.id },
          data: {
            currentStock: invItem.currentStock + qty,
            unitCost: cost,
            ...(r.batchNo && { batchNo: r.batchNo }),
            ...(r.expiryDate && { expiryDate: new Date(r.expiryDate) }),
            supplierId: po.supplierId,
          },
        });

        // Create a batch/lot record for full traceability
        const receivedBy = (req as any).user?.displayName || (req as any).user?.username;
        await tx.inventoryBatch.create({
          data: {
            inventoryItemId: invItem.id,
            batchNo: r.batchNo || null,
            expiryDate: r.expiryDate ? new Date(r.expiryDate) : null,
            quantityReceived: qty,
            quantityRemaining: qty,
            unitCost: cost,
            poId: po.id,
            poNumber: po.poNumber,
            supplierId: po.supplierId || null,
            supplierName: po.supplier?.name || null,
            status: 'ACTIVE',
            receivedAt: new Date(),
            receivedBy: receivedBy || null,
          },
        });

        stockUpdates.push(`${poItem.itemName}: +${qty}`);
      }
      // If no matching inventory item found, we skip — admin can map it manually
    }

    // Mark PO as received
    const updatedPo = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: 'RECEIVED',
        receivedAt: new Date(),
        ...(notes && { notes: `${po.notes || ''}\nReceived: ${notes}`.trim() }),
      },
      include: { supplier: { select: { name: true } }, items: true },
    });

    return { po: updatedPo, stockUpdates };
  });

  successResponse(res, result, `PO received. Stock updated for: ${result.stockUpdates.join(', ') || 'no matching items found'}`);
});

export const cancelPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params['id'] } });
  if (!po) { errorResponse(res, 'Purchase order not found', 404); return; }
  if (po.status === 'RECEIVED')  { errorResponse(res, 'Cannot cancel a received PO', 400); return; }
  if (po.status === 'CANCELLED') { errorResponse(res, 'PO is already cancelled', 400); return; }

  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: 'CANCELLED' },
    include: { supplier: { select: { name: true } }, items: true },
  });

  successResponse(res, updated, 'Purchase order cancelled');
});

/**
 * GET /inventory/:itemId/batches
 * Returns all batch/lot records for an inventory item, newest first.
 */
export const getInventoryBatches = asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) { errorResponse(res, 'Inventory item not found', 404); return; }

  const batches = await prisma.inventoryBatch.findMany({
    where: { inventoryItemId: itemId },
    orderBy: { receivedAt: 'desc' },
  });

  successResponse(res, { item, batches });
});

/**
 * PUT /inventory/batches/:batchId
 * Update batch status (RECALLED, QUARANTINE, adjust quantityRemaining, add notes).
 */
export const updateInventoryBatch = asyncHandler(async (req: Request, res: Response) => {
  const { batchId } = req.params;
  const batch = await prisma.inventoryBatch.findUnique({ where: { id: batchId } });
  if (!batch) { errorResponse(res, 'Batch not found', 404); return; }

  const { status, quantityRemaining, notes } = req.body;
  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (quantityRemaining !== undefined) data.quantityRemaining = quantityRemaining;
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.inventoryBatch.update({
    where: { id: batchId },
    data,
  });

  // If recalled/quarantined, adjust the parent inventory item's stock
  if ((status === 'RECALLED' || status === 'QUARANTINE') && batch.status === 'ACTIVE') {
    await prisma.inventoryItem.update({
      where: { id: batch.inventoryItemId },
      data: { currentStock: { decrement: batch.quantityRemaining } },
    });
  }

  successResponse(res, updated, `Batch ${updated.batchNo || updated.id} updated`);
});
