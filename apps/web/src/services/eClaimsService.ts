import api from '../lib/api';
import { ApiResponse } from '../types';

export interface EligibilityResult {
  eligible: boolean;
  memberName: string | null;
  memberType: string | null;
  status: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  message: string;
}

export interface EligibilityLogEntry {
  id: string;
  philhealthNo: string;
  lastName: string;
  dateOfBirth: string;
  eligible: boolean;
  memberName?: string;
  memberType?: string;
  status?: string;
  message: string;
  checkedAt: string;
}

export interface ClaimSubmitResult {
  success: boolean;
  transmittalNo: string;
  claimNo: string;
  message: string;
}

export interface ClaimStatusResult {
  claimId: string;
  claimNo: string;
  status: string;
  claimAmount: number;
  patient: { id: string; patientNo: string; firstName: string; lastName: string; philhealthNo?: string };
  submittedAt?: string;
  approvedAt?: string;
  timeline: Array<{ step: string; date: string | null; done: boolean }>;
}

export interface AuthorizationResult {
  authorizationNo: string;
  patientName: string;
  philhealthNo?: string;
  caseRate: { icdCode: string; description: string } | null;
  estimatedAmount: number;
  approvedAmount: number;
  validUntil: string;
  conditions: string[];
  issuedAt: string;
}

export const eClaimsService = {
  verifyEligibility: async (data: {
    philhealthNo: string;
    lastName: string;
    dateOfBirth: string;
  }) => {
    const res = await api.post<ApiResponse<EligibilityResult>>('/philhealth/verify-eligibility', data);
    return res.data;
  },

  submitClaim: async (claimId: string) => {
    const res = await api.post<ApiResponse<ClaimSubmitResult>>('/philhealth/submit-claim', { claimId });
    return res.data;
  },

  getClaimStatus: async (claimId: string) => {
    const res = await api.get<ApiResponse<ClaimStatusResult>>(`/philhealth/claim-status/${claimId}`);
    return res.data;
  },

  requestAuthorization: async (data: {
    patientId: string;
    caseRateId?: string;
    estimatedAmount: number;
    admissionDate?: string;
  }) => {
    const res = await api.post<ApiResponse<AuthorizationResult>>('/philhealth/request-authorization', data);
    return res.data;
  },

  getEligibilityLog: async () => {
    const res = await api.get<ApiResponse<EligibilityLogEntry[]>>('/philhealth/eligibility-log');
    return res.data;
  },
};
