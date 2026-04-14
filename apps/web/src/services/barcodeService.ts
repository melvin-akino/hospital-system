import api from '../lib/api';
import { ApiResponse } from '../types';

export interface BarcodeGenerateResult {
  barcodeString: string;
  barcodeType: string;
  referenceId: string;
  refLabel: string;
  generatedAt: string;
}

export interface BarcodeScanResult {
  scanId: string;
  resolved: boolean;
  type: string | null;
  details: Record<string, unknown> | null;
  barcodeString: string;
  scannedAt: string;
  location: string | null;
}

export interface BarcodeScanEntry {
  id: string;
  barcodeString: string;
  scannedAt: string;
  location?: string;
  scannedBy?: string;
  resolved: boolean;
  type?: string;
  details?: Record<string, unknown>;
}

export interface WristbandData {
  patientId: string;
  patientNo: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string | null;
  allergies: Array<{ allergen: string; severity: string; reaction?: string }>;
  philhealthNo: string | null;
  barcodeString: string;
  generatedAt: string;
}

export const barcodeService = {
  generateBarcode: async (data: { type: string; referenceId: string }) => {
    const res = await api.post<ApiResponse<BarcodeGenerateResult>>('/barcodes/generate', data);
    return res.data;
  },

  scanBarcode: async (data: {
    barcodeString: string;
    scannedAt?: string;
    location?: string;
    scannedBy?: string;
  }) => {
    const res = await api.post<ApiResponse<BarcodeScanResult>>('/barcodes/scan', data);
    return res.data;
  },

  getBarcodeDetails: async (barcodeString: string) => {
    const res = await api.get<ApiResponse>(`/barcodes/${encodeURIComponent(barcodeString)}/details`);
    return res.data;
  },

  getScanLog: async () => {
    const res = await api.get<ApiResponse<BarcodeScanEntry[]>>('/barcodes/scan-log');
    return res.data;
  },

  generateWristband: async (patientId: string) => {
    const res = await api.post<ApiResponse<WristbandData>>(
      `/barcodes/patient-wristband/${patientId}`
    );
    return res.data;
  },
};
