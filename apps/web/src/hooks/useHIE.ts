import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hieService } from '../services/hieService';
import { App } from 'antd';

export const useHieConsent = (patientId: string) =>
  useQuery({
    queryKey: ['hie-consent', patientId],
    queryFn: () => hieService.getConsent(patientId),
    enabled: !!patientId,
  });

export const useHieRequests = () =>
  useQuery({
    queryKey: ['hie-requests'],
    queryFn: () => hieService.getRequests(),
  });

export const useHieReferrals = () =>
  useQuery({
    queryKey: ['hie-referrals'],
    queryFn: () => hieService.getReferrals(),
  });

export const useHieAuditLog = () =>
  useQuery({
    queryKey: ['hie-audit-log'],
    queryFn: () => hieService.getAuditLog(),
  });

export const useFhirBundle = (patientId: string) =>
  useQuery({
    queryKey: ['fhir-bundle', patientId],
    queryFn: () => hieService.getFhirBundle(patientId),
    enabled: !!patientId,
  });

export const useRecordConsent = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: {
      patientId: string;
      consentType: 'SHARE' | 'RESTRICT';
      authorizedHospital?: string;
      notes?: string;
    }) => hieService.recordConsent(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['hie-consent', variables.patientId] });
      message.success('Consent recorded');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to record consent';
      message.error(msg);
    },
  });
};

export const useRequestRecords = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: {
      patientId: string;
      requestingFacility: string;
      requestedFacility: string;
      reason: string;
    }) => hieService.requestRecords(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hie-requests'] });
      message.success('Record request submitted');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit request';
      message.error(msg);
    },
  });
};

export const useSendReferral = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: {
      patientId: string;
      referringDoctor: string;
      receivingFacility: string;
      reason: string;
      urgency?: string;
    }) => hieService.sendReferral(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hie-referrals'] });
      message.success('Referral sent');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send referral';
      message.error(msg);
    },
  });
};
