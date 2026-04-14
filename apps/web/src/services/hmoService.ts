import api from '../lib/api';
import { ApiResponse, PaginatedResponse } from '../types';

export const hmoService = {
  getHmoCompanies: async () => {
    const res = await api.get<ApiResponse>('/hmo-companies');
    return res.data;
  },

  registerPatientHmo: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/hmo-registrations', data);
    return res.data;
  },

  getPatientHmo: async (patientId: string) => {
    const res = await api.get<ApiResponse>('/hmo-registrations', { params: { patientId } });
    return res.data;
  },

  getHmoRegistration: async (id: string) => {
    const res = await api.get<ApiResponse>(`/hmo-registrations/${id}`);
    return res.data;
  },

  updateHmoRegistration: async (id: string, data: Record<string, unknown>) => {
    const res = await api.put<ApiResponse>(`/hmo-registrations/${id}`, data);
    return res.data;
  },

  checkEligibility: async (patientId: string) => {
    const res = await api.get<ApiResponse>(`/hmo-eligibility/${patientId}`);
    return res.data;
  },

  createClaim: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/hmo-claims', data);
    return res.data;
  },

  getClaims: async (params?: Record<string, unknown>) => {
    const res = await api.get<PaginatedResponse>('/hmo-claims', { params });
    return res.data;
  },

  getClaim: async (id: string) => {
    const res = await api.get<ApiResponse>(`/hmo-claims/${id}`);
    return res.data;
  },

  updateClaimStatus: async (id: string, data: { status: string; notes?: string }) => {
    const res = await api.put<ApiResponse>(`/hmo-claims/${id}`, data);
    return res.data;
  },
};
