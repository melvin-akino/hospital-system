import api from '../lib/api';
import { ApiResponse, PaginatedResponse } from '../types';

export const pharmacyService = {
  getMedications: async (params?: Record<string, unknown>) => {
    const res = await api.get<PaginatedResponse>('/medications', { params });
    return res.data;
  },

  getMedication: async (id: string) => {
    const res = await api.get<ApiResponse>(`/medications/${id}`);
    return res.data;
  },

  createMedication: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/medications', data);
    return res.data;
  },

  updateMedication: async (id: string, data: Record<string, unknown>) => {
    const res = await api.put<ApiResponse>(`/medications/${id}`, data);
    return res.data;
  },

  checkInteractions: async (id: string, drugIds: string[]) => {
    const res = await api.get<ApiResponse>(`/medications/${id}/check-interactions`, {
      params: { with: drugIds.join(',') },
    });
    return res.data;
  },

  getInventory: async (params?: Record<string, unknown>) => {
    const res = await api.get<PaginatedResponse>('/inventory', { params });
    return res.data;
  },

  getInventoryItem: async (id: string) => {
    const res = await api.get<ApiResponse>(`/inventory/${id}`);
    return res.data;
  },

  createInventoryItem: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/inventory', data);
    return res.data;
  },

  updateInventoryItem: async (id: string, data: Record<string, unknown>) => {
    const res = await api.put<ApiResponse>(`/inventory/${id}`, data);
    return res.data;
  },

  adjustStock: async (id: string, adjustment: number, reason: string) => {
    const res = await api.post<ApiResponse>(`/inventory/${id}/adjust`, { adjustment, reason });
    return res.data;
  },

  getLowStockAlerts: async () => {
    const res = await api.get<ApiResponse>('/inventory/low-stock');
    return res.data;
  },

  getExpiryAlerts: async () => {
    const res = await api.get<ApiResponse>('/inventory/expiry-alerts');
    return res.data;
  },

  getSuppliers: async () => {
    const res = await api.get<ApiResponse>('/suppliers');
    return res.data;
  },

  createSupplier: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/suppliers', data);
    return res.data;
  },

  createPurchaseOrder: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/purchase-orders', data);
    return res.data;
  },

  getPurchaseOrders: async (params?: Record<string, unknown>) => {
    const res = await api.get<PaginatedResponse>('/purchase-orders', { params });
    return res.data;
  },
};
