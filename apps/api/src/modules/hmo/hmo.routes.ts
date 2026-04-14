import { Router } from 'express';
import {
  getHmoCompanies,
  registerPatientHmo,
  getPatientHmo,
  getHmoRegistration,
  updateHmoRegistration,
  checkEligibility,
  createClaim,
  getClaims,
  getClaim,
  updateClaimStatus,
} from './hmo.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/hmo-companies', getHmoCompanies);

router.post('/hmo-registrations', registerPatientHmo);
router.get('/hmo-registrations', getPatientHmo);
router.get('/hmo-registrations/:id', getHmoRegistration);
router.put('/hmo-registrations/:id', updateHmoRegistration);

router.get('/hmo-eligibility/:patientId', checkEligibility);

router.post('/hmo-claims', createClaim);
router.get('/hmo-claims', getClaims);
router.get('/hmo-claims/:id', getClaim);
router.put('/hmo-claims/:id', updateClaimStatus);

export default router;
