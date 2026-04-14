import { useMutation } from '@tanstack/react-query';
import { aiService } from '../services/aiService';
import { App } from 'antd';

export const useDiagnose = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: aiService.diagnose,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Diagnosis analysis failed';
      message.error(msg);
    },
  });
};

export const useCheckInteractions = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: aiService.checkInteractions,
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Interaction check failed';
      message.error(msg);
    },
  });
};

export const usePredictReadmission = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (patientId: string) => aiService.predictReadmission(patientId),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Readmission prediction failed';
      message.error(msg);
    },
  });
};

export const useCheckAllergies = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ patientId, medicationId }: { patientId: string; medicationId: string }) =>
      aiService.checkAllergies(patientId, medicationId),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Allergy check failed';
      message.error(msg);
    },
  });
};

export const useAnalyzeVitals = () => {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (patientId: string) => aiService.analyzeVitals(patientId),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Vitals analysis failed';
      message.error(msg);
    },
  });
};
