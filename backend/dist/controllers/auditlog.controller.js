"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = void 0;
const auditlog_service_1 = require("../services/auditlog.service");
const getAuditLogs = async (req, res) => {
    try {
        const filters = {
            search: req.query.search,
            action: req.query.action,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            district: req.query.district, // Might map to user location in future
            admin: req.query.admin, // Might map to specific roles in future
        };
        const logs = await auditlog_service_1.auditLogService.getLogs(filters);
        res.status(200).json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};
exports.getAuditLogs = getAuditLogs;
