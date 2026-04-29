import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

interface ListParams {
  patientId?: string;
  admissionId?: string;
  consultationId?: string;
  status?: string;
  departmentId?: string;
}

export const useOrderedServices = (params: ListParams = {}) => {
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => { if (v) clean[k] = v; });

  return useQuery({
    queryKey: ['ordered-services', clean],
    queryFn: () =>
      api.get('/ordered-services', { params: clean }).then((r) => r.data?.data ?? []),
  });
};

export const useUpdateOrderedServiceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api.put(`/ordered-services/${id}/status`, { status, notes }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ordered-services'] }),
  });
};

export const useBillOrderedService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, billId }: { id: string; billId?: string }) =>
      api.post(`/ordered-services/${id}/bill`, { billId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ordered-services'] });
      qc.invalidateQueries({ queryKey: ['bills'] });
    },
  });
};

export const useBulkBillOrderedServices = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, billId }: { ids: string[]; billId?: string }) =>
      api.post('/ordered-services/bulk-bill', { ids, billId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ordered-services'] });
      qc.invalidateQueries({ queryKey: ['bills'] });
    },
  });
};

export const useCancelOrderedService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/ordered-services/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ordered-services'] }),
  });
};
