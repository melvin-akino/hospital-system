import { Router } from 'express';
import {
  getDepartmentQueues,
  getQueueStatus,
  addToQueue,
  callNext,
  completeEntry,
  skipEntry,
  getAnalytics,
} from './queue.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/queues', getDepartmentQueues);
router.get('/queues/:departmentId/status', getQueueStatus);
router.post('/queues/:departmentId/add', addToQueue);
router.put('/queues/:departmentId/next', callNext);
router.get('/queues/:departmentId/analytics', getAnalytics);
router.put('/queue-entries/:id/complete', completeEntry);
router.put('/queue-entries/:id/skip', skipEntry);

export default router;
