import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';

export const useDashboardKPIs = () =>
  useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => analyticsService.getDashboardKPIs(),
    refetchInterval: 60000, // refresh every minute
  });

export const useRevenueAnalytics = (params?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month';
}) =>
  useQuery({
    queryKey: ['analytics-revenue', params],
    queryFn: () => analyticsService.getRevenueAnalytics(params),
  });

export const usePatientStatistics = () =>
  useQuery({
    queryKey: ['analytics-patients'],
    queryFn: () => analyticsService.getPatientStatistics(),
  });

export const useDoctorPerformance = () =>
  useQuery({
    queryKey: ['analytics-doctors'],
    queryFn: () => analyticsService.getDoctorPerformance(),
  });

export const useDepartmentPerformance = () =>
  useQuery({
    queryKey: ['analytics-departments'],
    queryFn: () => analyticsService.getDepartmentPerformance(),
  });
