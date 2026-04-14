import api from '../lib/api';
import { ApiResponse, PaginatedResponse, Patient, SearchParams } from '../types';

export const patientService = {
  getAll: async (params?: SearchParams) => {
    const res = await api.get<PaginatedResponse<Patient>>('/patients', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<Patient>>(`/patients/${id}`);
    return res.data;
  },

  create: async (data: Partial<Patient>) => {
    const res = await api.post<ApiResponse<Patient>>('/patients', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Patient>) => {
    const res = await api.put<ApiResponse<Patient>>(`/patients/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete<ApiResponse>(`/patients/${id}`);
    return res.data;
  },

  search: async (q: string, limit = 10) => {
    const res = await api.get<ApiResponse<Patient[]>>('/patients/search', { params: { q, limit } });
    return res.data;
  },

  getHistory: async (id: string) => {
    const res = await api.get<ApiResponse>(`/patients/${id}/history`);
    return res.data;
  },

  uploadDocument: async (id: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    const res = await api.post<ApiResponse>(`/patients/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  bulkImport: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse>('/patients/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
