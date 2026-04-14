import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../lib/prisma';
import { successResponse, errorResponse } from '../../utils/response';

// Generate unique GL entry number
const generateEntryNo = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.glEntry.count();
  return `JE-${year}-${String(count + 1).padStart(6, '0')}`;
};

// GET /api/chart-of-accounts
export const getChartOfAccounts = asyncHandler(async (_req: Request, res: Response) => {
  const accounts = await prisma.chartOfAccounts.findMany({
    where: { isActive: true },
    orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
  });

  // Group by type for tree structure
  const grouped: Record<string, typeof accounts> = {};
  for (const acc of accounts) {
    if (!grouped[acc.accountType]) grouped[acc.accountType] = [];
    grouped[acc.accountType].push(acc);
  }

  successResponse(res, { accounts, grouped });
});

// POST /api/chart-of-accounts
export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const { accountCode, accountName, accountType, parentId } = req.body;

  const existing = await prisma.chartOfAccounts.findUnique({
    where: { accountCode },
  });
  if (existing) {
    errorResponse(res, 'Account code already exists', 400);
    return;
  }

  const account = await prisma.chartOfAccounts.create({
    data: { accountCode, accountName, accountType, parentId: parentId || null },
  });

  successResponse(res, account, 'Account created', 201);
});

// PUT /api/chart-of-accounts/:id
export const updateAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await prisma.chartOfAccounts.findUnique({
    where: { id: req.params['id'] },
  });

  if (!account) {
    errorResponse(res, 'Account not found', 404);
    return;
  }

  const updated = await prisma.chartOfAccounts.update({
    where: { id: req.params['id'] },
    data: req.body,
  });

  successResponse(res, updated, 'Account updated');
});

// GET /api/gl-entries
export const getGLEntries = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, dateFrom, dateTo, referenceNo } = req.query;

  const where: Record<string, unknown> = {};
  if (accountId) where['accountId'] = accountId;
  if (referenceNo) where['referenceNo'] = { contains: referenceNo as string, mode: 'insensitive' };
  if (dateFrom || dateTo) {
    where['entryDate'] = {
      ...(dateFrom && { gte: new Date(dateFrom as string) }),
      ...(dateTo && { lte: new Date(dateTo as string) }),
    };
  }

  const entries = await prisma.glEntry.findMany({
    where,
    orderBy: { entryDate: 'desc' },
    include: {
      account: {
        select: { id: true, accountCode: true, accountName: true, accountType: true },
      },
    },
    take: 500,
  });

  successResponse(res, entries);
});

// POST /api/gl-entries
export const createGLEntry = asyncHandler(async (req: Request, res: Response) => {
  const { description, entryDate, referenceNo, lines } = req.body;

  if (!lines || !Array.isArray(lines) || lines.length < 2) {
    errorResponse(res, 'Journal entry requires at least 2 lines', 400);
    return;
  }

  const totalDebit = lines.reduce((sum: number, l: { debit?: number }) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum: number, l: { credit?: number }) => sum + (Number(l.credit) || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    errorResponse(
      res,
      `Debits (₱${totalDebit.toFixed(2)}) must equal Credits (₱${totalCredit.toFixed(2)})`,
      400
    );
    return;
  }

  const entryDate_ = entryDate ? new Date(entryDate) : new Date();

  // Create one GlEntry record per line (the Prisma model is line-level)
  const baseEntryNo = await generateEntryNo();

  const created = await prisma.$transaction(
    lines.map(
      (
        line: { accountId: string; debit?: number; credit?: number; description?: string },
        idx: number
      ) =>
        prisma.glEntry.create({
          data: {
            entryNo: `${baseEntryNo}-${String(idx + 1).padStart(2, '0')}`,
            accountId: line.accountId,
            description: line.description || description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            referenceNo: referenceNo || null,
            entryDate: entryDate_,
          },
          include: {
            account: {
              select: { id: true, accountCode: true, accountName: true, accountType: true },
            },
          },
        })
    )
  );

  successResponse(
    res,
    { entryNo: baseEntryNo, lines: created, totalDebit, totalCredit },
    'Journal entry created',
    201
  );
});

