"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protect these routes: User must be logged in and must be an ADMIN or SUPER_ADMIN
router.get('/metrics', auth_middleware_1.protect, auth_middleware_1.adminOnly, dashboard_controller_1.getMetrics);
exports.default = router;
