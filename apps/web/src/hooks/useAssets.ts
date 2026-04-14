import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService } from '../services/assetService';
import { App } from 'antd';

export const useAssetStats = () =>
  useQuery({
    queryKey: ['asset-stats'],
    queryFn: () => assetService.getStats(),
  });

export const useAssets = (params?: Record<string, string | number | undefined>) =>
  useQuery({
    queryKey: ['assets', params],
    queryFn: () => assetService.getAssets(params),
  });

export const useAsset = (id: string) =>
  useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetService.getAsset(id),
    enabled: !!id,
  });

export const useMaintenanceHistory = (id: string) =>
  useQuery({
    queryKey: ['asset-maintenance', id],
    queryFn: () => assetService.getMaintenanceHistory(id),
    enabled: !!id,
  });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: assetService.createAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset-stats'] });
      message.success('Asset registered');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to register asset';
      message.error(msg);
    },
  });
};

export const useUpdateAsset = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      assetService.updateAsset(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset', variables.id] });
      message.success('Asset updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update asset';
      message.error(msg);
    },
  });
};

export const useLogMaintenance = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof assetService.logMaintenance>[1] }) =>
      assetService.logMaintenance(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['asset-maintenance', variables.id] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      message.success('Maintenance logged');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to log maintenance';
      message.error(msg);
    },
  });
};

export const useDepreciate = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { depreciationRate: number; method?: string } }) =>
      assetService.depreciate(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset', variables.id] });
      qc.invalidateQueries({ queryKey: ['asset-stats'] });
      message.success('Depreciation applied');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to apply depreciation';
      message.error(msg);
    },
  });
};
