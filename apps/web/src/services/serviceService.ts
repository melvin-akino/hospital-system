import api from '../lib/api';
import { ApiResponse, PaginatedResponse, Service, ServiceCategory, SearchParams } from '../types';

export const serviceService = {
  getAll: async (params?: SearchParams) => {
    const res = await api.get<PaginatedResponse<Service>>('/services', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<Service>>(`/services/${id}`);
    return res.data;
  },

  create: async (data: Partial<Service>) => {
    const res = await api.post<ApiResponse<Service>>('/services', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Service>) => {
    const res = await api.put<ApiResponse<Service>>(`/services/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete<ApiResponse>(`/services/${id}`);
    return res.data;
  },

  getCategories: async () => {
    const res = await api.get<ApiResponse<ServiceCategory[]>>('/services/categories');
    return res.data;
  },

  createCategory: async (data: { name: string; description?: string }) => {
    const res = await api.post<ApiResponse<ServiceCategory>>('/services/categories', data);
    return res.data;
  },

  bulkUpdatePrices: async (updates: Array<{ id: string; basePrice: number }>) => {
    const res = await api.put<ApiResponse>('/services/bulk-price', { updates });
    return res.data;
  },
};
