import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labService } from '../services/labService';
import { App } from 'antd';

export const useLabTestTemplates = () =>
  useQuery({
    queryKey: ['lab-test-templates'],
    queryFn: labService.getTestTemplates,
    staleTime: Infinity,
  });

export const useLabRequisitions = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['lab-requisitions', params],
    queryFn: () => labService.getRequisitions(params),
  });

export const useLabRequisition = (id: string) =>
  useQuery({
    queryKey: ['lab-requisition', id],
    queryFn: () => labService.getRequisition(id),
    enabled: !!id,
  });

export const useCreateRequisition = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: labService.createRequisition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-requisitions'] });
      message.success('Lab requisition created');
    },
    onError: () => message.error('Failed to create requisition'),
  });
};

export const useUpdateRequisitionStatus = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      labService.updateRequisitionStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-requisitions'] });
      message.success('Status updated');
    },
    onError: () => message.error('Failed to update status'),
  });
};

export const useLabResults = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['lab-results', params],
    queryFn: () => labService.getResults(params),
  });

export const useLabResult = (id: string) =>
  useQuery({
    queryKey: ['lab-result', id],
    queryFn: () => labService.getResult(id),
    enabled: !!id,
  });

export const usePatientLabResults = (patientId: string) =>
  useQuery({
    queryKey: ['patient-lab-results', patientId],
    queryFn: () => labService.getPatientResults(patientId),
    enabled: !!patientId,
  });

export const useEnterResults = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: labService.enterResults,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lab-results'] });
      qc.invalidateQueries({ queryKey: ['lab-requisitions'] });
      message.success('Results entered successfully');
    },
    onError: () => message.error('Failed to enter results'),
  });
};

export const useRadiologyOrders = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['radiology-orders', params],
    queryFn: () => labService.getRadiologyOrders(params),
  });

export const useCreateRadiologyOrder = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: labService.createRadiologyOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radiology-orders'] });
      message.success('Radiology order created');
    },
    onError: () => message.error('Failed to create radiology order'),
  });
};

export const useUploadRadiologyReport = () => {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: labService.uploadRadiologyReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radiology-orders'] });
      message.success('Report saved');
    },
    onError: () => message.error('Failed to save report'),
  });
};
