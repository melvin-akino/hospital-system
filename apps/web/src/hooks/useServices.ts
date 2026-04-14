import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceService } from '../services/serviceService';
import { SearchParams } from '../types';
import { App } from 'antd';

export const useServices = (params?: SearchParams) =>
  useQuery({
    queryKey: ['services', params],
    queryFn: () => serviceService.getAll(params),
  });

export const useService = (id: string) =>
  useQuery({
    queryKey: ['service', id],
    queryFn: () => serviceService.getById(id),
    enabled: !!id,
  });

export const useServiceCategories = () =>
  useQuery({
    queryKey: ['service-categories'],
    queryFn: () => serviceService.getCategories(),
  });

export const useCreateService = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: serviceService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      message.success('Service created');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create service';
      message.error(msg);
    },
  });
};

export const useUpdateService = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      serviceService.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['services'] });
      qc.invalidateQueries({ queryKey: ['service', variables.id] });
      message.success('Service updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update service';
      message.error(msg);
    },
  });
};

export const useDeleteService = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: serviceService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      message.success('Service deactivated');
    },
    onError: () => message.error('Failed to deactivate service'),
  });
};
