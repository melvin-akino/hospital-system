import api from '../lib/api';
import { ApiResponse, PaginatedResponse, Bill, Payment, SearchParams } from '../types';

interface CreateBillData {
  patientId: string;
  consultationId?: string;
  admissionId?: string;
  discountType?: string;
  discountPercent?: number;
  philhealthDeduction?: number;
  hmoDeduction?: number;
  notes?: string;
  items: Array<{
    serviceId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
  }>;
}

interface AddPaymentData {
  amount: number;
  method: string;
  referenceNo?: string;
  receivedBy?: string;
  notes?: string;
}

export const billingService = {
  getAll: async (params?: SearchParams) => {
    const res = await api.get<PaginatedResponse<Bill>>('/billing', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<Bill>>(`/billing/${id}`);
    return res.data;
  },

  create: async (data: CreateBillData) => {
    const res = await api.post<ApiResponse<Bill>>('/billing', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Bill>) => {
    const res = await api.put<ApiResponse<Bill>>(`/billing/${id}`, data);
    return res.data;
  },

  addPayment: async (id: string, data: AddPaymentData) => {
    const res = await api.post<ApiResponse<{ payment: Payment; bill: Bill }>>(
      `/billing/${id}/payment`,
      data
    );
    return res.data;
  },

  finalize: async (id: string) => {
    const res = await api.post<ApiResponse<Bill>>(`/billing/${id}/finalize`);
    return res.data;
  },

  cancel: async (id: string) => {
    const res = await api.post<ApiResponse<Bill>>(`/billing/${id}/cancel`);
    return res.data;
  },

  getPayments: async (id: string) => {
    const res = await api.get<ApiResponse<Payment[]>>(`/billing/${id}/payments`);
    return res.data;
  },

  getReceipt: async (id: string) => {
    const res = await api.get<ApiResponse>(`/billing/${id}/receipt`);
    return res.data;
  },

  applyDiscount: async (
    id: string,
    data: { discountType: string; discountPercent: number; reason?: string }
  ) => {
    const res = await api.post<ApiResponse<Bill>>(`/billing/${id}/discount`, data);
    return res.data;
  },
};
