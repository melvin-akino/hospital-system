import { Router } from 'express';
import {
  getDonors,
  registerDonor,
  updateDonor,
  getBloodInventory,
  getBloodUnits,
  collectUnit,
  getExpiryAlerts,
  getTransfusions,
  requestTransfusion,
  transfusePatient,
} from './bloodbank.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Blood Donors
router.get('/blood-donors', getDonors);
router.post('/blood-donors', registerDonor);
router.put('/blood-donors/:id', updateDonor);

// Blood Inventory
router.get('/blood-inventory', getBloodInventory);

// Blood Units — expiry-alerts must be before /:id
router.get('/blood-units/expiry-alerts', getExpiryAlerts);
router.get('/blood-units', getBloodUnits);
router.post('/blood-units', collectUnit);

// Transfusions
router.get('/transfusions', getTransfusions);
router.post('/transfusions', requestTransfusion);
router.put('/transfusions/:id/transfuse', transfusePatient);

export default router;
