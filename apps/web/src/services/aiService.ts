import api from '../lib/api';

export const aiService = {
  // ── Existing ──────────────────────────────────────────────────────────────
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

  getConfig: () =>
    api.get('/ai/config').then(r => r.data.data),

  // ── Phase 1 — AI Documentation Suite ─────────────────────────────────────

  /** Generate a SOAP note for a patient encounter */
  generateSOAPNote: (patientId: string, consultationId?: string) =>
    api.post('/ai/soap-note', { patientId, consultationId }).then(r => r.data.data),

  /** Interpret lab results in the context of the patient's clinical picture */
  interpretLabResults: (
    patientId: string,
    options?: { labResultIds?: string[]; requisitionId?: string }
  ) =>
    api.post('/ai/interpret-labs', { patientId, ...options }).then(r => r.data.data),

  /** Generate a discharge summary for a completed admission */
  generateDischargeSummary: (patientId: string, admissionId: string) =>
    api.post('/ai/discharge-summary', { patientId, admissionId }).then(r => r.data.data),
};
