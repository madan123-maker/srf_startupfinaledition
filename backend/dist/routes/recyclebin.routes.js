"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recyclebin_controller_1 = require("../controllers/recyclebin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Recycle Bin is strictly Super Admin only
router.use(auth_middleware_1.protect, auth_middleware_1.adminOnly);
router.get('/stats', recyclebin_controller_1.getStats);
router.get('/', recyclebin_controller_1.getItems);
router.post('/:id/restore', recyclebin_controller_1.restoreItem);
router.delete('/:id/permanent', recyclebin_controller_1.permanentDelete);
exports.default = router;
