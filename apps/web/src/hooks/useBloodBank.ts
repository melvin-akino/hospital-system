import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bloodbankService } from '../services/bloodbankService';
import { App } from 'antd';

export const useBloodDonors = (params?: Record<string, string | number | undefined>) =>
  useQuery({
    queryKey: ['blood-donors', params],
    queryFn: () => bloodbankService.getDonors(params),
  });

export const useBloodInventory = () =>
  useQuery({
    queryKey: ['blood-inventory'],
    queryFn: () => bloodbankService.getBloodInventory(),
    refetchInterval: 60000,
  });

export const useBloodUnits = (params?: Record<string, string | number | undefined>) =>
  useQuery({
    queryKey: ['blood-units', params],
    queryFn: () => bloodbankService.getBloodUnits(params),
  });

export const useExpiryAlerts = () =>
  useQuery({
    queryKey: ['blood-expiry-alerts'],
    queryFn: () => bloodbankService.getExpiryAlerts(),
    refetchInterval: 300000,
  });

export const useTransfusions = (params?: Record<string, string | number | undefined>) =>
  useQuery({
    queryKey: ['transfusions', params],
    queryFn: () => bloodbankService.getTransfusions(params),
  });

export const useRegisterDonor = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: bloodbankService.registerDonor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blood-donors'] });
      message.success('Donor registered');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to register donor';
      message.error(msg);
    },
  });
};

export const useCollectUnit = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: bloodbankService.collectUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blood-units'] });
      qc.invalidateQueries({ queryKey: ['blood-inventory'] });
      qc.invalidateQueries({ queryKey: ['blood-donors'] });
      message.success('Blood unit collected');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to collect unit';
      message.error(msg);
    },
  });
};

export const useRequestTransfusion = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: bloodbankService.requestTransfusion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfusions'] });
      message.success('Transfusion requested');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to request transfusion';
      message.error(msg);
    },
  });
};

export const useTransfusePatient = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { bloodUnitId?: string } }) =>
      bloodbankService.transfusePatient(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfusions'] });
      qc.invalidateQueries({ queryKey: ['blood-units'] });
      qc.invalidateQueries({ queryKey: ['blood-inventory'] });
      message.success('Transfusion completed');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to complete transfusion';
      message.error(msg);
    },
  });
};
