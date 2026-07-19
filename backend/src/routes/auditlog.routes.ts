import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditlog.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Only Admins can view audit logs
router.get('/', protect as any, adminOnly as any, getAuditLogs);

export default router;
