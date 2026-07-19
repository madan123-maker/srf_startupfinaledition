import { Router } from 'express';
import { getStats, getItems, restoreItem, permanentDelete } from '../controllers/recyclebin.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Recycle Bin is strictly Super Admin only
router.use(protect as any, adminOnly as any);

router.get('/stats', getStats);
router.get('/', getItems);
router.post('/:id/restore', restoreItem);
router.delete('/:id/permanent', permanentDelete);

export default router;
