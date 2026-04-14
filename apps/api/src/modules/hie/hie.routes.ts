import { Router } from 'express';
import {
  recordConsent,
  getConsent,
  requestRecords,
  getRequests,
  sendReferral,
  getReferrals,
  getFhirBundle,
  getAuditLog,
} from './hie.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/hie/consent', recordConsent);
router.get('/hie/consent/:patientId', getConsent);
router.post('/hie/request-records', requestRecords);
router.get('/hie/requests', getRequests);
router.post('/hie/send-referral', sendReferral);
router.get('/hie/referrals', getReferrals);
router.get('/hie/patient-bundle/:patientId', getFhirBundle);
router.get('/hie/audit-log', getAuditLog);

export default router;
