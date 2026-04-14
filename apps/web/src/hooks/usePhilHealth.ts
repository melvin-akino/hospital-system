import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { philhealthService, CreateClaimData } from '../services/philhealthService';
import { eClaimsService } from '../services/eClaimsService';
import { App } from 'antd';

export const usePhilHealthCaseRates = (q?: string) =>
  useQuery({
    queryKey: ['philhealth-case-rates', q],
    queryFn: () => philhealthService.getCaseRates(q),
  });

export const usePhilHealthClaims = (params?: {
  status?: string;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ['philhealth-claims', params],
    queryFn: () => philhealthService.getClaims(params),
  });

export const usePhilHealthClaim = (id: string) =>
  useQuery({
    queryKey: ['philhealth-claim', id],
    queryFn: () => philhealthService.getClaim(id),
    enabled: !!id,
  });

export const usePhilHealthStats = () =>
  useQuery({
    queryKey: ['philhealth-stats'],
    queryFn: () => philhealthService.getStats(),
  });

export const useCreatePhilHealthClaim = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: CreateClaimData) => philhealthService.createClaim(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['philhealth-claims'] });
      qc.invalidateQueries({ queryKey: ['philhealth-stats'] });
      qc.invalidateQueries({ queryKey: ['bills'] });
      message.success('PhilHealth claim created');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create claim';
      message.error(msg);
    },
  });
};

export const useUpdatePhilHealthClaim = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { status?: string; notes?: string };
    }) => philhealthService.updateClaim(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['philhealth-claims'] });
      qc.invalidateQueries({ queryKey: ['philhealth-claim', variables.id] });
      qc.invalidateQueries({ queryKey: ['philhealth-stats'] });
      message.success('Claim updated');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update claim';
      message.error(msg);
    },
  });
};

export const useGenerateCF4 = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, claimNo }: { id: string; claimNo: string }) =>
      philhealthService.generateCF4(id, claimNo),
    onSuccess: () => {
      message.success('CF4 XML downloaded');
    },
    onError: () => {
      message.error('Failed to generate CF4');
    },
  });
};

// ============ eClaims API hooks ============

export const useVerifyEligibility = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: { philhealthNo: string; lastName: string; dateOfBirth: string }) =>
      eClaimsService.verifyEligibility(data),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Eligibility verification failed';
      message.error(msg);
    },
  });
};

export const useSubmitClaim = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (claimId: string) => eClaimsService.submitClaim(claimId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['philhealth-claims'] });
      message.success(`Claim submitted. Transmittal: ${data.data?.transmittalNo}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit claim';
      message.error(msg);
    },
  });
};

export const usePhilHealthClaimStatus = (claimId: string) =>
  useQuery({
    queryKey: ['philhealth-claim-status', claimId],
    queryFn: () => eClaimsService.getClaimStatus(claimId),
    enabled: !!claimId,
    refetchInterval: 30_000,
  });

export const useRequestAuth = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: {
      patientId: string;
      caseRateId?: string;
      estimatedAmount: number;
      admissionDate?: string;
    }) => eClaimsService.requestAuthorization(data),
    onSuccess: (data) => {
      message.success(`Authorization issued: ${data.data?.authorizationNo}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Authorization request failed';
      message.error(msg);
    },
  });
};

export const useEligibilityLog = () =>
  useQuery({
    queryKey: ['philhealth-eligibility-log'],
    queryFn: () => eClaimsService.getEligibilityLog(),
    refetchInterval: 30_000,
  });
