import { Router } from 'express';
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} from './department.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getDepartments);
router.post('/', authorize('SUPER_ADMIN', 'ADMIN'), createDepartment);
router.get('/:id', getDepartment);
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateDepartment);
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteDepartment);

export default router;
