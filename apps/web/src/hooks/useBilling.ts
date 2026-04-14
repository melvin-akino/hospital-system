import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingService } from '../services/billingService';
import { SearchParams } from '../types';
import { App } from 'antd';

export const useBills = (params?: SearchParams) =>
  useQuery({
    queryKey: ['bills', params],
    queryFn: () => billingService.getAll(params),
  });

export const useBill = (id: string) =>
  useQuery({
    queryKey: ['bill', id],
    queryFn: () => billingService.getById(id),
    enabled: !!id,
  });

export const useCreateBill = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: billingService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      message.success('Bill created');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create bill';
      message.error(msg);
    },
  });
};

export const useAddPayment = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      billingService.addPayment(id, data as Parameters<typeof billingService.addPayment>[1]),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['bill', variables.id] });
      message.success('Payment recorded');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Payment failed';
      message.error(msg);
    },
  });
};

export const useFinalizeBill = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: billingService.finalize,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['bill', id] });
      message.success('Bill finalized');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to finalize bill';
      message.error(msg);
    },
  });
};

export const useCancelBill = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: billingService.cancel,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['bill', id] });
      message.success('Bill cancelled');
    },
    onError: () => message.error('Failed to cancel bill'),
  });
};

export const useApplyDiscount = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { discountType: string; discountPercent: number; reason?: string };
    }) => billingService.applyDiscount(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['bill', variables.id] });
      message.success('Discount applied');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to apply discount';
      message.error(msg);
    },
  });
};
