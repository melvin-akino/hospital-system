import { Router } from 'express';
import {
  createConsultation,
  getConsultations,
  getConsultation,
  updateConsultation,
  deleteConsultation,
  completeConsultation,
  getConsultationBill,
} from './consultation.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createConsultationSchema, updateConsultationSchema } from '@pibs/shared';

const router = Router();

router.use(authenticate);

router.get('/', getConsultations);
router.post('/', validate(createConsultationSchema), createConsultation);
router.get('/:id', getConsultation);
router.put('/:id', validate(updateConsultationSchema), updateConsultation);
router.delete('/:id', deleteConsultation);
router.post('/:id/complete', completeConsultation);
router.get('/:id/bill', getConsultationBill);

export default router;
