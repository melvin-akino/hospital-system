import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hmoService } from '../services/hmoService';
import { App } from 'antd';

export const useHmoCompanies = () =>
  useQuery({
    queryKey: ['hmo-companies'],
    queryFn: hmoService.getHmoCompanies,
    staleTime: 5 * 60 * 1000,
  });

export const usePatientHmo = (patientId: string) =>
  useQuery({
    queryKey: ['patient-hmo', patientId],
    queryFn: () => hmoService.getPatientHmo(patientId),
    enabled: !!patientId,
  });

export const useHmoRegistration = (id: string) =>
  useQuery({
    queryKey: ['hmo-registration', id],
    queryFn: () => hmoService.getHmoRegistration(id),
    enabled: !!id,
  });

export const useRegisterPatientHmo = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: hmoService.registerPatientHmo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-hmo'] });
      message.success('HMO registration created');
    },
    onError: () => message.error('Failed to register HMO'),
  });
};

export const useUpdateHmoRegistration = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hmoService.updateHmoRegistration(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-hmo'] });
      qc.invalidateQueries({ queryKey: ['hmo-registration'] });
      message.success('HMO registration updated');
    },
    onError: () => message.error('Failed to update HMO registration'),
  });
};

export const useHmoEligibility = (patientId: string) =>
  useQuery({
    queryKey: ['hmo-eligibility', patientId],
    queryFn: () => hmoService.checkEligibility(patientId),
    enabled: !!patientId,
  });

export const useHmoClaims = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['hmo-claims', params],
    queryFn: () => hmoService.getClaims(params),
  });

export const useHmoClaim = (id: string) =>
  useQuery({
    queryKey: ['hmo-claim', id],
    queryFn: () => hmoService.getClaim(id),
    enabled: !!id,
  });

export const useCreateHmoClaim = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: hmoService.createClaim,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hmo-claims'] });
      message.success('HMO claim created');
    },
    onError: () => message.error('Failed to create HMO claim'),
  });
};

export const useUpdateHmoClaimStatus = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; notes?: string } }) =>
      hmoService.updateClaimStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hmo-claims'] });
      qc.invalidateQueries({ queryKey: ['hmo-claim'] });
      message.success('Claim status updated');
    },
    onError: () => message.error('Failed to update claim status'),
  });
};
