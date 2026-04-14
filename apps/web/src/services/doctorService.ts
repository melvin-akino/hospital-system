import api from '../lib/api';
import { ApiResponse, PaginatedResponse, Doctor, DoctorSchedule, SearchParams } from '../types';

export const doctorService = {
  getAll: async (params?: SearchParams) => {
    const res = await api.get<PaginatedResponse<Doctor>>('/doctors', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<Doctor>>(`/doctors/${id}`);
    return res.data;
  },

  create: async (data: Partial<Doctor>) => {
    const res = await api.post<ApiResponse<Doctor>>('/doctors', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Doctor>) => {
    const res = await api.put<ApiResponse<Doctor>>(`/doctors/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete<ApiResponse>(`/doctors/${id}`);
    return res.data;
  },

  getSchedules: async (id: string) => {
    const res = await api.get<ApiResponse<DoctorSchedule[]>>(`/doctors/${id}/schedules`);
    return res.data;
  },

  createSchedule: async (doctorId: string, data: Partial<DoctorSchedule>) => {
    const res = await api.post<ApiResponse<DoctorSchedule>>(`/doctors/${doctorId}/schedules`, data);
    return res.data;
  },

  updateSchedule: async (doctorId: string, scheduleId: string, data: Partial<DoctorSchedule>) => {
    const res = await api.put<ApiResponse<DoctorSchedule>>(
      `/doctors/${doctorId}/schedules/${scheduleId}`,
      data
    );
    return res.data;
  },
};
