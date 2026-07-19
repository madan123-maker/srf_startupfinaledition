"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.protect);
router.get('/contacts', message_controller_1.getContacts);
router.get('/:userId', message_controller_1.getConversation);
router.post('/:userId', message_controller_1.sendMessage);
exports.default = router;
