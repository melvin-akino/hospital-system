import api from '../lib/api';
import { ApiResponse, AuthUser } from '../types';

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  login: async (username: string, password: string) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', { username, password });
    return res.data;
  },

  logout: async () => {
    const res = await api.post<ApiResponse>('/auth/logout');
    return res.data;
  },

  getMe: async () => {
    const res = await api.get<ApiResponse<AuthUser>>('/auth/me');
    return res.data;
  },

  register: async (data: { username: string; email: string; password: string; role: string }) => {
    const res = await api.post<ApiResponse>('/auth/register', data);
    return res.data;
  },
};
