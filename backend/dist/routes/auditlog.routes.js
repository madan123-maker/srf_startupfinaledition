"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditlog_controller_1 = require("../controllers/auditlog.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Only Admins can view audit logs
router.get('/', auth_middleware_1.protect, auth_middleware_1.adminOnly, auditlog_controller_1.getAuditLogs);
exports.default = router;
