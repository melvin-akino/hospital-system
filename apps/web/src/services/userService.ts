import api from '../lib/api';

export interface SystemUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  role?: string;
  password?: string;
}

export const userService = {
  list: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: CreateUserPayload) => api.post('/users', data),
  update: (id: string, data: UpdateUserPayload) => api.put(`/users/${id}`, data),
  toggleStatus: (id: string) => api.patch(`/users/${id}/toggle-status`),
  delete: (id: string) => api.delete(`/users/${id}`),
};
