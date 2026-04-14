import api from '../lib/api';

export interface HieConsent {
  id: string;
  patientId: string;
  consentType: 'SHARE' | 'RESTRICT';
  authorizedHospital?: string;
  notes?: string;
  hasConsent: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HieRequest {
  id: string;
  requestNo: string;
  patientId: string;
  requestingFacility: string;
  requestedFacility: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  createdAt: string;
  patient?: { patientNo: string; firstName: string; lastName: string };
}

export interface HieReferral {
  id: string;
  referralNo: string;
  patientId: string;
  referringDoctor: string;
  receivingFacility: string;
  reason: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: 'SENT' | 'RECEIVED' | 'COMPLETED';
  createdAt: string;
  patient?: { patientNo: string; firstName: string; lastName: string };
}

export interface AuditEntry {
  id: string;
  action: string;
  patientId: string;
  performedBy: string;
  facility: string;
  details: string;
  createdAt: string;
}

export const hieService = {
  recordConsent: (data: {
    patientId: string;
    consentType: 'SHARE' | 'RESTRICT';
    authorizedHospital?: string;
    notes?: string;
  }): Promise<HieConsent> =>
    api.post('/hie/consent', data).then((r) => r.data.data),
  getConsent: (patientId: string): Promise<HieConsent> =>
    api.get(`/hie/consent/${patientId}`).then((r) => r.data.data),
  requestRecords: (data: {
    patientId: string;
    requestingFacility: string;
    requestedFacility: string;
    reason: string;
  }): Promise<HieRequest> =>
    api.post('/hie/request-records', data).then((r) => r.data.data),
  getRequests: (): Promise<HieRequest[]> =>
    api.get('/hie/requests').then((r) => r.data.data),
  sendReferral: (data: {
    patientId: string;
    referringDoctor: string;
    receivingFacility: string;
    reason: string;
    urgency?: string;
  }) =>
    api.post('/hie/send-referral', data).then((r) => r.data.data),
  getReferrals: (): Promise<HieReferral[]> =>
    api.get('/hie/referrals').then((r) => r.data.data),
  getFhirBundle: (patientId: string) =>
    api.get(`/hie/patient-bundle/${patientId}`).then((r) => r.data.data),
  getAuditLog: (): Promise<AuditEntry[]> =>
    api.get('/hie/audit-log').then((r) => r.data.data),
};
