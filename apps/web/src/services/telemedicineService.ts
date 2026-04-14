import api from '../lib/api';

export interface TelemedicineSession {
  id: string; sessionNo: string; patientId: string; doctorId: string;
  scheduledAt: string; status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  roomCode: string; notes: string; prescription: string;
  startedAt: string | null; endedAt: string | null; duration: number | null; createdAt: string;
  patient?: { id: string; firstName: string; lastName: string; phone: string };
  doctor?: { id: string; firstName: string; lastName: string; specialty: string };
}

export const telemedicineService = {
  getSessions: (params?: Record<string, string>) => api.get('/telemedicine-sessions', { params }).then(r => r.data.data),
  getSession: (id: string) => api.get(`/telemedicine-sessions/${id}`).then(r => r.data.data),
  getStats: () => api.get('/telemedicine-sessions/stats').then(r => r.data.data),
  bookSession: (data: { patientId: string; doctorId: string; scheduledAt: string; notes?: string }) =>
    api.post('/telemedicine-sessions', data).then(r => r.data.data),
  updateSession: (id: string, data: Partial<TelemedicineSession>) =>
    api.put(`/telemedicine-sessions/${id}`, data).then(r => r.data.data),
  startSession: (id: string) => api.put(`/telemedicine-sessions/${id}/start`).then(r => r.data.data),
  endSession: (id: string, data: { duration: number; notes?: string; prescription?: string }) =>
    api.put(`/telemedicine-sessions/${id}/end`, data).then(r => r.data.data),
  cancelSession: (id: string) => api.put(`/telemedicine-sessions/${id}/cancel`).then(r => r.data.data),
};
