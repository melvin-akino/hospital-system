import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  listPrescriptions, getPrescription,
  createPrescription, updatePrescription, cancelPrescription,
} from './prescriptions.controller';

const router = Router();
router.use(authenticate);

router.get('/prescriptions',            listPrescriptions);
router.post('/prescriptions',           createPrescription);
router.get('/prescriptions/:id',        getPrescription);
router.put('/prescriptions/:id',        updatePrescription);
router.delete('/prescriptions/:id',     cancelPrescription);

export default router;
