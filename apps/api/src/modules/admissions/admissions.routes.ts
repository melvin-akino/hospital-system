import { Router } from 'express';
import {
  getRooms, createRoom, updateRoom, updateRoomHousekeeping,
  getRoomTypes, createRoomType,
  getStats, getAdmissions, getAdmission, createAdmission, updateAdmission, dischargePatient,
  getDischargeSummary, getAdmissionBill, postRoomCharges,
  getDocuments, upsertDocument, deleteDocument,
  getConsents, signConsent, unsignConsent, addConsent,
  getIcuRecord, upsertIcuRecord,
  getObsRecord, upsertObsRecord,
} from './admissions.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

// Room Types
router.get('/room-types', getRoomTypes);
router.post('/room-types', createRoomType);

// Rooms
router.get('/rooms', getRooms);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.put('/rooms/:id/housekeeping', updateRoomHousekeeping);

// Admissions — stats must be before /:id
router.get('/admissions/stats', getStats);
router.get('/admissions', getAdmissions);
router.post('/admissions', createAdmission);
router.get('/admissions/:id', getAdmission);
router.put('/admissions/:id', updateAdmission);
router.put('/admissions/:id/discharge', dischargePatient);
router.get('/admissions/:id/discharge-summary', getDischargeSummary);
router.get('/admissions/:id/bill', getAdmissionBill);
router.post('/admissions/:id/post-room-charges', postRoomCharges);

// Documents
router.get('/admissions/:id/documents', getDocuments);
router.post('/admissions/:id/documents', upsertDocument);
router.put('/admissions/:id/documents/:docId', upsertDocument);
router.delete('/admissions/:id/documents/:docId', deleteDocument);

// Consents
router.get('/admissions/:id/consents', getConsents);
router.post('/admissions/:id/consents', addConsent);
router.put('/admissions/:id/consents/:consentId/sign', signConsent);
router.put('/admissions/:id/consents/:consentId/unsign', unsignConsent);

// ICU Record
router.get('/admissions/:id/icu-record', getIcuRecord);
router.put('/admissions/:id/icu-record', upsertIcuRecord);

// Obstetric Record
router.get('/admissions/:id/obs-record', getObsRecord);
router.put('/admissions/:id/obs-record', upsertObsRecord);

export default router;
