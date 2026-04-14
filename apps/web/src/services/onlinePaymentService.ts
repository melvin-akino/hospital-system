import api from '../lib/api';

export type PaymentMethod = 'GCASH' | 'MAYA' | 'CREDIT_CARD' | 'DEBIT_CARD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface PaymentIntent {
  id: string;
  intentId: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  checkoutUrl: string;
  description: string;
  createdAt: string;
  paidAt: string | null;
  bill?: {
    billNo: string;
    totalAmount: number;
    patientName: string;
  } | null;
}

export const onlinePaymentService = {
  initiateGcash: (data: { billId: string; amount: number; description?: string }): Promise<PaymentIntent> =>
    api.post('/payments/online/gcash', data).then((r) => r.data.data),
  initiateMaya: (data: { billId: string; amount: number; description?: string }): Promise<PaymentIntent> =>
    api.post('/payments/online/maya', data).then((r) => r.data.data),
  initiateCard: (data: { billId: string; amount: number; description?: string; cardType?: string }): Promise<PaymentIntent> =>
    api.post('/payments/online/card', data).then((r) => r.data.data),
  getStatus: (paymentIntentId: string): Promise<PaymentIntent> =>
    api.get(`/payments/online/${paymentIntentId}/status`).then((r) => r.data.data),
  simulateConfirm: (paymentIntentId: string): Promise<PaymentIntent> =>
    api.post(`/payments/online/${paymentIntentId}/simulate-confirm`).then((r) => r.data.data),
  getTransactions: (params?: Record<string, string>): Promise<PaymentIntent[]> =>
    api.get('/payments/online/transactions', { params }).then((r) => r.data.data),
};
