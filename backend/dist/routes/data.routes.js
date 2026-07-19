"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_controller_1 = require("../controllers/data.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Only admins can access data management
router.get('/stats', auth_middleware_1.protect, auth_middleware_1.adminOnly, data_controller_1.getSystemStats);
router.get('/export/users', auth_middleware_1.protect, auth_middleware_1.adminOnly, data_controller_1.exportUsers);
router.get('/export/admins', auth_middleware_1.protect, auth_middleware_1.adminOnly, data_controller_1.exportAdmins);
router.get('/export/submissions', auth_middleware_1.protect, auth_middleware_1.adminOnly, data_controller_1.exportSubmissions);
exports.default = router;
