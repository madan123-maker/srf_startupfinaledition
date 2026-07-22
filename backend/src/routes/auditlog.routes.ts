import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditlog.controller';
import { protect, superAdminOnly } from '../middleware/auth.middleware';

const router = Router();

// Only Super Admins can view audit logs
router.get('/', protect as any, superAdminOnly as any, getAuditLogs);

export default router;
