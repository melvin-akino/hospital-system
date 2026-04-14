import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  getAssignedPatients,
  getTaskList,
  completeTask,
  recordVitals,
  getCareplan,
  saveCareplan,
  saveHandover,
  getLatestHandover,
} from './nurses.controller';

const router = Router();

router.use(authenticate);

router.get('/nurses/patients', getAssignedPatients);
router.get('/nurses/tasks', getTaskList);
router.post('/nurses/tasks/:taskId/complete', completeTask);
router.post('/nurses/vitals', recordVitals);
router.get('/nurses/care-plans/:patientId', getCareplan);
router.post('/nurses/care-plans', saveCareplan);
router.get('/nurses/shift-handover/latest', getLatestHandover);
router.post('/nurses/shift-handover', saveHandover);

export default router;
