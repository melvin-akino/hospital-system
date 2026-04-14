import { Router } from 'express';
import {
  getDashboardKPIs,
  getRevenueAnalytics,
  getPatientStatistics,
  getDoctorPerformance,
  getDepartmentPerformance,
} from './analytics.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/analytics/dashboard', getDashboardKPIs);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/patient-statistics', getPatientStatistics);
router.get('/analytics/doctor-performance', getDoctorPerformance);
router.get('/analytics/department-performance', getDepartmentPerformance);

export default router;
