import { Router } from 'express';
import {
  getSurgeries,
  getSurgery,
  scheduleSurgery,
  updateSurgery,
  cancelSurgery,
  getChecklist,
  getORAvailability,
} from './or.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// OR Availability
router.get('/or-availability', getORAvailability);

// Surgeries
router.get('/surgeries', getSurgeries);
router.post('/surgeries', scheduleSurgery);
router.get('/surgeries/:id', getSurgery);
router.put('/surgeries/:id', updateSurgery);
router.put('/surgeries/:id/cancel', cancelSurgery);
router.get('/surgeries/:id/checklist', getChecklist);

export default router;
