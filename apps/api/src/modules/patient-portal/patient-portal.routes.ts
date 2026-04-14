import { Router } from 'express';
import {
  login,
  getMe,
  getMedicalRecords,
  getLabResults,
  getAppointments,
  bookAppointment,
  getBills,
  getVitalSigns,
  patientPortalAuth,
} from './patient-portal.controller';

const router = Router();

// Public — no authentication
router.post('/patient-portal/login', login);

// Protected — patient portal JWT required
router.get('/patient-portal/me', patientPortalAuth, getMe);
router.get('/patient-portal/medical-records', patientPortalAuth, getMedicalRecords);
router.get('/patient-portal/lab-results', patientPortalAuth, getLabResults);
router.get('/patient-portal/appointments', patientPortalAuth, getAppointments);
router.post('/patient-portal/appointments', patientPortalAuth, bookAppointment);
router.get('/patient-portal/bills', patientPortalAuth, getBills);
router.get('/patient-portal/vital-signs', patientPortalAuth, getVitalSigns);

export default router;
