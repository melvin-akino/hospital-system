import { Router } from 'express';
import {
  getStats,
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  getMaintenanceHistory,
  logMaintenance,
  depreciate,
} from './assets.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Stats must be before /:id
router.get('/assets/stats', getStats);

// Assets
router.get('/assets', getAssets);
router.post('/assets', createAsset);
router.get('/assets/:id', getAsset);
router.put('/assets/:id', updateAsset);

// Maintenance
router.get('/assets/:id/maintenance', getMaintenanceHistory);
router.post('/assets/:id/maintenance', logMaintenance);

// Depreciation
router.post('/assets/:id/depreciate', depreciate);

export default router;
