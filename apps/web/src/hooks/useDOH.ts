import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dohService } from '../services/dohService';
import { App } from 'antd';

export const useFHSISReport = (params: { month: number; year: number }, enabled = false) =>
  useQuery({
    queryKey: ['fhsis-report', params],
    queryFn: () => dohService.generateFHSIS(params),
    enabled,
  });

export const usePIDSRReport = (
  params: { dateFrom?: string; dateTo?: string },
  enabled = false
) =>
  useQuery({
    queryKey: ['pidsr-report', params],
    queryFn: () => dohService.generatePIDSR(params),
    enabled,
  });

export const useDiseaseCases = (
  params: { icdCode: string; dateFrom?: string; dateTo?: string },
  enabled = false
) =>
  useQuery({
    queryKey: ['disease-cases', params],
    queryFn: () => dohService.getDiseaseCases(params),
    enabled: enabled && !!params.icdCode,
  });

export const useSubmissionHistory = () =>
  useQuery({
    queryKey: ['doh-submission-history'],
    queryFn: () => dohService.getSubmissionHistory(),
  });

export const useLogDohSubmission = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: { reportType: string; period: string; notes?: string }) =>
      dohService.logSubmission(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doh-submission-history'] });
      message.success('DOH submission logged');
    },
    onError: () => {
      message.error('Failed to log submission');
    },
  });
};
