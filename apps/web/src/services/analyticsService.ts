import api from '../lib/api';
import { ApiResponse } from '../types';

export interface DashboardKPIs {
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  todayPatients: number;
  monthPatients: number;
  totalPatients: number;
  todayConsultations: number;
  monthConsultations: number;
  pendingBills: number;
  pendingLabResults: number;
  pendingPhilHealthClaims: number;
  occupancyRate: number;
}

export interface RevenueAnalytics {
  series: Array<{ date: string; amount: number }>;
  byDoctor: Array<{ doctorName: string; amount: number }>;
  byService: Array<{ serviceName: string; amount: number }>;
  byDepartment: Array<{ deptName: string; amount: number }>;
}

export interface PatientStatistics {
  byGender: { male: number; female: number; other: number };
  byAgeGroup: Array<{ group: string; count: number }>;
  newPatientsThisMonth: number;
  totalPatients: number;
  seniorCount: number;
  pwdCount: number;
  topDiagnoses: Array<{ icdCode: string; count: number }>;
}

export interface DoctorPerformance {
  id: string;
  doctorName: string;
  specialty: string;
  totalConsultations: number;
  totalRevenue: number;
  avgConsultationsPerDay: number;
}

export interface DepartmentPerformance {
  deptName: string;
  totalConsultations: number;
  totalRevenue: number;
  totalAdmissions: number;
}

export const analyticsService = {
  getDashboardKPIs: async () => {
    const res = await api.get<ApiResponse<DashboardKPIs>>('/analytics/dashboard');
    return res.data;
  },

  getRevenueAnalytics: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) => {
    const res = await api.get<ApiResponse<RevenueAnalytics>>('/analytics/revenue', { params });
    return res.data;
  },

  getPatientStatistics: async () => {
    const res = await api.get<ApiResponse<PatientStatistics>>('/analytics/patient-statistics');
    return res.data;
  },

  getDoctorPerformance: async () => {
    const res = await api.get<ApiResponse<DoctorPerformance[]>>('/analytics/doctor-performance');
    return res.data;
  },

  getDepartmentPerformance: async () => {
    const res = await api.get<ApiResponse<DepartmentPerformance[]>>('/analytics/department-performance');
    return res.data;
  },
};
