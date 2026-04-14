import api from '../lib/api';

export interface Asset {
  id: string;
  assetCode: string;
  assetName: string;
  category?: string;
  departmentId?: string;
  purchaseDate?: string;
  purchaseCost: number;
  currentValue: number;
  status: string;
  serialNo?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  department?: { id: string; name: string };
  maintenance?: AssetMaintenance[];
  _count?: { maintenance: number };
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  type: string;
  description?: string;
  cost: number;
  performedAt: string;
  nextDueDate?: string;
  performedBy?: string;
}

export interface AssetStats {
  totalAssets: number;
  totalValue: number;
  maintenanceDue: number;
  byCategory: Array<{ category: string; count: number; totalValue: number }>;
}

export const assetService = {
  getStats: async () => {
    const res = await api.get('/assets/stats');
    return res.data;
  },

  getAssets: async (params?: Record<string, string | number | undefined>) => {
    const res = await api.get('/assets', { params });
    return res.data;
  },

  getAsset: async (id: string) => {
    const res = await api.get(`/assets/${id}`);
    return res.data;
  },

  createAsset: async (data: {
    assetCode: string;
    assetName: string;
    category?: string;
    departmentId?: string;
    purchaseDate?: string;
    purchaseCost?: number;
    serialNo?: string;
    location?: string;
    notes?: string;
  }) => {
    const res = await api.post('/assets', data);
    return res.data;
  },

  updateAsset: async (id: string, data: Partial<Asset>) => {
    const res = await api.put(`/assets/${id}`, data);
    return res.data;
  },

  getMaintenanceHistory: async (id: string) => {
    const res = await api.get(`/assets/${id}/maintenance`);
    return res.data;
  },

  logMaintenance: async (id: string, data: {
    type: string;
    description?: string;
    cost?: number;
    performedAt?: string;
    nextDueDate?: string;
    performedBy?: string;
  }) => {
    const res = await api.post(`/assets/${id}/maintenance`, data);
    return res.data;
  },

  depreciate: async (id: string, data: { depreciationRate: number; method?: string }) => {
    const res = await api.post(`/assets/${id}/depreciate`, data);
    return res.data;
  },
};