// GET /api/reports/trial-balance
export const getTrialBalance = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;

  const dateFilter: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    dateFilter['entryDate'] = {
      ...(dateFrom && { gte: new Date(dateFrom as string) }),
      ...(dateTo && { lte: new Date(dateTo as string) }),
    };
  }

  const accounts = await prisma.chartOfAccounts.findMany({
    where: { isActive: true },
    orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
    include: {
      glEntries: {
        where: Object.keys(dateFilter).length ? dateFilter : undefined,
        select: { debit: true, credit: true },
      },
    },
  });

  const rows = accounts.map((acc) => {
    const totalDebit = acc.glEntries.reduce((s, e) => s + Number(e.debit), 0);
    const totalCredit = acc.glEntries.reduce((s, e) => s + Number(e.credit), 0);
    const balance = totalDebit - totalCredit;
    return {
      id: acc.id,
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      accountType: acc.accountType,
      totalDebit,
      totalCredit,
      balance,
    };
  });

  const grandTotalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
  const grandTotalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);

  successResponse(res, { rows, grandTotalDebit, grandTotalCredit });
});

// GET /api/reports/income-statement
export const getIncomeStatement = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;

  const dateFilter: Record<string, unknown> = {};
  if (dateFrom || dateTo) {
    dateFilter['entryDate'] = {
      ...(dateFrom && { gte: new Date(dateFrom as string) }),
      ...(dateTo && { lte: new Date(dateTo as string) }),
    };
  }

  const accounts = await prisma.chartOfAccounts.findMany({
    where: {
      isActive: true,
      accountType: { in: ['REVENUE', 'EXPENSE'] },
    },
    orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
    include: {
      glEntries: {
        where: Object.keys(dateFilter).length ? dateFilter : undefined,
        select: { debit: true, credit: true },
      },
    },
  });

  const revenues: Array<{ accountCode: string; accountName: string; amount: number }> = [];
  const expenses: Array<{ accountCode: string; accountName: string; amount: number }> = [];

  for (const acc of accounts) {
    const totalDebit = acc.glEntries.reduce((s, e) => s + Number(e.debit), 0);
    const totalCredit = acc.glEntries.reduce((s, e) => s + Number(e.credit), 0);

    if (acc.accountType === 'REVENUE') {
      revenues.push({
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        amount: totalCredit - totalDebit,
      });
    } else if (acc.accountType === 'EXPENSE') {
      expenses.push({
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        amount: totalDebit - totalCredit,
      });
    }
  }

  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const netIncome = totalRevenue - totalExpense;

  successResponse(res, { revenues, expenses, totalRevenue, totalExpense, netIncome });
});

// GET /api/reports/balance-sheet
export const getBalanceSheet = asyncHandler(async (_req: Request, res: Response) => {
  const accounts = await prisma.chartOfAccounts.findMany({
    where: {
      isActive: true,
      accountType: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
    },
    orderBy: [{ accountType: 'asc' }, { accountCode: 'asc' }],
    include: {
      glEntries: {
        select: { debit: true, credit: true },
      },
    },
  });

  const assets: Array<{ accountCode: string; accountName: string; balance: number }> = [];
  const liabilities: Array<{ accountCode: string; accountName: string; balance: number }> = [];
  const equity: Array<{ accountCode: string; accountName: string; balance: number }> = [];

  for (const acc of accounts) {
    const totalDebit = acc.glEntries.reduce((s, e) => s + Number(e.debit), 0);
    const totalCredit = acc.glEntries.reduce((s, e) => s + Number(e.credit), 0);
    const entry = { accountCode: acc.accountCode, accountName: acc.accountName, balance: 0 };

    if (acc.accountType === 'ASSET') {
      entry.balance = totalDebit - totalCredit;
      assets.push(entry);
    } else if (acc.accountType === 'LIABILITY') {
      entry.balance = totalCredit - totalDebit;
      liabilities.push(entry);
    } else if (acc.accountType === 'EQUITY') {
      entry.balance = totalCredit - totalDebit;
      equity.push(entry);
    }
  }

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const totalEquity = equity.reduce((s, e) => s + e.balance, 0);

  successResponse(res, {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
  });
});
