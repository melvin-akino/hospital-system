import api from '../lib/api';
import { ApiResponse, PaginatedResponse } from '../types';

export const emrService = {
  getEMR: async (patientId: string) => {
    const res = await api.get<ApiResponse>(`/patients/${patientId}/emr`);
    return res.data;
  },

  getVitalSigns: async (patientId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get<PaginatedResponse>(`/patients/${patientId}/vital-signs`, { params });
    return res.data;
  },

  addVitalSigns: async (patientId: string, data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>(`/patients/${patientId}/vital-signs`, data);
    return res.data;
  },

  getAllergies: async (patientId: string) => {
    const res = await api.get<ApiResponse>(`/patients/${patientId}/allergies`);
    return res.data;
  },

  addAllergy: async (patientId: string, data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>(`/patients/${patientId}/allergies`, data);
    return res.data;
  },

  updateAllergy: async (patientId: string, allergyId: string, data: Record<string, unknown>) => {
    const res = await api.put<ApiResponse>(`/patients/${patientId}/allergies/${allergyId}`, data);
    return res.data;
  },

  getMedications: async (patientId: string) => {
    const res = await api.get<ApiResponse>(`/patients/${patientId}/medications`);
    return res.data;
  },

  addMedication: async (patientId: string, data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>(`/patients/${patientId}/medications`, data);
    return res.data;
  },

  searchIcd10: async (q: string) => {
    const res = await api.get<ApiResponse>('/icd10-codes/search', { params: { q } });
    return res.data;
  },
};
