import { Router } from 'express';
import {
  generateBarcode,
  scanBarcode,
  getBarcodeDetails,
  getScanLog,
  generateWristband,
} from './barcode.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Must declare static routes before parameterized ones
router.get('/barcodes/scan-log', getScanLog);
router.post('/barcodes/generate', generateBarcode);
router.post('/barcodes/scan', scanBarcode);
router.post('/barcodes/patient-wristband/:patientId', generateWristband);
router.get('/barcodes/:barcodeString/details', getBarcodeDetails);

export default router;
