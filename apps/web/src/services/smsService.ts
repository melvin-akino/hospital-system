import api from '../lib/api';

export interface SmsTemplate {
  id: string;
  name: string;
  template: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsLog {
  id: string;
  recipient: string;
  message: string;
  templateId: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  messageId: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface SmsStats {
  totalSent: number;
  delivered: number;
  failed: number;
  pendingCount: number;
  todayCount: number;
  templateCount: number;
}

export const smsService = {
  getTemplates: (): Promise<SmsTemplate[]> =>
    api.get('/sms/templates').then((r) => r.data.data),
  createTemplate: (data: { name: string; template: string; category: string }): Promise<SmsTemplate> =>
    api.post('/sms/templates', data).then((r) => r.data.data),
  updateTemplate: (id: string, data: Partial<SmsTemplate>): Promise<SmsTemplate> =>
    api.put(`/sms/templates/${id}`, data).then((r) => r.data.data),
  deleteTemplate: (id: string): Promise<void> =>
    api.delete(`/sms/templates/${id}`).then(() => undefined),
  sendSms: (data: { recipient: string; message: string; templateId?: string }): Promise<SmsLog> =>
    api.post('/sms/send', data).then((r) => r.data.data),
  sendBulk: (data: { recipients: string[]; message: string; templateId?: string }) =>
    api.post('/sms/send-bulk', data).then((r) => r.data.data),
  getLogs: (params?: Record<string, string>): Promise<SmsLog[]> =>
    api.get('/sms/logs', { params }).then((r) => r.data.data),
  getStats: (): Promise<SmsStats> =>
    api.get('/sms/stats').then((r) => r.data.data),
  sendAppointmentReminder: (appointmentId: string): Promise<SmsLog> =>
    api.post(`/sms/appointment-reminder/${appointmentId}`).then((r) => r.data.data),
};
