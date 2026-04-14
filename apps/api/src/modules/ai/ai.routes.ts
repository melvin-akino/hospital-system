import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  diagnose,
  checkDrugInteractions,
  predictReadmissionRisk,
  checkAllergiesContraindications,
  analyzeVitalSigns,
} from './ai.controller';

const router = Router();

router.use(authenticate);

router.post('/ai/diagnose', diagnose);
router.post('/ai/check-interactions', checkDrugInteractions);
router.post('/ai/predict-readmission-risk', predictReadmissionRisk);
router.post('/ai/check-allergies', checkAllergiesContraindications);
router.post('/ai/vital-signs-analysis', analyzeVitalSigns);

export default router;
