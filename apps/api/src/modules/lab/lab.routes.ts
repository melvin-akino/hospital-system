import { Router } from 'express';
import {
  getTestTemplates,
  createRequisition,
  getRequisitions,
  getRequisition,
  updateRequisitionStatus,
  enterResults,
  getResults,
  getResult,
  getPatientResults,
  createRadiologyOrder,
  getRadiologyOrders,
  uploadRadiologyReport,
} from './lab.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Test templates — accessible at /api/lab/test-templates
router.get('/lab/test-templates', getTestTemplates);

router.post('/lab-requisitions', createRequisition);
router.get('/lab-requisitions', getRequisitions);
router.get('/lab-requisitions/:id', getRequisition);
router.put('/lab-requisitions/:id/status', updateRequisitionStatus);

router.post('/lab-results', enterResults);
router.get('/lab-results', getResults);
router.get('/lab-results/:id', getResult);

router.get('/patients/:id/lab-results', getPatientResults);

router.post('/radiology-orders', createRadiologyOrder);
router.get('/radiology-orders', getRadiologyOrders);
router.post('/radiology-reports', uploadRadiologyReport);

export default router;
