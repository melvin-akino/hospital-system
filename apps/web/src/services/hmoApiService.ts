import api from '../lib/api';
import { ApiResponse } from '../types';

export interface HmoEligibilityResult {
  eligible: boolean;
  memberNo: string | null;
  plan: string | null;
  coverageDetails: Record<string, unknown>;
  validUntil: string | null;
  hmoName: string;
  patientName: string;
  patientNo: string;
  checkedAt: string;
}

export interface HmoAuthorizationResult {
  authorizationNo: string;
  hmoName: string;
  hmoCode: string;
  patientName: string;
  patientNo: string;
  procedureCodes: string[];
  diagnosis?: string;
  estimatedAmount: number;
  approvedAmount: number;
  validUntil: string;
  issuedAt: string;
  conditions: string[];
}

export interface HmoClaimSubmitResult {
  success: boolean;
  referenceNo: string;
  claimNo: string;
  hmoName: string;
  submittedAt: string;
  message: string;
}

export interface HmoClaimStatusResult {
  claimId: string;
  claimNo: string;
  status: string;
  amount: number;
  hmoName: string;
  hmoCode: string;
  submittedAt?: string;
  approvedAt?: string;
  timeline: Array<{ step: string; date: string | null; done: boolean }>;
}

export const hmoApiService = {
  verifyEligibility: async (hmoId: string, patientId: string) => {
    const res = await api.post<ApiResponse<HmoEligibilityResult>>(
      `/hmo/${hmoId}/verify-eligibility/${patientId}`
    );
    return res.data;
  },

  requestAuthorization: async (
    hmoId: string,
    data: {
      patientId: string;
      procedureCodes?: string[];
      estimatedAmount: number;
      diagnosis?: string;
    }
  ) => {
    const res = await api.post<ApiResponse<HmoAuthorizationResult>>(
      `/hmo/${hmoId}/request-authorization`,
      data
    );
    return res.data;
  },

  submitClaim: async (hmoId: string, claimId: string) => {
    const res = await api.post<ApiResponse<HmoClaimSubmitResult>>(`/hmo/${hmoId}/submit-claim`, {
      claimId,
    });
    return res.data;
  },

  getClaimStatus: async (hmoId: string, claimId: string) => {
    const res = await api.get<ApiResponse<HmoClaimStatusResult>>(
      `/hmo/${hmoId}/claim-status/${claimId}`
    );
    return res.data;
  },
};
