import api from '../lib/api';

export const aiService = {
  diagnose: (data: { symptoms: string[]; age: number; gender: string }) =>
    api.post('/ai/diagnose', data).then(r => r.data.data),
  checkInteractions: (drugIds: string[]) =>
    api.post('/ai/check-interactions', { drugIds }).then(r => r.data.data),
  predictReadmission: (patientId: string) =>
    api.post('/ai/predict-readmission-risk', { patientId }).then(r => r.data.data),
  checkAllergies: (patientId: string, medicationId: string) =>
    api.post('/ai/check-allergies', { patientId, medicationId }).then(r => r.data.data),
  analyzeVitals: (patientId: string) =>
    api.post('/ai/vital-signs-analysis', { patientId }).then(r => r.data.data),
};
