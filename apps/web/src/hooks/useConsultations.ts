import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationService } from '../services/consultationService';
import { SearchParams } from '../types';
import { App } from 'antd';

export const useConsultations = (params?: SearchParams) =>
  useQuery({
    queryKey: ['consultations', params],
    queryFn: () => consultationService.getAll(params),
  });

export const useConsultation = (id: string) =>
  useQuery({
    queryKey: ['consultation', id],
    queryFn: () => consultationService.getById(id),
    enabled: !!id,
  });

export const useCreateConsultation = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: consultationService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultations'] });
      message.success('Consultation scheduled');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to schedule consultation';
      message.error(msg);
    },
  });
};

export const useUpdateConsultation = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      consultationService.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['consultations'] });
      qc.invalidateQueries({ queryKey: ['consultation', variables.id] });
      message.success('Consultation updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update consultation';
      message.error(msg);
    },
  });
};

export const useCompleteConsultation = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      consultationService.complete(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['consultations'] });
      qc.invalidateQueries({ queryKey: ['consultation', variables.id] });
      message.success('Consultation completed — bill auto-generated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to complete consultation';
      message.error(msg);
    },
  });
};
