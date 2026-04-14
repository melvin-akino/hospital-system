import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dialysisService } from '../services/dialysisService';
import { App } from 'antd';

export const useDialysisMachines = () =>
  useQuery({
    queryKey: ['dialysis-machines'],
    queryFn: () => dialysisService.getMachines(),
    refetchInterval: 30000,
  });

export const useTodaySchedule = () =>
  useQuery({
    queryKey: ['dialysis-today-schedule'],
    queryFn: () => dialysisService.getTodaySchedule(),
    refetchInterval: 60000,
  });

export const useDialysisSessions = (params?: Record<string, string | number | undefined>) =>
  useQuery({
    queryKey: ['dialysis-sessions', params],
    queryFn: () => dialysisService.getSessions(params),
  });

export const useDialysisSession = (id: string) =>
  useQuery({
    queryKey: ['dialysis-session', id],
    queryFn: () => dialysisService.getSession(id),
    enabled: !!id,
  });

export const usePatientDialysisSessions = (patientId: string) =>
  useQuery({
    queryKey: ['patient-dialysis-sessions', patientId],
    queryFn: () => dialysisService.getPatientSessions(patientId),
    enabled: !!patientId,
  });

export const useCreateMachine = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: dialysisService.createMachine,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dialysis-machines'] });
      message.success('Machine registered');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to register machine';
      message.error(msg);
    },
  });
};

export const useUpdateMachine = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      dialysisService.updateMachine(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dialysis-machines'] });
      message.success('Machine updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update machine';
      message.error(msg);
    },
  });
};

export const useScheduleSession = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: dialysisService.scheduleSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dialysis-sessions'] });
      qc.invalidateQueries({ queryKey: ['dialysis-today-schedule'] });
      message.success('Session scheduled');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to schedule session';
      message.error(msg);
    },
  });
};

export const useStartSession = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: dialysisService.startSession,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['dialysis-sessions'] });
      qc.invalidateQueries({ queryKey: ['dialysis-session', id] });
      qc.invalidateQueries({ queryKey: ['dialysis-machines'] });
      qc.invalidateQueries({ queryKey: ['dialysis-today-schedule'] });
      message.success('Session started');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start session';
      message.error(msg);
    },
  });
};

export const useEndSession = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { ktv?: number; notes?: string; complications?: string } }) =>
      dialysisService.endSession(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['dialysis-sessions'] });
      qc.invalidateQueries({ queryKey: ['dialysis-session', variables.id] });
      qc.invalidateQueries({ queryKey: ['dialysis-machines'] });
      qc.invalidateQueries({ queryKey: ['dialysis-today-schedule'] });
      message.success('Session completed');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to end session';
      message.error(msg);
    },
  });
};
