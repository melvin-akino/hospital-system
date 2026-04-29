import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface CartItem {
  inventoryItemId: string;
  itemName: string;
  itemCode: string;
  genericName?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  costAtSale: number;
  discount: number;
  total: number;
  currentStock: number;
}

export interface SalePayload {
  type: 'CASH' | 'CHARGE_TO_BILL' | 'HMO' | 'PHILHEALTH';
  patientId?: string;
  admissionId?: string;
  paymentMethod: 'CASH' | 'GCASH' | 'CARD' | 'CHARGE' | 'HMO' | 'PHILHEALTH';
  amountTendered?: number;
  items: { inventoryItemId: string; quantity: number; unitPrice: number; discount: number }[];
  notes?: string;
  referenceNo?: string;
}

interface SalesParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  cashierId?: string;
  dateFrom?: string;
  dateTo?: string;
  patientId?: string;
}

export const usePharmacySales = (params: SalesParams = {}) => {
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') clean[k] = String(v); });
  return useQuery({
    queryKey: ['pharmacy-pos-sales', clean],
    queryFn: () => api.get('/pharmacy/pos/sales', { params: clean }).then((r) => r.data?.data),
  });
};

export const usePharmacySale = (id: string) =>
  useQuery({
    queryKey: ['pharmacy-pos-sale', id],
    queryFn: () => api.get(`/pharmacy/pos/sales/${id}`).then((r) => r.data?.data),
    enabled: !!id,
  });

export const useZReport = (date?: string) =>
  useQuery({
    queryKey: ['pharmacy-z-report', date],
    queryFn: () => api.get('/pharmacy/pos/z-report', { params: date ? { date } : {} }).then((r) => r.data?.data),
  });

export const useCreateSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SalePayload) =>
      api.post('/pharmacy/pos/sales', payload).then((r) => r.data?.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy-pos-sales'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-z-report'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['gl-entries'] });
    },
  });
};

export const useVoidSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, voidReason }: { id: string; voidReason: string }) =>
      api.post(`/pharmacy/pos/sales/${id}/void`, { voidReason }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacy-pos-sales'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-z-report'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};
