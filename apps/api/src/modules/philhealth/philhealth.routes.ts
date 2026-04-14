import { Router } from 'express';
import {
  getCaseRates,
  getClaims,
  getClaim,
  createClaim,
  updateClaim,
  generateCF4,
  getStats,
} from './philhealth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Case rates
router.get('/philhealth/case-rates', getCaseRates);

// Claims stats (must be before /:id)
router.get('/philhealth-claims/stats', getStats);

// Claims CRUD
router.get('/philhealth-claims', getClaims);
router.post('/philhealth-claims', createClaim);
router.get('/philhealth-claims/:id', getClaim);
router.put('/philhealth-claims/:id', updateClaim);
router.post('/philhealth-claims/:id/generate-cf4', generateCF4);

export default router;
