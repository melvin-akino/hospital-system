import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface DeptChargeFilters {
  departmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// List all department charges
export function useDeptCharges(filters: DeptChargeFilters = {}) {
  return useQuery({
    queryKey: ['dept-charges', filters],
    queryFn: () =>
      api.get('/dept-charges', { params: filters }).then((r) => r.data),
  });
}

// Get charges for a specific department (for billing form use)
export function useDeptChargesByDept(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['dept-charges', 'by-dept', departmentId],
    queryFn: () =>
      api.get(`/dept-charges/by-department/${departmentId}`).then((r) => r.data.data),
    enabled: !!departmentId,
  });
}

export function useCreateDeptCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      departmentId: string;
      serviceId: string;
      overridePrice?: number | null;
      notes?: string;
    }) => api.post('/dept-charges', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dept-charges'] }),
  });
}

export function useUpdateDeptCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      overridePrice?: number | null;
      isActive?: boolean;
      notes?: string;
      reason?: string;
    }) => api.put(`/dept-charges/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dept-charges'] }),
  });
}

export function useDeleteDeptCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.delete(`/dept-charges/${id}`, { data: { reason } }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dept-charges'] }),
  });
}
