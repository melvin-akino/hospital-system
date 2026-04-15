import { Router } from 'express';
import {
  getPublicBranding,
  getAllSettings,
  updateSettings,
  uploadLogo,
  deleteLogo,
  logoUploadMiddleware,
} from './settings.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Public — no auth (login page needs branding before login)
router.get('/settings/branding', getPublicBranding);

// Authenticated admin only
router.get('/settings', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), getAllSettings);
router.put('/settings', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), updateSettings);
router.post('/settings/logo', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), logoUploadMiddleware, uploadLogo);
router.delete('/settings/logo', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), deleteLogo);

export default router;
