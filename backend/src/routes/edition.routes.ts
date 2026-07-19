import { Router } from 'express';
import { createEdition, getAllEditions, toggleEditionStatus, getPublicEditions, deleteEdition, getEditionById } from '../controllers/edition.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Public/User routes
router.get('/public', protect as any, getPublicEditions);

// Protected Admin routes
router.get('/', protect as any, adminOnly as any, getAllEditions);
router.post('/', protect as any, adminOnly as any, createEdition);
router.put('/:id/status', protect as any, adminOnly as any, toggleEditionStatus);
router.delete('/:id', protect as any, adminOnly as any, deleteEdition);
router.get('/:id', protect as any, adminOnly as any, getEditionById);

export default router;
