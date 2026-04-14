import { Router } from 'express';
import {
  getRooms,
  createRoom,
  updateRoom,
  getRoomTypes,
  createRoomType,
  getStats,
  getAdmissions,
  getAdmission,
  createAdmission,
  dischargePatient,
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

// Admissions — stats must be before /:id
router.get('/admissions/stats', getStats);
router.get('/admissions', getAdmissions);
router.post('/admissions', createAdmission);
router.get('/admissions/:id', getAdmission);
router.put('/admissions/:id/discharge', dischargePatient);

export default router;
