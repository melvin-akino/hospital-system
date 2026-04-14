import api from '../lib/api';
import { ApiResponse } from '../types';

export const queueService = {
  getDepartmentQueues: async () => {
    const res = await api.get<ApiResponse>('/queues');
    return res.data;
  },

  getQueueStatus: async (departmentId: string) => {
    const res = await api.get<ApiResponse>(`/queues/${departmentId}/status`);
    return res.data;
  },

  addToQueue: async (departmentId: string, data: { patientId: string; isSeniorOrPwd?: boolean }) => {
    const res = await api.post<ApiResponse>(`/queues/${departmentId}/add`, data);
    return res.data;
  },

  callNext: async (departmentId: string) => {
    const res = await api.put<ApiResponse>(`/queues/${departmentId}/next`);
    return res.data;
  },

  completeEntry: async (entryId: string) => {
    const res = await api.put<ApiResponse>(`/queue-entries/${entryId}/complete`);
    return res.data;
  },

  skipEntry: async (entryId: string) => {
    const res = await api.put<ApiResponse>(`/queue-entries/${entryId}/skip`);
    return res.data;
  },

  getAnalytics: async (departmentId: string) => {
    const res = await api.get<ApiResponse>(`/queues/${departmentId}/analytics`);
    return res.data;
  },
};
