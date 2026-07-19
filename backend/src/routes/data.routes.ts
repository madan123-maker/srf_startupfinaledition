import { Router } from 'express';
import { getSystemStats, exportUsers, exportAdmins, exportSubmissions } from '../controllers/data.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Only admins can access data management
router.get('/stats', protect as any, adminOnly as any, getSystemStats);
router.get('/export/users', protect as any, adminOnly as any, exportUsers);
router.get('/export/admins', protect as any, adminOnly as any, exportAdmins);
router.get('/export/submissions', protect as any, adminOnly as any, exportSubmissions);

export default router;
