import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { barcodeService } from '../services/barcodeService';
import { App } from 'antd';

export const useScanLog = () =>
  useQuery({
    queryKey: ['barcode-scan-log'],
    queryFn: () => barcodeService.getScanLog(),
    refetchInterval: 10_000,
  });

export const useGenerateBarcode = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: { type: string; referenceId: string }) =>
      barcodeService.generateBarcode(data),
    onSuccess: () => {
      message.success('Barcode generated');
    },
    onError: () => {
      message.error('Failed to generate barcode');
    },
  });
};

export const useScanBarcode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      barcodeString: string;
      scannedAt?: string;
      location?: string;
      scannedBy?: string;
    }) => barcodeService.scanBarcode(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barcode-scan-log'] });
    },
  });
};

export const useGenerateWristband = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (patientId: string) => barcodeService.generateWristband(patientId),
    onError: () => {
      message.error('Failed to generate wristband');
    },
  });
};
