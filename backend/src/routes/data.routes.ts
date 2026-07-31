import { Router } from 'express';
import { getSystemStats, exportUsers, exportAdmins } from '../controllers/data.controller';
import { exportEnterpriseReport, exportApplicationsReportMIS } from '../controllers/enterprise.export.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Only admins can access data management
router.get('/stats', protect as any, adminOnly as any, getSystemStats);
router.get('/export/users', protect as any, adminOnly as any, exportUsers);
router.get('/export/admins', protect as any, adminOnly as any, exportAdmins);
router.get('/export/submissions', protect as any, adminOnly as any, exportEnterpriseReport as any);
router.get('/export/filtered-submissions', protect as any, adminOnly as any, exportEnterpriseReport as any);
router.get('/export/enterprise-report', protect as any, adminOnly as any, exportApplicationsReportMIS as any);

export default router;
