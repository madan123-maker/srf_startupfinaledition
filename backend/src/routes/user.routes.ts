import { Router } from 'express';
import { createAdmin, createUser, getAllUsers, deleteUser, updateUser } from '../controllers/user.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect as any, adminOnly as any, getAllUsers);
router.post('/create-admin', protect as any, adminOnly as any, createAdmin);
router.post('/create-user', protect as any, adminOnly as any, createUser);
router.delete('/:id', protect as any, adminOnly as any, deleteUser);
router.put('/:id', protect as any, adminOnly as any, updateUser);

export default router;
