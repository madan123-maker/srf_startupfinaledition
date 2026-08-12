import { Router } from 'express';
import { getMetrics, exportExecutiveSummary } from '../controllers/dashboard.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Protect these routes: User must be logged in and must be an ADMIN or SUPER_ADMIN
router.get('/metrics', protect as any, adminOnly as any, getMetrics);
router.get('/export-executive-summary', protect as any, adminOnly as any, exportExecutiveSummary);

export default router;

