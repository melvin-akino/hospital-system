import { Router } from 'express';
import {
  getSessions,
  getSession,
  bookSession,
  updateSession,
  startSession,
  endSession,
  cancelSession,
  getStats,
} from './telemedicine.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Static routes before parameterized
router.get('/telemedicine-sessions/stats', getStats);
router.get('/telemedicine-sessions', getSessions);
router.post('/telemedicine-sessions', bookSession);
router.get('/telemedicine-sessions/:id', getSession);
router.put('/telemedicine-sessions/:id', updateSession);
router.put('/telemedicine-sessions/:id/start', startSession);
router.put('/telemedicine-sessions/:id/end', endSession);
router.put('/telemedicine-sessions/:id/cancel', cancelSession);

export default router;
