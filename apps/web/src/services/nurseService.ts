import api from '../lib/api';

export const nurseService = {
  getPatients: () => api.get('/nurses/patients').then(r => r.data.data),
  getTasks: () => api.get('/nurses/tasks').then(r => r.data.data),
  completeTask: (taskId: string) => api.post(`/nurses/tasks/${taskId}/complete`).then(r => r.data.data),
  recordVitals: (data: Record<string, unknown>) => api.post('/nurses/vitals', data).then(r => r.data.data),
  getCareplan: (patientId: string) => api.get(`/nurses/care-plans/${patientId}`).then(r => r.data.data),
  saveCareplan: (data: Record<string, unknown>) => api.post('/nurses/care-plans', data).then(r => r.data.data),
  getLatestHandover: () => api.get('/nurses/shift-handover/latest').then(r => r.data.data),
  saveHandover: (data: Record<string, unknown>) => api.post('/nurses/shift-handover', data).then(r => r.data.data),
};
