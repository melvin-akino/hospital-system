import api from '../lib/api';
import { ApiResponse } from '../types';

export interface AgeGroupStat {
  group: string;
  male: number;
  female: number;
  total: number;
}

export interface DiagnosisStat {
  icdCode: string;
  description: string;
  count: number;
}

export interface FHSISReport {
  reportingPeriod: { month: number; year: number };
  opd: {
    totalVisits: number;
    newCases: number;
    oldCases: number;
    byAgeGroup: AgeGroupStat[];
  };
  admissions: {
    total: number;
    byDiagnosis: DiagnosisStat[];
  };
  deaths: number;
  reportGeneratedAt: string;
}

export interface DiseaseEntry {
  disease: string;
  icdCode: string;
  cases: number;
  deaths: number;
  thisWeek: number;
  casesByWeek: Array<{ week: number; count: number }>;
}

export interface PIDSRReport {
  dateFrom: string;
  dateTo: string;
  diseases: DiseaseEntry[];
  reportGeneratedAt: string;
}

export interface DohSubmissionLog {
  id: string;
  reportType: string;
  period: string;
  notes?: string;
  submittedAt: string;
}

export const dohService = {
  generateFHSIS: async (params: { month: number; year: number }) => {
    const res = await api.get<ApiResponse<FHSISReport>>('/doh/fhsis-report', { params });
    return res.data;
  },

  generatePIDSR: async (params: { dateFrom?: string; dateTo?: string }) => {
    const res = await api.get<ApiResponse<PIDSRReport>>('/doh/pidsr-report', { params });
    return res.data;
  },

  getDiseaseCases: async (params: {
    icdCode: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const res = await api.get<ApiResponse>('/doh/disease-cases', { params });
    return res.data;
  },

  logSubmission: async (data: { reportType: string; period: string; notes?: string }) => {
    const res = await api.post<ApiResponse<DohSubmissionLog>>('/doh/fhsis-submission-log', data);
    return res.data;
  },

  getSubmissionHistory: async () => {
    const res = await api.get<ApiResponse<DohSubmissionLog[]>>('/doh/submission-history');
    return res.data;
  },
};
