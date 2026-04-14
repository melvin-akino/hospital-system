import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onlinePaymentService } from '../services/onlinePaymentService';
import { App } from 'antd';

export const usePaymentStatus = (paymentIntentId: string, enabled = true) =>
  useQuery({
    queryKey: ['payment-status', paymentIntentId],
    queryFn: () => onlinePaymentService.getStatus(paymentIntentId),
    enabled: enabled && !!paymentIntentId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'PAID' || data.status === 'FAILED' || data.status === 'CANCELLED')) {
        return false;
      }
      return 3000;
    },
  });

export const usePaymentTransactions = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['payment-transactions', params],
    queryFn: () => onlinePaymentService.getTransactions(params),
  });

export const useInitiateGcash = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: { billId: string; amount: number; description?: string }) =>
      onlinePaymentService.initiateGcash(data),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to initiate GCash payment';
      message.error(msg);
    },
  });
};

export const useInitiateMaya = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: { billId: string; amount: number; description?: string }) =>
      onlinePaymentService.initiateMaya(data),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to initiate Maya payment';
      message.error(msg);
    },
  });
};

export const useInitiateCard = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: { billId: string; amount: number; description?: string; cardType?: string }) =>
      onlinePaymentService.initiateCard(data),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to initiate card payment';
      message.error(msg);
    },
  });
};

export const useSimulateConfirm = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (paymentIntentId: string) => onlinePaymentService.simulateConfirm(paymentIntentId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['payment-status', data.intentId] });
      qc.invalidateQueries({ queryKey: ['payment-transactions'] });
      message.success('Payment confirmed successfully');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to confirm payment';
      message.error(msg);
    },
  });
};
