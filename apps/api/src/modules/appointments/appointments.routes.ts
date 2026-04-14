import { Router } from 'express';
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  getDoctorAvailability,
  getTodayAppointments,
} from './appointments.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/appointments/today', getTodayAppointments);
router.get('/appointments/availability/:doctorId', getDoctorAvailability);
router.get('/appointments', getAppointments);
router.post('/appointments', createAppointment);
router.get('/appointments/:id', getAppointment);
router.put('/appointments/:id', updateAppointment);
router.delete('/appointments/:id', cancelAppointment);

export default router;
