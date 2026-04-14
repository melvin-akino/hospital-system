import api from '../lib/api';
import { ApiResponse } from '../types';

export interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentId?: string;
  isActive: boolean;
}

export interface GlEntryLine {
  id: string;
  entryNo: string;
  accountId: string;
  description?: string;
  debit: number;
  credit: number;
  referenceNo?: string;
  entryDate: string;
  account?: Pick<Account, 'id' | 'accountCode' | 'accountName' | 'accountType'>;
}

export interface CreateGLEntryData {
  description: string;
  entryDate: string;
  referenceNo?: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
}

export interface TrialBalanceRow {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface IncomeStatementData {
  revenues: Array<{ accountCode: string; accountName: string; amount: number }>;
  expenses: Array<{ accountCode: string; accountName: string; amount: number }>;
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
}

export interface BalanceSheetData {
  assets: Array<{ accountCode: string; accountName: string; balance: number }>;
  liabilities: Array<{ accountCode: string; accountName: string; balance: number }>;
  equity: Array<{ accountCode: string; accountName: string; balance: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export const accountingService = {
  getChartOfAccounts: async () => {
    const res = await api.get<ApiResponse<{ accounts: Account[]; grouped: Record<string, Account[]> }>>('/chart-of-accounts');
    return res.data;
  },

  createAccount: async (data: Omit<Account, 'id' | 'isActive'>) => {
    const res = await api.post<ApiResponse<Account>>('/chart-of-accounts', data);
    return res.data;
  },

  updateAccount: async (id: string, data: Partial<Account>) => {
    const res = await api.put<ApiResponse<Account>>(`/chart-of-accounts/${id}`, data);
    return res.data;
  },

  getGLEntries: async (params?: {
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    referenceNo?: string;
  }) => {
    const res = await api.get<ApiResponse<GlEntryLine[]>>('/gl-entries', { params });
    return res.data;
  },

  createGLEntry: async (data: CreateGLEntryData) => {
    const res = await api.post<ApiResponse<{ entryNo: string; lines: GlEntryLine[]; totalDebit: number; totalCredit: number }>>('/gl-entries', data);
    return res.data;
  },

  getTrialBalance: async (params?: { dateFrom?: string; dateTo?: string }) => {
    const res = await api.get<ApiResponse<{ rows: TrialBalanceRow[]; grandTotalDebit: number; grandTotalCredit: number }>>('/reports/trial-balance', { params });
    return res.data;
  },

  getIncomeStatement: async (params?: { dateFrom?: string; dateTo?: string }) => {
    const res = await api.get<ApiResponse<IncomeStatementData>>('/reports/income-statement', { params });
    return res.data;
  },

  getBalanceSheet: async () => {
    const res = await api.get<ApiResponse<BalanceSheetData>>('/reports/balance-sheet');
    return res.data;
  },
};
