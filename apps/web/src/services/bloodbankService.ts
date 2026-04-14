import api from '../lib/api';

export interface BloodDonor {
  id: string;
  firstName: string;
  lastName: string;
  bloodType: string;
  phone?: string;
  email?: string;
  lastDonated?: string;
  isDeferral: boolean;
  createdAt: string;
  _count?: { units: number };
}

export interface BloodUnit {
  id: string;
  unitCode: string;
  donorId?: string;
  bloodType: string;
  collectedAt: string;
  expiryDate: string;
  status: string;
  isUsed: boolean;
  donor?: { id: string; firstName: string; lastName: string; bloodType: string };
}

export interface BloodInventoryItem {
  bloodType: string;
  available: number;
  reserved: number;
  total: number;
  expiringSoon: number;
}

export interface Transfusion {
  id: string;
  patientId: string;
  bloodUnitId?: string;
  bloodType: string;
  units: number;
  requestedAt: string;
  transfusedAt?: string;
  status: string;
  notes?: string;
  patient?: { id: string; patientNo: string; firstName: string; lastName: string; bloodType?: string };
}

export const bloodbankService = {
  getDonors: async (params?: Record<string, string | number | undefined>) => {
    const res = await api.get('/blood-donors', { params });
    return res.data;
  },

  registerDonor: async (data: {
    firstName: string;
    lastName: string;
    bloodType: string;
    phone?: string;
    email?: string;
  }) => {
    const res = await api.post('/blood-donors', data);
    return res.data;
  },

  updateDonor: async (id: string, data: Partial<BloodDonor>) => {
    const res = await api.put(`/blood-donors/${id}`, data);
    return res.data;
  },

  getBloodInventory: async () => {
    const res = await api.get('/blood-inventory');
    return res.data;
  },

  getBloodUnits: async (params?: Record<string, string | number | undefined>) => {
    const res = await api.get('/blood-units', { params });
    return res.data;
  },

  collectUnit: async (data: {
    donorId?: string;
    bloodType: string;
    collectedAt?: string;
    expiryDate?: string;
  }) => {
    const res = await api.post('/blood-units', data);
    return res.data;
  },

  getExpiryAlerts: async () => {
    const res = await api.get('/blood-units/expiry-alerts');
    return res.data;
  },

  getTransfusions: async (params?: Record<string, string | number | undefined>) => {
    const res = await api.get('/transfusions', { params });
    return res.data;
  },

  requestTransfusion: async (data: {
    patientId: string;
    bloodType: string;
    units: number;
    notes?: string;
  }) => {
    const res = await api.post('/transfusions', data);
    return res.data;
  },

  transfusePatient: async (id: string, data: { bloodUnitId?: string }) => {
    const res = await api.put(`/transfusions/${id}/transfuse`, data);
    return res.data;
  },
};
