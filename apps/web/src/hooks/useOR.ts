import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orService } from '../services/orService';
import { App } from 'antd';

export const useSurgeries = (params?: Record<string, string | number | undefined>) =>
  useQuery({
    queryKey: ['surgeries', params],
    queryFn: () => orService.getSurgeries(params),
  });

export const useSurgery = (id: string) =>
  useQuery({
    queryKey: ['surgery', id],
    queryFn: () => orService.getSurgery(id),
    enabled: !!id,
  });

export const useScheduleSurgery = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: orService.scheduleSurgery,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surgeries'] });
      message.success('Surgery scheduled');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to schedule surgery';
      message.error(msg);
    },
  });
};

export const useUpdateSurgery = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      orService.updateSurgery(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['surgeries'] });
      qc.invalidateQueries({ queryKey: ['surgery', variables.id] });
      message.success('Surgery updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update surgery';
      message.error(msg);
    },
  });
};

export const useCancelSurgery = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: orService.cancelSurgery,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['surgeries'] });
      qc.invalidateQueries({ queryKey: ['surgery', id] });
      message.success('Surgery cancelled');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel surgery';
      message.error(msg);
    },
  });
};

export const useChecklist = (surgeryId: string) =>
  useQuery({
    queryKey: ['checklist', surgeryId],
    queryFn: () => orService.getChecklist(surgeryId),
    enabled: !!surgeryId,
  });

export const useORAvailability = (date?: string) =>
  useQuery({
    queryKey: ['or-availability', date],
    queryFn: () => orService.getORAvailability(date),
  });
