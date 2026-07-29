import { Router } from 'express';
import multer from 'multer';
import { getSchema, updateSchema, parseSrfPdf } from '../controllers/schema.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Parse SRF Framework PDF (Only SUPER_ADMIN)
router.post('/parse-pdf', protect as any, adminOnly as any, upload.single('file'), parseSrfPdf);

// Get schema for an edition
router.get('/:editionId', protect as any, getSchema);

// Update schema for an edition (Only SUPER_ADMIN)
router.put('/:editionId', protect as any, adminOnly as any, updateSchema);

export default router;
