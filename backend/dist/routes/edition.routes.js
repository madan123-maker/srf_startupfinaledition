"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const edition_controller_1 = require("../controllers/edition.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protected Admin routes
router.get('/', auth_middleware_1.protect, auth_middleware_1.adminOnly, edition_controller_1.getAllEditions);
router.post('/', auth_middleware_1.protect, auth_middleware_1.adminOnly, edition_controller_1.createEdition);
router.put('/:id/status', auth_middleware_1.protect, auth_middleware_1.adminOnly, edition_controller_1.toggleEditionStatus);
router.delete('/:id', auth_middleware_1.protect, auth_middleware_1.adminOnly, edition_controller_1.deleteEdition);
router.get('/:id', auth_middleware_1.protect, auth_middleware_1.adminOnly, edition_controller_1.getEditionById);
// Public/User routes
router.get('/public', auth_middleware_1.protect, edition_controller_1.getPublicEditions);
exports.default = router;
