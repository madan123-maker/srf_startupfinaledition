"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schema_controller_1 = require("../controllers/schema.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Get schema for an edition
router.get('/:editionId', auth_middleware_1.protect, schema_controller_1.getSchema);
// Update schema for an edition (Only SUPER_ADMIN)
router.put('/:editionId', auth_middleware_1.protect, auth_middleware_1.adminOnly, schema_controller_1.updateSchema);
exports.default = router;
