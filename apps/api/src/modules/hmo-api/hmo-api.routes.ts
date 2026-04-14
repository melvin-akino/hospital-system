import { Router } from 'express';
import {
  verifyHmoEligibility,
  requestAuthorization,
  submitClaim,
  getClaimStatus,
} from './hmo-api.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/hmo/:hmoId/verify-eligibility/:patientId', verifyHmoEligibility);
router.post('/hmo/:hmoId/request-authorization', requestAuthorization);
router.post('/hmo/:hmoId/submit-claim', submitClaim);
router.get('/hmo/:hmoId/claim-status/:claimId', getClaimStatus);

export default router;
