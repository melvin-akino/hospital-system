import { Router } from 'express';
import {
  createPatient,
  getPatients,
  getPatient,
  updatePatient,
  deletePatient,
  getPatientHistory,
  uploadDocument,
  searchPatients,
  bulkImportPatients,
  getPatientProblems,
  createPatientProblem,
  updatePatientProblem,
  deletePatientProblem,
} from './patient.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPatientSchema, updatePatientSchema } from '@pibs/shared';
import { upload, xlsxUpload } from '../../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/search', searchPatients);
router.get('/', getPatients);
router.post('/', validate(createPatientSchema), createPatient);
router.post('/bulk-import', xlsxUpload.single('file'), bulkImportPatients);
router.get('/:id', getPatient);
router.put('/:id', validate(updatePatientSchema), updatePatient);
router.delete('/:id', deletePatient);
router.get('/:id/history', getPatientHistory);
router.post('/:id/documents', upload.single('file'), uploadDocument);

// Active Problem List
router.get('/:id/problems', getPatientProblems);
router.post('/:id/problems', createPatientProblem);
router.put('/:id/problems/:problemId', updatePatientProblem);
router.delete('/:id/problems/:problemId', deletePatientProblem);

export default router;
