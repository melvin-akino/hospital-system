import { Router } from 'express';
import {
  getMachines,
  createMachine,
  updateMachine,
  getTodaySchedule,
  getSessions,
  getSession,
  scheduleSession,
  startSession,
  endSession,
  getPatientSessions,
} from './dialysis.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Dialysis Machines
router.get('/dialysis-machines', getMachines);
router.post('/dialysis-machines', createMachine);
router.put('/dialysis-machines/:id', updateMachine);

// Today's schedule
router.get('/dialysis/schedule', getTodaySchedule);

// Sessions — specific paths before /:id
router.get('/dialysis-sessions', getSessions);
router.post('/dialysis-sessions', scheduleSession);
router.get('/dialysis-sessions/:id', getSession);
router.put('/dialysis-sessions/:id/start', startSession);
router.put('/dialysis-sessions/:id/end', endSession);

// Patient session history
router.get('/dialysis-patients/:patientId/sessions', getPatientSessions);

export default router;
