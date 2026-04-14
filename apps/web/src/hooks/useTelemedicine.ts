import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { telemedicineService } from '../services/telemedicineService';
import { App } from 'antd';

export const useTeleSessions = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['telemedicine-sessions', params],
    queryFn: () => telemedicineService.getSessions(params),
  });

export const useTeleStats = () =>
  useQuery({
    queryKey: ['telemedicine-stats'],
    queryFn: () => telemedicineService.getStats(),
  });

export const useTeleSession = (id: string) =>
  useQuery({
    queryKey: ['telemedicine-session', id],
    queryFn: () => telemedicineService.getSession(id),
    enabled: !!id,
  });

export const useBookSession = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: telemedicineService.bookSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telemedicine-sessions'] });
      qc.invalidateQueries({ queryKey: ['telemedicine-stats'] });
      message.success('Session booked successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to book session';
      message.error(msg);
    },
  });
};

export const useStartSession = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => telemedicineService.startSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telemedicine-sessions'] });
      message.success('Session started');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start session';
      message.error(msg);
    },
  });
};

export const useEndSession = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { duration: number; notes?: string; prescription?: string } }) =>
      telemedicineService.endSession(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telemedicine-sessions'] });
      qc.invalidateQueries({ queryKey: ['telemedicine-stats'] });
      message.success('Session ended');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to end session';
      message.error(msg);
    },
  });
};

export const useCancelSession = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => telemedicineService.cancelSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['telemedicine-sessions'] });
      message.success('Session cancelled');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel session';
      message.error(msg);
    },
  });
};
