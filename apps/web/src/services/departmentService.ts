import api from '../lib/api';

export const departmentService = {
  getDepartments: () => api.get('/departments').then(r => r.data.data),
  getDepartment: (id: string) => api.get(`/departments/${id}`).then(r => r.data.data),
  createDepartment: (data: Record<string, unknown>) => api.post('/departments', data).then(r => r.data.data),
  updateDepartment: (id: string, data: Record<string, unknown>) => api.put(`/departments/${id}`, data).then(r => r.data.data),
  deleteDepartment: (id: string) => api.delete(`/departments/${id}`).then(r => r.data.data),
};
