import api from '../lib/api';

export const auditService = {
  list: (params?: {
    page?: number; limit?: number; module?: string;
    action?: string; username?: string; from?: string; to?: string;
  }) => api.get('/audit-logs', { params }),
};
