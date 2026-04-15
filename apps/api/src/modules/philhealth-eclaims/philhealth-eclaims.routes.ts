import { Router } from 'express';
import {
  verifyEligibility,
  submitClaim,
  getClaimStatus,
  requestAuthorization,
  getEligibilityLog,
  getPhilHealthConfig,
} from './philhealth-eclaims.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Public: config (no auth required — used by frontend to show/hide indicators)
router.get('/philhealth/config', getPhilHealthConfig);

router.use(authenticate);

router.post('/philhealth/verify-eligibility', verifyEligibility);
router.post('/philhealth/submit-claim', submitClaim);
router.get('/philhealth/claim-status/:claimId', getClaimStatus);
router.post('/philhealth/request-authorization', requestAuthorization);
router.get('/philhealth/eligibility-log', getEligibilityLog);

export default router;
