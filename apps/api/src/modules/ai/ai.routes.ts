import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  diagnose,
  checkDrugInteractions,
  predictReadmissionRisk,
  checkAllergiesContraindications,
  analyzeVitalSigns,
} from './ai.controller';
import { isAIEnabled } from './ai.service';
import { successResponse } from '../../utils/response';

const router = Router();

// Public: AI capability config (used by frontend to show AI badge)
router.get('/ai/config', (_req, res) => {
  successResponse(res, { aiEnabled: isAIEnabled(), model: process.env['AI_MODEL'] || 'claude-haiku-4-5-20251001' });
});

router.use(authenticate);

router.post('/ai/diagnose', diagnose);
router.post('/ai/check-interactions', checkDrugInteractions);
router.post('/ai/predict-readmission-risk', predictReadmissionRisk);
router.post('/ai/check-allergies', checkAllergiesContraindications);
router.post('/ai/vital-signs-analysis', analyzeVitalSigns);

export default router;
