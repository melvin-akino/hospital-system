import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface ChargeRequestFilters {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  departmentId?: string;
  page?: number;
  limit?: number;
}

export function useChargeRequests(filters: ChargeRequestFilters = {}) {
  return useQuery({
    queryKey: ['charge-requests', filters],
    queryFn: () =>
      api.get('/charge-requests', { params: filters }).then((r) => r.data),
  });
}

export function usePendingChargeCount() {
  return useQuery({
    queryKey: ['charge-requests', 'pending-count'],
    queryFn: () =>
      api.get('/charge-requests/pending/count').then((r) => r.data.data.count as number),
    refetchInterval: 30_000, // poll every 30s so badge stays current
  });
}

export function useApproveChargeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) =>
      api.post(`/charge-requests/${id}/approve`, { reviewNotes }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['charge-requests'] });
      qc.invalidateQueries({ queryKey: ['dept-charges'] });
    },
  });
}

export function useRejectChargeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) =>
      api.post(`/charge-requests/${id}/reject`, { reviewNotes }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['charge-requests'] }),
  });
}
