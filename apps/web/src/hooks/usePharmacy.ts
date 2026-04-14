import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pharmacyService } from '../services/pharmacyService';
import { App } from 'antd';

export const useMedications = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['medications', params],
    queryFn: () => pharmacyService.getMedications(params),
  });

export const useMedication = (id: string) =>
  useQuery({
    queryKey: ['medication', id],
    queryFn: () => pharmacyService.getMedication(id),
    enabled: !!id,
  });

export const useCreateMedication = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: pharmacyService.createMedication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medications'] });
      message.success('Medication created');
    },
    onError: () => message.error('Failed to create medication'),
  });
};

export const useUpdateMedication = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      pharmacyService.updateMedication(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medications'] });
      message.success('Medication updated');
    },
    onError: () => message.error('Failed to update medication'),
  });
};

export const useInventory = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['inventory', params],
    queryFn: () => pharmacyService.getInventory(params),
  });

export const useInventoryItem = (id: string) =>
  useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => pharmacyService.getInventoryItem(id),
    enabled: !!id,
  });

export const useCreateInventoryItem = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: pharmacyService.createInventoryItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      message.success('Inventory item created');
    },
    onError: () => message.error('Failed to create inventory item'),
  });
};

export const useUpdateInventoryItem = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      pharmacyService.updateInventoryItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      message.success('Inventory item updated');
    },
    onError: () => message.error('Failed to update inventory item'),
  });
};

export const useAdjustStock = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, adjustment, reason }: { id: string; adjustment: number; reason: string }) =>
      pharmacyService.adjustStock(id, adjustment, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
      message.success('Stock adjusted');
    },
    onError: () => message.error('Failed to adjust stock'),
  });
};

export const useLowStockAlerts = () =>
  useQuery({
    queryKey: ['low-stock'],
    queryFn: pharmacyService.getLowStockAlerts,
  });

export const useExpiryAlerts = () =>
  useQuery({
    queryKey: ['expiry-alerts'],
    queryFn: pharmacyService.getExpiryAlerts,
  });

export const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: pharmacyService.getSuppliers,
  });

export const useCreateSupplier = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: pharmacyService.createSupplier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      message.success('Supplier created');
    },
    onError: () => message.error('Failed to create supplier'),
  });
};

export const usePurchaseOrders = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => pharmacyService.getPurchaseOrders(params),
  });

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: pharmacyService.createPurchaseOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      message.success('Purchase order created');
    },
    onError: () => message.error('Failed to create purchase order'),
  });
};
