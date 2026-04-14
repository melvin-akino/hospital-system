import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorService } from '../services/doctorService';
import { SearchParams } from '../types';
import { App } from 'antd';

export const useDoctors = (params?: SearchParams) =>
  useQuery({
    queryKey: ['doctors', params],
    queryFn: () => doctorService.getAll(params),
  });

export const useDoctor = (id: string) =>
  useQuery({
    queryKey: ['doctor', id],
    queryFn: () => doctorService.getById(id),
    enabled: !!id,
  });

export const useCreateDoctor = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: doctorService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      message.success('Doctor created successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create doctor';
      message.error(msg);
    },
  });
};

export const useUpdateDoctor = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      doctorService.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['doctors'] });
      qc.invalidateQueries({ queryKey: ['doctor', variables.id] });
      message.success('Doctor updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update doctor';
      message.error(msg);
    },
  });
};
