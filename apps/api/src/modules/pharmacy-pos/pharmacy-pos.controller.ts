import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';
import { logAudit } from '../../utils/audit';

// ── Account codes (must match seeded chart of accounts) ──────────────────────
const ACC = {
  CASH:            '1000', // Cash on Hand
  AR:              '1100', // Accounts Receivable
  HMO_RECEIVABLE:  '1120', // HMO Receivable
  PH_RECEIVABLE:   '1130', // PhilHealth Receivable
  INVENTORY:       '1210', // Pharmacy Inventory
  PHARMACY_REV:    '4400', // Pharmacy Revenue
  COGS:            '5200', // Pharmacy Cost of Goods
};

// Generate sale number: PS-YYYYMMDD-XXXX
const generateSaleNo = async (): Promise<string> => {
  const today = new Date();
  const prefix = `PS-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await prisma.pharmacySale.count({
    where: { saleNo: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

// Generate GL entry number
const generateEntryNo = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.glEntry.count();
  return `JE-${year}-${String(count + 1).padStart(6, '0')}`;
};

// Resolve account id by code
const getAccountId = async (code: string): Promise<string | null> => {
  const acc = await prisma.chartOfAccounts.findUnique({ where: { accountCode: code } });
  return acc?.id ?? null;
};

// ── POST /pharmacy/pos/sales ─────────────────────────────────────────────────
export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const {
    type = 'CASH',
    patientId,
    admissionId,
    paymentMethod = 'CASH',
    amountTendered,
    items,          // [{ inventoryItemId, quantity, unitPrice, discount }]
    notes,
    referenceNo,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    errorResponse(res, 'Cart items are required', 400);
    return;
  }

  // ── 1. Validate all inventory items and stock ────────────────────────────
  const inventoryIds = items.map((i: any) => i.inventoryItemId);
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { id: { in: inventoryIds }, isActive: true },
    include: { medication: { select: { genericName: true } } },
  });

  if (inventoryItems.length !== inventoryIds.length) {
    errorResponse(res, 'One or more inventory items not found', 404);
    return;
  }

  const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));
  for (const item of items) {
    const inv = itemMap.get(item.inventoryItemId);
    if (!inv) { errorResponse(res, `Item not found: ${item.inventoryItemId}`, 404); return; }
    if (inv.currentStock < item.quantity) {
      errorResponse(res, `Insufficient stock for ${inv.itemName}. Available: ${inv.currentStock}`, 400);
      return;
    }
  }

  // ── 2. Calculate totals ─────────────────────────────────────────────────
  const lineItems = items.map((item: any) => {
    const inv = itemMap.get(item.inventoryItemId)!;
    const unitPrice = Number(item.unitPrice ?? inv.sellingPrice);
    const discount  = Number(item.discount ?? 0);
    const total     = unitPrice * item.quantity - discount;
    return {
      inventoryItemId: inv.id,
      itemName:        inv.itemName,
      itemCode:        inv.itemCode,
      genericName:     inv.medication?.genericName ?? null,
      unit:            inv.unit ?? null,
      quantity:        item.quantity,
      unitPrice,
      costAtSale:      Number(inv.unitCost),
      discount,
      total,
    };
  });

  const subtotal      = lineItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountTotal = lineItems.reduce((s, i) => s + i.discount, 0);
  const totalAmount   = lineItems.reduce((s, i) => s + i.total, 0);
  const totalCOGS     = lineItems.reduce((s, i) => s + i.costAtSale * i.quantity, 0);
  const changeGiven   = amountTendered != null ? Math.max(0, Number(amountTendered) - totalAmount) : null;

  // ── 3. Resolve GL account IDs ───────────────────────────────────────────
  const debitAccCode = type === 'HMO' ? ACC.HMO_RECEIVABLE
    : type === 'PHILHEALTH'           ? ACC.PH_RECEIVABLE
    : type === 'CHARGE_TO_BILL'       ? ACC.AR
    : ACC.CASH;

  const [debitAccId, revenueAccId, cogsAccId, inventoryAccId] = await Promise.all([
    getAccountId(debitAccCode),
    getAccountId(ACC.PHARMACY_REV),
    getAccountId(ACC.COGS),
    getAccountId(ACC.INVENTORY),
  ]);

  if (!revenueAccId || !cogsAccId || !inventoryAccId) {
    errorResponse(res, 'Required GL accounts not found. Run seed first.', 500);
    return;
  }

  const saleNo    = await generateSaleNo();
  const entryNo1  = await generateEntryNo();
  const entryNo2  = `${entryNo1}-B`;
  const now       = new Date();
  const cashierName = (user as any).displayName ?? user.username;

  // ── 4. Atomic transaction ───────────────────────────────────────────────
  const sale = await prisma.$transaction(async (tx) => {
    // a) Create the sale
    const newSale = await tx.pharmacySale.create({
      data: {
        saleNo,
        type,
        patientId:      patientId ?? null,
        admissionId:    admissionId ?? null,
        cashierId:      user.id,
        cashierName,
        subtotal,
        discountTotal,
        totalAmount,
        paymentMethod,
        amountTendered: amountTendered != null ? Number(amountTendered) : null,
        changeGiven,
        notes:          notes ?? null,
        referenceNo:    referenceNo ?? null,
        glPosted:       true,
        status:         'COMPLETED',
      },
    });

    // b) Create sale line items
    await tx.pharmacySaleItem.createMany({
      data: lineItems.map((li) => ({ ...li, saleId: newSale.id })),
    });

    // c) Deduct inventory stock
    for (const li of lineItems) {
      await tx.inventoryItem.update({
        where: { id: li.inventoryItemId },
        data:  { currentStock: { decrement: li.quantity } },
      });
    }

    // d) GL Entry 1: Revenue recognition
    //    DR Cash/AR/HMO  | CR Pharmacy Revenue
    if (debitAccId) {
      await tx.glEntry.create({
        data: {
          entryNo:     entryNo1,
          accountId:   debitAccId,
          description: `Pharmacy sale ${saleNo} — revenue`,
          debit:       totalAmount,
          credit:      0,
          referenceNo: saleNo,
          entryDate:   now,
          createdBy:   cashierName,
        },
      });
    }
    await tx.glEntry.create({
      data: {
        entryNo:     debitAccId ? `${entryNo1}-CR` : entryNo1,
        accountId:   revenueAccId,
        description: `Pharmacy sale ${saleNo} — revenue`,
        debit:       0,
        credit:      totalAmount,
        referenceNo: saleNo,
        entryDate:   now,
        createdBy:   cashierName,
      },
    });

    // e) GL Entry 2: Cost of Goods Sold
    //    DR COGS | CR Pharmacy Inventory
    if (totalCOGS > 0) {
      await tx.glEntry.create({
        data: {
          entryNo:     entryNo2,
          accountId:   cogsAccId,
          description: `Pharmacy sale ${saleNo} — COGS`,
          debit:       totalCOGS,
          credit:      0,
          referenceNo: saleNo,
          entryDate:   now,
          createdBy:   cashierName,
        },
      });
      await tx.glEntry.create({
        data: {
          entryNo:     `${entryNo2}-CR`,
          accountId:   inventoryAccId,
          description: `Pharmacy sale ${saleNo} — COGS`,
          debit:       0,
          credit:      totalCOGS,
          referenceNo: saleNo,
          entryDate:   now,
          createdBy:   cashierName,
        },
      });
    }

    // f) If CHARGE_TO_BILL: find active bill and create bill items
    if (type === 'CHARGE_TO_BILL' && patientId) {
      const activeBill = await tx.bill.findFirst({
        where: { patientId, status: { in: ['DRAFT', 'PARTIAL'] } },
        orderBy: { createdAt: 'desc' },
      });

      if (activeBill) {
        await tx.billItem.createMany({
          data: lineItems.map((li) => ({
            billId:          activeBill.id,
            description:     `${li.itemName}${li.genericName ? ` (${li.genericName})` : ''}`,
            quantity:        li.quantity,
            unitPrice:       li.unitPrice,
            discount:        li.discount,
            total:           li.total,
            departmentName:  'Pharmacy',
          })),
        });

        // Recalculate bill total
        const allItems = await tx.billItem.findMany({ where: { billId: activeBill.id } });
        const newSubtotal = allItems.reduce((s, i) => s + Number(i.total), 0);
        await tx.bill.update({
          where: { id: activeBill.id },
          data:  { subtotal: newSubtotal, totalAmount: newSubtotal },
        });

        await tx.pharmacySale.update({
          where: { id: newSale.id },
          data:  { billId: activeBill.id },
        });
      }
    }

    return newSale;
  });

  // Return full sale with items
  const fullSale = await prisma.pharmacySale.findUnique({
    where:   { id: sale.id },
    include: { items: true, patient: { select: { firstName: true, lastName: true, patientNo: true } } },
  });

  await logAudit(req, 'CREATE', 'pharmacy_sales', sale.id, `Sale ${saleNo} — ₱${totalAmount.toFixed(2)}`);
  res.status(201).json({ success: true, data: fullSale });
});

// ── GET /pharmacy/pos/sales ──────────────────────────────────────────────────
export const getSales = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status, type, cashierId, dateFrom, dateTo, patientId } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = {};
  if (status)    where.status    = status;
  if (type)      where.type      = type;
  if (cashierId) where.cashierId = cashierId;
  if (patientId) where.patientId = patientId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo)   where.createdAt.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
  }

  const [data, total] = await Promise.all([
    prisma.pharmacySale.findMany({
      where,
      skip,
      take:    parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        items:   true,
        patient: { select: { firstName: true, lastName: true, patientNo: true } },
      },
    }),
    prisma.pharmacySale.count({ where }),
  ]);

  res.json({ success: true, data: { data, total, page: parseInt(page), limit: parseInt(limit) } });
});

// ── GET /pharmacy/pos/sales/:id ──────────────────────────────────────────────
export const getSale = asyncHandler(async (req: Request, res: Response) => {
  const sale = await prisma.pharmacySale.findUnique({
    where:   { id: req.params['id'] },
    include: {
      items:   true,
      patient: { select: { firstName: true, lastName: true, patientNo: true, dateOfBirth: true } },
    },
  });
  if (!sale) { errorResponse(res, 'Sale not found', 404); return; }
  successResponse(res, sale);
});

// ── GET /pharmacy/pos/z-report ───────────────────────────────────────────────
export const getZReport = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };
  const target = date ? new Date(date) : new Date();
  const start  = new Date(target); start.setHours(0, 0, 0, 0);
  const end    = new Date(target); end.setHours(23, 59, 59, 999);

  const sales = await prisma.pharmacySale.findMany({
    where:   { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
    include: { items: true },
  });

  const totalSales  = sales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const totalCOGS   = sales.reduce((s, x) => s + x.items.reduce((si, i) => si + Number(i.costAtSale) * i.quantity, 0), 0);
  const totalDisc   = sales.reduce((s, x) => s + Number(x.discountTotal), 0);
  const grossProfit = totalSales - totalCOGS;
  const margin      = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  // Breakdown by payment type
  const byType: Record<string, { count: number; amount: number }> = {};
  for (const s of sales) {
    const k = s.paymentMethod;
    if (!byType[k]) byType[k] = { count: 0, amount: 0 };
    byType[k].count++;
    byType[k].amount += Number(s.totalAmount);
  }

  // Top items by quantity sold
  const itemTotals: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const s of sales) {
    for (const item of s.items) {
      if (!itemTotals[item.itemCode]) itemTotals[item.itemCode] = { name: item.itemName, qty: 0, revenue: 0 };
      itemTotals[item.itemCode].qty     += item.quantity;
      itemTotals[item.itemCode].revenue += Number(item.total);
    }
  }
  const topItems = Object.values(itemTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Hourly breakdown
  const hourly: number[] = Array(24).fill(0);
  for (const s of sales) {
    hourly[new Date(s.createdAt).getHours()] += Number(s.totalAmount);
  }

  successResponse(res, {
    date:         start.toISOString().split('T')[0],
    totalTransactions: sales.length,
    totalSales,
    totalCOGS,
    totalDiscounts: totalDisc,
    grossProfit,
    grossMarginPct: Math.round(margin * 100) / 100,
    byPaymentType:  byType,
    topItems,
    hourlyBreakdown: hourly,
  });
});

// ── POST /pharmacy/pos/sales/:id/void ───────────────────────────────────────
export const voidSale = asyncHandler(async (req: Request, res: Response) => {
  const { voidReason } = req.body;
  const sale = await prisma.pharmacySale.findUnique({
    where:   { id: req.params['id'] },
    include: { items: true },
  });

  if (!sale)                  { errorResponse(res, 'Sale not found', 404); return; }
  if (sale.status === 'VOIDED') { errorResponse(res, 'Sale already voided', 400); return; }

  const totalCOGS   = sale.items.reduce((s, i) => s + Number(i.costAtSale) * i.quantity, 0);
  const entryNoBase = await generateEntryNo();
  const now         = new Date();
  const user        = req.user!;
  const cashierName = (user as any).displayName ?? user.username;

  const [debitAccId, revenueAccId, cogsAccId, inventoryAccId] = await Promise.all([
    getAccountId(
      sale.type === 'HMO' ? ACC.HMO_RECEIVABLE :
      sale.type === 'PHILHEALTH' ? ACC.PH_RECEIVABLE :
      sale.type === 'CHARGE_TO_BILL' ? ACC.AR : ACC.CASH
    ),
    getAccountId(ACC.PHARMACY_REV),
    getAccountId(ACC.COGS),
    getAccountId(ACC.INVENTORY),
  ]);

  await prisma.$transaction(async (tx) => {
    // Mark voided
    await tx.pharmacySale.update({
      where: { id: sale.id },
      data:  { status: 'VOIDED', voidReason: voidReason ?? null, voidedAt: now },
    });

    // Restore inventory
    for (const item of sale.items) {
      await tx.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data:  { currentStock: { increment: item.quantity } },
      });
    }

    // Reversing GL entries — Revenue reversal
    if (debitAccId) {
      await tx.glEntry.create({
        data: { entryNo: entryNoBase, accountId: debitAccId, description: `VOID ${sale.saleNo}`, debit: 0, credit: Number(sale.totalAmount), referenceNo: sale.saleNo, entryDate: now, createdBy: cashierName },
      });
    }
    if (revenueAccId) {
      await tx.glEntry.create({
        data: { entryNo: `${entryNoBase}-CR`, accountId: revenueAccId, description: `VOID ${sale.saleNo}`, debit: Number(sale.totalAmount), credit: 0, referenceNo: sale.saleNo, entryDate: now, createdBy: cashierName },
      });
    }
    // Reversing COGS
    if (totalCOGS > 0 && cogsAccId && inventoryAccId) {
      await tx.glEntry.create({
        data: { entryNo: `${entryNoBase}-B`, accountId: cogsAccId, description: `VOID ${sale.saleNo} — COGS`, debit: 0, credit: totalCOGS, referenceNo: sale.saleNo, entryDate: now, createdBy: cashierName },
      });
      await tx.glEntry.create({
        data: { entryNo: `${entryNoBase}-B-CR`, accountId: inventoryAccId, description: `VOID ${sale.saleNo} — COGS`, debit: totalCOGS, credit: 0, referenceNo: sale.saleNo, entryDate: now, createdBy: cashierName },
      });
    }
  });

  await logAudit(req, 'VOID', 'pharmacy_sales', sale.id, `Voided ${sale.saleNo}: ${voidReason}`);
  res.json({ success: true, message: `Sale ${sale.saleNo} voided. GL reversals posted.` });
});
