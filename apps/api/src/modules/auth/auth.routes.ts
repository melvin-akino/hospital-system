import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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

// ── Auth-specific rate limiters ───────────────────────────────────────────────
// Tight limit on login: 10 attempts per 15 min per IP (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Password reset request: 3 per hour per IP (prevents email flooding)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again in 1 hour.' },
});

// Password reset submission: 5 per hour per IP
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset attempts. Please try again in 1 hour.' },
});

// Change password: 5 per 15 min per IP (authenticated, but still throttled)
const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password change attempts. Please try again shortly.' },
});

router.post('/login', loginLimiter, validate(loginSchema), login);
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
router.put('/change-password', authenticate, changePasswordLimiter, changePassword);

// Password reset (public — no auth needed)
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

export default router;
