import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { listUsers, getUser, createUser, updateUser, toggleUserStatus, deleteUser } from './users.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

export default router;
