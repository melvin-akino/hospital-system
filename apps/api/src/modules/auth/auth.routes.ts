import { Router } from 'express';
import {
  login,
  logout,
  getMe,
  register,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from './auth.controller';
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

// Profile management (own account)
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

// Password reset (public — no auth needed)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
