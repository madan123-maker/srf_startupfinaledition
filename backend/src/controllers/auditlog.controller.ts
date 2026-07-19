import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { auditLogService } from '../services/auditlog.service';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string,
      action: req.query.action as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      district: req.query.district as string, // Might map to user location in future
      admin: req.query.admin as string, // Might map to specific roles in future
    };

    const logs = await auditLogService.getLogs(filters);
    res.status(200).json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
