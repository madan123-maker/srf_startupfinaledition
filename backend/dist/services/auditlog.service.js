"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogService = exports.AuditLogService = void 0;
const AuditLog_1 = require("../models/AuditLog");
class AuditLogService {
    async createLog(data) {
        try {
            const log = await AuditLog_1.AuditLog.create(data);
            return log;
        }
        catch (error) {
            console.error('Failed to create audit log:', error);
            // We don't want to throw and break main flows if audit logging fails
        }
    }
    async getLogs(filters = {}) {
        const query = {};
        if (filters.search) {
            query.$or = [
                { userName: { $regex: filters.search, $options: 'i' } },
                { action: { $regex: filters.search, $options: 'i' } },
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
        const logs = await AuditLog_1.AuditLog.find(query).sort({ createdAt: -1 }).limit(100).lean();
        return logs;
    }
}
exports.AuditLogService = AuditLogService;
exports.auditLogService = new AuditLogService();
