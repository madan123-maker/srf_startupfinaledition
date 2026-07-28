import { AuditLog } from '../models/AuditLog';

export class AuditLogService {
  async createLog(data: {
    userId?: string;
    userName?: string;
    userRole?: string;
    action: string;
    entity: string;
    entityId: string;
    details?: any;
  }) {
    try {
      const log = await AuditLog.create(data);
      return log;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // We don't want to throw and break main flows if audit logging fails
    }
  }

  async getLogs(filters: any = {}) {
    const query: any = {};

    if (filters.search) {
      const safeSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { userName: { $regex: `\\b${safeSearch}\\b`, $options: 'i' } },
        { action: { $regex: `\\b${safeSearch}\\b`, $options: 'i' } },
      ];
    }
    
    if (filters.action && filters.action !== 'All Actions') {
      if (filters.action === 'Login History') {
        query.action = { $regex: /login/i };
      }
      // Add other specific filter mappings later if needed
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
        // Set to end of day
        query.createdAt.$lte.setHours(23, 59, 59, 999);
      }
    }

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(100).lean();
    return logs;
  }
}

export const auditLogService = new AuditLogService();
