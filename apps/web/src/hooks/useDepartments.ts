import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentService } from '../services/departmentService';
import { App } from 'antd';

export const useDepartments = () =>
  useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getDepartments(),
  });

export const useDepartment = (id: string) =>
  useQuery({
    queryKey: ['department', id],
    queryFn: () => departmentService.getDepartment(id),
    enabled: !!id,
  });

export const useCreateDepartment = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => departmentService.createDepartment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      message.success('Department created');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create department';
      message.error(msg);
    },
  });
};

export const useUpdateDepartment = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      departmentService.updateDepartment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      message.success('Department updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update department';
      message.error(msg);
    },
  });
};

export const useDeleteDepartment = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => departmentService.deleteDepartment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      message.success('Department deactivated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to deactivate department';
      message.error(msg);
    },
  });
};
