import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queueService } from '../services/queueService';
import { App } from 'antd';

export const useDepartmentQueues = () =>
  useQuery({
    queryKey: ['department-queues'],
    queryFn: queueService.getDepartmentQueues,
  });

export const useQueueStatus = (departmentId: string, refetchInterval?: number) =>
  useQuery({
    queryKey: ['queue-status', departmentId],
    queryFn: () => queueService.getQueueStatus(departmentId),
    enabled: !!departmentId,
    refetchInterval: refetchInterval ?? false,
  });

export const useAddToQueue = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ departmentId, data }: { departmentId: string; data: { patientId: string; isSeniorOrPwd?: boolean } }) =>
      queueService.addToQueue(departmentId, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['queue-status'] });
      qc.invalidateQueries({ queryKey: ['department-queues'] });
      message.success(`Patient added to queue`);
    },
    onError: () => message.error('Failed to add patient to queue'),
  });
};

export const useCallNext = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (departmentId: string) => queueService.callNext(departmentId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['queue-status'] });
      const data = res?.data as { ticketNo?: string } | undefined;
      if (data?.ticketNo) {
        message.success(`Now serving: ${data.ticketNo}`);
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg || 'No patients waiting');
    },
  });
};

export const useCompleteEntry = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (entryId: string) => queueService.completeEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue-status'] });
      message.success('Entry completed');
    },
    onError: () => message.error('Failed to complete entry'),
  });
};

export const useSkipEntry = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (entryId: string) => queueService.skipEntry(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue-status'] });
      message.success('Entry skipped');
    },
    onError: () => message.error('Failed to skip entry'),
  });
};

export const useQueueAnalytics = (departmentId: string) =>
  useQuery({
    queryKey: ['queue-analytics', departmentId],
    queryFn: () => queueService.getAnalytics(departmentId),
    enabled: !!departmentId,
  });
