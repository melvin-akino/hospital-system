import api from '../lib/api';
import { ApiResponse, PaginatedResponse } from '../types';

export const labService = {
  getTestTemplates: async () => {
    const res = await api.get<ApiResponse>('/lab/test-templates');
    return res.data;
  },

  createRequisition: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/lab-requisitions', data);
    return res.data;
  },

  getRequisitions: async (params?: Record<string, unknown>) => {
    const res = await api.get<PaginatedResponse>('/lab-requisitions', { params });
    return res.data;
  },

  getRequisition: async (id: string) => {
    const res = await api.get<ApiResponse>(`/lab-requisitions/${id}`);
    return res.data;
  },

  updateRequisitionStatus: async (id: string, status: string) => {
    const res = await api.put<ApiResponse>(`/lab-requisitions/${id}/status`, { status });
    return res.data;
  },

  enterResults: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/lab-results', data);
    return res.data;
  },

  getResults: async (params?: Record<string, unknown>) => {
    const res = await api.get<PaginatedResponse>('/lab-results', { params });
    return res.data;
  },

  getResult: async (id: string) => {
    const res = await api.get<ApiResponse>(`/lab-results/${id}`);
    return res.data;
  },

  getPatientResults: async (patientId: string) => {
    const res = await api.get<ApiResponse>(`/patients/${patientId}/lab-results`);
    return res.data;
  },

  createRadiologyOrder: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/radiology-orders', data);
    return res.data;
  },

  getRadiologyOrders: async (params?: Record<string, unknown>) => {
    const res = await api.get<PaginatedResponse>('/radiology-orders', { params });
    return res.data;
  },

  uploadRadiologyReport: async (data: Record<string, unknown>) => {
    const res = await api.post<ApiResponse>('/radiology-reports', data);
    return res.data;
  },
};
