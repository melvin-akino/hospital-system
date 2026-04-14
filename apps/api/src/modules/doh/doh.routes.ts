import { Router } from 'express';
import {
  generateFHSIS,
  generatePIDSR,
  getDiseaseCases,
  logSubmission,
  getSubmissionHistory,
} from './doh.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/doh/fhsis-report', generateFHSIS);
router.get('/doh/pidsr-report', generatePIDSR);
router.get('/doh/disease-cases', getDiseaseCases);
router.post('/doh/fhsis-submission-log', logSubmission);
router.get('/doh/submission-history', getSubmissionHistory);

export default router;
