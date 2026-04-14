import { Router } from 'express';
import {
  getEMR,
  getVitalSigns,
  addVitalSigns,
  getAllergies,
  addAllergy,
  updateAllergy,
  getMedications,
  addMedication,
  searchIcd10,
} from './emr.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ICD-10 search
router.get('/icd10-codes/search', searchIcd10);

// EMR
router.get('/patients/:id/emr', getEMR);
router.get('/patients/:id/vital-signs', getVitalSigns);
router.post('/patients/:id/vital-signs', addVitalSigns);
router.get('/patients/:id/allergies', getAllergies);
router.post('/patients/:id/allergies', addAllergy);
router.put('/patients/:id/allergies/:allergyId', updateAllergy);
router.get('/patients/:id/medications', getMedications);
router.post('/patients/:id/medications', addMedication);

export default router;
