import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { listAuditLogs } from './audit.controller';

const router = Router();

router.get('/audit-logs', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), listAuditLogs);

export default router;
