import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nurseService } from '../services/nurseService';
import { App } from 'antd';

export const useAssignedPatients = () =>
  useQuery({
    queryKey: ['nurse-patients'],
    queryFn: () => nurseService.getPatients(),
    refetchInterval: 60000,
  });

export const useNurseTasks = () =>
  useQuery({
    queryKey: ['nurse-tasks'],
    queryFn: () => nurseService.getTasks(),
    refetchInterval: 30000,
  });

export const useCompleteTask = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (taskId: string) => nurseService.completeTask(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nurse-tasks'] });
      message.success('Task marked as complete');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to complete task';
      message.error(msg);
    },
  });
};

export const useRecordVitals = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => nurseService.recordVitals(data),
    onSuccess: () => {
      message.success('Vitals recorded successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to record vitals';
      message.error(msg);
    },
  });
};

export const useCarePlan = (patientId: string) =>
  useQuery({
    queryKey: ['care-plan', patientId],
    queryFn: () => nurseService.getCareplan(patientId),
    enabled: !!patientId,
  });

export const useSaveCarePlan = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => nurseService.saveCareplan(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['care-plan'] });
      message.success('Care plan saved');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save care plan';
      message.error(msg);
    },
  });
};

export const useLatestHandover = () =>
  useQuery({
    queryKey: ['latest-handover'],
    queryFn: () => nurseService.getLatestHandover(),
  });

export const useSaveHandover = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => nurseService.saveHandover(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['latest-handover'] });
      message.success('Handover saved');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save handover';
      message.error(msg);
    },
  });
};
