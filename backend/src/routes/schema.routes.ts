import { Router } from 'express';
import { getSchema, updateSchema } from '../controllers/schema.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Get schema for an edition
router.get('/:editionId', protect as any, getSchema);

// Update schema for an edition (Only SUPER_ADMIN)
router.put('/:editionId', protect as any, adminOnly as any, updateSchema);

export default router;
