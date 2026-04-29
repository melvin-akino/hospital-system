import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { createSale, getSales, getSale, getZReport, voidSale } from './pharmacy-pos.controller';

const router = Router();

router.use(authenticate);

router.get('/pharmacy/pos/z-report', authorize('SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'PHARMACIST'), getZReport);
router.get('/pharmacy/pos/sales',    getSales);
router.post('/pharmacy/pos/sales',   authorize('SUPER_ADMIN', 'ADMIN', 'PHARMACIST'), createSale);
router.get('/pharmacy/pos/sales/:id', getSale);
router.post('/pharmacy/pos/sales/:id/void', authorize('SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'PHARMACIST'), voidSale);

export default router;
