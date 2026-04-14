import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService, Account, CreateGLEntryData } from '../services/accountingService';
import { App } from 'antd';

export const useChartOfAccounts = () =>
  useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => accountingService.getChartOfAccounts(),
  });

export const useCreateAccount = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Omit<Account, 'id' | 'isActive'>) => accountingService.createAccount(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      message.success('Account created');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create account';
      message.error(msg);
    },
  });
};

export const useUpdateAccount = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) =>
      accountingService.updateAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      message.success('Account updated');
    },
    onError: () => message.error('Failed to update account'),
  });
};

export const useGLEntries = (params?: {
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  referenceNo?: string;
}) =>
  useQuery({
    queryKey: ['gl-entries', params],
    queryFn: () => accountingService.getGLEntries(params),
  });

export const useCreateGLEntry = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: CreateGLEntryData) => accountingService.createGLEntry(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gl-entries'] });
      message.success('Journal entry created');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create journal entry';
      message.error(msg);
    },
  });
};

export const useTrialBalance = (params?: { dateFrom?: string; dateTo?: string }) =>
  useQuery({
    queryKey: ['trial-balance', params],
    queryFn: () => accountingService.getTrialBalance(params),
  });

export const useIncomeStatement = (params?: { dateFrom?: string; dateTo?: string }) =>
  useQuery({
    queryKey: ['income-statement', params],
    queryFn: () => accountingService.getIncomeStatement(params),
  });

export const useBalanceSheet = () =>
  useQuery({
    queryKey: ['balance-sheet'],
    queryFn: () => accountingService.getBalanceSheet(),
  });
