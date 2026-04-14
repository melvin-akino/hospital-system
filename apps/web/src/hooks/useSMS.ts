import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smsService } from '../services/smsService';
import { App } from 'antd';

export const useSmsTemplates = () =>
  useQuery({
    queryKey: ['sms-templates'],
    queryFn: () => smsService.getTemplates(),
  });

export const useSmsStats = () =>
  useQuery({
    queryKey: ['sms-stats'],
    queryFn: () => smsService.getStats(),
    refetchInterval: 30000,
  });

export const useSmsLogs = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['sms-logs', params],
    queryFn: () => smsService.getLogs(params),
  });

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: { name: string; template: string; category: string }) =>
      smsService.createTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms-templates'] });
      qc.invalidateQueries({ queryKey: ['sms-stats'] });
      message.success('Template created');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create template';
      message.error(msg);
    },
  });
};

export const useUpdateTemplate = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; template: string; category: string }> }) =>
      smsService.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms-templates'] });
      message.success('Template updated');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update template';
      message.error(msg);
    },
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => smsService.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms-templates'] });
      qc.invalidateQueries({ queryKey: ['sms-stats'] });
      message.success('Template deleted');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete template';
      message.error(msg);
    },
  });
};

export const useSendSms = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: { recipient: string; message: string; templateId?: string }) =>
      smsService.sendSms(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms-logs'] });
      qc.invalidateQueries({ queryKey: ['sms-stats'] });
      message.success('SMS sent successfully');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send SMS';
      message.error(msg);
    },
  });
};
