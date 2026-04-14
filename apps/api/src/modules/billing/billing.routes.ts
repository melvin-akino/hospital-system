import { Router } from 'express';
import {
  createBill,
  getBills,
  getBill,
  updateBill,
  addPayment,
  finalizeBill,
  cancelBill,
  getPayments,
  getBillReceipt,
  applyDiscount,
} from './billing.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createBillSchema, addPaymentSchema } from '@pibs/shared';

const router = Router();

router.use(authenticate);

router.get('/', getBills);
router.post('/', validate(createBillSchema), createBill);
router.get('/:id', getBill);
router.put('/:id', updateBill);
router.post('/:id/payment', validate(addPaymentSchema), addPayment);
router.post('/:id/finalize', finalizeBill);
router.post('/:id/cancel', cancelBill);
router.get('/:id/payments', getPayments);
router.get('/:id/receipt', getBillReceipt);
router.post('/:id/discount', applyDiscount);

export default router;
