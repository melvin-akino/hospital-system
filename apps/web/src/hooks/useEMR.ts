import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emrService } from '../services/emrService';
import { App } from 'antd';

export const useEMR = (patientId: string) =>
  useQuery({
    queryKey: ['emr', patientId],
    queryFn: () => emrService.getEMR(patientId),
    enabled: !!patientId,
  });

export const useVitalSigns = (patientId: string, params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: ['vital-signs', patientId, params],
    queryFn: () => emrService.getVitalSigns(patientId, params),
    enabled: !!patientId,
  });

export const useAddVitalSigns = (patientId: string) => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => emrService.addVitalSigns(patientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vital-signs', patientId] });
      qc.invalidateQueries({ queryKey: ['emr', patientId] });
      message.success('Vital signs recorded');
    },
    onError: () => message.error('Failed to record vital signs'),
  });
};

export const useAllergies = (patientId: string) =>
  useQuery({
    queryKey: ['allergies', patientId],
    queryFn: () => emrService.getAllergies(patientId),
    enabled: !!patientId,
  });

export const useAddAllergy = (patientId: string) => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => emrService.addAllergy(patientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allergies', patientId] });
      qc.invalidateQueries({ queryKey: ['emr', patientId] });
      message.success('Allergy added');
    },
    onError: () => message.error('Failed to add allergy'),
  });
};

export const useUpdateAllergy = (patientId: string) => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ allergyId, data }: { allergyId: string; data: Record<string, unknown> }) =>
      emrService.updateAllergy(patientId, allergyId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['allergies', patientId] });
      qc.invalidateQueries({ queryKey: ['emr', patientId] });
      message.success('Allergy updated');
    },
    onError: () => message.error('Failed to update allergy'),
  });
};

export const usePatientMedications = (patientId: string) =>
  useQuery({
    queryKey: ['patient-medications', patientId],
    queryFn: () => emrService.getMedications(patientId),
    enabled: !!patientId,
  });

export const useAddPatientMedication = (patientId: string) => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => emrService.addMedication(patientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-medications', patientId] });
      qc.invalidateQueries({ queryKey: ['emr', patientId] });
      message.success('Medication added');
    },
    onError: () => message.error('Failed to add medication'),
  });
};

export const useIcd10Search = (q: string) =>
  useQuery({
    queryKey: ['icd10-search', q],
    queryFn: () => emrService.searchIcd10(q),
    enabled: q.length >= 2,
  });
