import { Router } from 'express';
import { login, logout, getMe, register } from './auth.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginSchema, registerSchema } from '@pibs/shared';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post(
  '/register',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  validate(registerSchema),
  register
);

export default router;
