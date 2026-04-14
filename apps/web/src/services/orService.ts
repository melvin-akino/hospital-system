import api from '../lib/api';

export interface Surgery {
  id: string;
  surgeryNo: string;
  patientId?: string;
  surgeonId?: string;
  procedure: string;
  scheduledAt: string;
  duration?: number;
  orRoom?: string;
  status: string;
  notes?: string;
  createdAt: string;
  surgeon?: { id: string; firstName: string; lastName: string; specialty: string };
  patient?: { id: string; patientNo: string; firstName: string; lastName: string };
}

export interface WHOChecklist {
  surgery: Surgery & { patient?: { id: string; firstName: string; lastName: string; patientNo: string } | null };
  checklist: {
    signIn: Array<{ id: number; phase: string; item: string }>;
    timeOut: Array<{ id: number; phase: string; item: string }>;
    signOut: Array<{ id: number; phase: string; item: string }>;
  };
}

export const orService = {
  getSurgeries: async (params?: Record<string, string | number | undefined>) => {
    const res = await api.get('/surgeries', { params });
    return res.data;
  },

  getSurgery: async (id: string) => {
    const res = await api.get(`/surgeries/${id}`);
    return res.data;
  },

  scheduleSurgery: async (data: {
    patientId?: string;
    surgeonId?: string;
    procedure: string;
    scheduledAt: string;
    duration?: number;
    orRoom?: string;
    notes?: string;
  }) => {
    const res = await api.post('/surgeries', data);
    return res.data;
  },

  updateSurgery: async (id: string, data: Partial<Surgery>) => {
    const res = await api.put(`/surgeries/${id}`, data);
    return res.data;
  },

  cancelSurgery: async (id: string) => {
    const res = await api.put(`/surgeries/${id}/cancel`, {});
    return res.data;
  },

  getChecklist: async (surgeryId: string) => {
    const res = await api.get(`/surgeries/${surgeryId}/checklist`);
    return res.data;
  },

  getORAvailability: async (date?: string) => {
    const res = await api.get('/or-availability', { params: date ? { date } : {} });
    return res.data;
  },
};
