import api from '../lib/api';

export interface DialysisMachine {
  id: string;
  machineCode: string;
  model?: string;
  status: string;
  _count?: { sessions: number };
  sessions?: DialysisSession[];
}

export interface DialysisSession {
  id: string;
  sessionNo: string;
  patientId: string;
  machineId?: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  status: string;
  ktv?: number;
  notes?: string;
  createdAt: string;
  patient?: { id: string; patientNo: string; firstName: string; lastName: string };
  machine?: { id: string; machineCode: string; model?: string };
}

export const dialysisService = {
  getMachines: async () => {
    const res = await api.get('/dialysis-machines');
    return res.data;
  },

  createMachine: async (data: { machineCode: string; model?: string }) => {
    const res = await api.post('/dialysis-machines', data);
    return res.data;
  },

  updateMachine: async (id: string, data: Partial<DialysisMachine>) => {
    const res = await api.put(`/dialysis-machines/${id}`, data);
    return res.data;
  },

  getTodaySchedule: async () => {
    const res = await api.get('/dialysis/schedule');
    return res.data;
  },

  getSessions: async (params?: Record<string, string | number | undefined>) => {
    const res = await api.get('/dialysis-sessions', { params });
    return res.data;
  },

  getSession: async (id: string) => {
    const res = await api.get(`/dialysis-sessions/${id}`);
    return res.data;
  },

  scheduleSession: async (data: {
    patientId: string;
    machineId?: string;
    scheduledAt: string;
    notes?: string;
  }) => {
    const res = await api.post('/dialysis-sessions', data);
    return res.data;
  },

  startSession: async (id: string) => {
    const res = await api.put(`/dialysis-sessions/${id}/start`, {});
    return res.data;
  },

  endSession: async (id: string, data: { ktv?: number; notes?: string; complications?: string }) => {
    const res = await api.put(`/dialysis-sessions/${id}/end`, data);
    return res.data;
  },

  getPatientSessions: async (patientId: string, params?: Record<string, string | number | undefined>) => {
    const res = await api.get(`/dialysis-patients/${patientId}/sessions`, { params });
    return res.data;
  },
};
