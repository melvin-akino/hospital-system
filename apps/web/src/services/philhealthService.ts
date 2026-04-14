import api from '../lib/api';
import { ApiResponse, PaginatedResponse } from '../types';

export interface PhilHealthCaseRate {
  id: string;
  icdCode: string;
  description: string;
  caseRate: number;
  category?: string;
  isActive: boolean;
}

export interface PhilHealthClaim {
  id: string;
  claimNo: string;
  billId?: string;
  patientId: string;
  caseRateId?: string;
  claimAmount: number;
  status: string;
  cf4Generated: boolean;
  submittedAt?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  patient?: {
    id: string;
    patientNo: string;
    firstName: string;
    lastName: string;
    philhealthNo?: string;
  };
  bill?: {
    id: string;
    billNo: string;
    totalAmount: number;
  };
  caseRate?: PhilHealthCaseRate;
}

export interface PhilHealthStats {
  totalClaims: number;
  pending: number;
  approved: number;
  totalAmount: number;
  approvedAmount: number;
}

export interface CreateClaimData {
  billId?: string;
  patientId: string;
  caseRateId?: string;
  claimAmount: number;
  notes?: string;
}

export const philhealthService = {
  getCaseRates: async (q?: string) => {
    const res = await api.get<ApiResponse<PhilHealthCaseRate[]>>('/philhealth/case-rates', {
      params: q ? { q } : undefined,
    });
    return res.data;
  },

  getClaims: async (params?: {
    status?: string;
    patientId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get<PaginatedResponse<PhilHealthClaim>>('/philhealth-claims', {
      params,
    });
    return res.data;
  },

  getClaim: async (id: string) => {
    const res = await api.get<ApiResponse<PhilHealthClaim>>(`/philhealth-claims/${id}`);
    return res.data;
  },

  createClaim: async (data: CreateClaimData) => {
    const res = await api.post<ApiResponse<PhilHealthClaim>>('/philhealth-claims', data);
    return res.data;
  },

  updateClaim: async (
    id: string,
    data: { status?: string; notes?: string; submittedAt?: string; approvedAt?: string }
  ) => {
    const res = await api.put<ApiResponse<PhilHealthClaim>>(`/philhealth-claims/${id}`, data);
    return res.data;
  },

  generateCF4: async (id: string, claimNo: string) => {
    const res = await api.post(`/philhealth-claims/${id}/generate-cf4`, {}, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CF4-${claimNo}.xml`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getStats: async () => {
    const res = await api.get<ApiResponse<PhilHealthStats>>('/philhealth-claims/stats');
    return res.data;
  },
};
