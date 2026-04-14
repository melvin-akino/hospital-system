import api from '../lib/api';
import { ApiResponse, PaginatedResponse, Consultation, SearchParams } from '../types';

export const consultationService = {
  getAll: async (params?: SearchParams) => {
    const res = await api.get<PaginatedResponse<Consultation>>('/consultations', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<Consultation>>(`/consultations/${id}`);
    return res.data;
  },

  create: async (data: Partial<Consultation>) => {
    const res = await api.post<ApiResponse<Consultation>>('/consultations', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Consultation>) => {
    const res = await api.put<ApiResponse<Consultation>>(`/consultations/${id}`, data);
    return res.data;
  },

  cancel: async (id: string) => {
    const res = await api.delete<ApiResponse>(`/consultations/${id}`);
    return res.data;
  },

  complete: async (
    id: string,
    data?: { findings?: string; assessment?: string; treatmentPlan?: string; icdCodes?: string[] }
  ) => {
    const res = await api.post<ApiResponse<Consultation>>(`/consultations/${id}/complete`, data);
    return res.data;
  },

  getBill: async (id: string) => {
    const res = await api.get<ApiResponse>(`/consultations/${id}/bill`);
    return res.data;
  },
};
