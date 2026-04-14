import { Router } from 'express';
import {
  createDoctor,
  getDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorSchedules,
  createSchedule,
  updateSchedule,
} from './doctor.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDoctorSchema, updateDoctorSchema, createScheduleSchema } from '@pibs/shared';

const router = Router();

router.use(authenticate);

router.get('/', getDoctors);
router.post('/', validate(createDoctorSchema), createDoctor);
router.get('/:id', getDoctor);
router.put('/:id', validate(updateDoctorSchema), updateDoctor);
router.delete('/:id', deleteDoctor);
router.get('/:id/schedules', getDoctorSchedules);
router.post('/:id/schedules', validate(createScheduleSchema), createSchedule);
router.put('/:id/schedules/:scheduleId', updateSchedule);

export default router;
