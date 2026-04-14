import { Router } from 'express';
import {
  initiateGcash,
  initiateMaya,
  initiateCard,
  getPaymentStatus,
  handleWebhook,
  simulateConfirm,
  getTransactions,
} from './payments.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Webhook does not require authentication (called by payment provider)
router.post('/payments/online/webhook', handleWebhook);

router.use(authenticate);

router.post('/payments/online/gcash', initiateGcash);
router.post('/payments/online/maya', initiateMaya);
router.post('/payments/online/card', initiateCard);
router.get('/payments/online/transactions', getTransactions);
router.get('/payments/online/:paymentIntentId/status', getPaymentStatus);
router.post('/payments/online/:paymentIntentId/simulate-confirm', simulateConfirm);

export default router;
