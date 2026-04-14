import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService } from '../services/patientService';
import { SearchParams } from '../types';
import { App } from 'antd';

export const usePatients = (params?: SearchParams) =>
  useQuery({
    queryKey: ['patients', params],
    queryFn: () => patientService.getAll(params),
  });

export const usePatient = (id: string) =>
  useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.getById(id),
    enabled: !!id,
  });

export const usePatientHistory = (id: string) =>
  useQuery({
    queryKey: ['patient-history', id],
    queryFn: () => patientService.getHistory(id),
    enabled: !!id,
  });

export const useSearchPatients = (q: string) =>
  useQuery({
    queryKey: ['patients-search', q],
    queryFn: () => patientService.search(q),
    enabled: q.length >= 2,
  });

export const useCreatePatient = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: patientService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      message.success('Patient created successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create patient';
      message.error(msg);
    },
  });
};

export const useUpdatePatient = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      patientService.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['patient', variables.id] });
      message.success('Patient updated successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update patient';
      message.error(msg);
    },
  });
};

export const useDeletePatient = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: patientService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      message.success('Patient deactivated');
    },
    onError: () => message.error('Failed to deactivate patient'),
  });
};
