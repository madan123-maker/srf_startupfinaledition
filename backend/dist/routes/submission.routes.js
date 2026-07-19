"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const submission_controller_1 = require("../controllers/submission.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
// State User Workspace routes (Protected)
router.get('/edition/:editionId/my-submission', auth_middleware_1.protect, submission_controller_1.getMySubmission);
router.put('/:id', auth_middleware_1.protect, submission_controller_1.updateMySubmission);
router.post('/upload', auth_middleware_1.protect, upload.single('file'), submission_controller_1.uploadSubmissionFile);
// Protected Admin routes
router.get('/edition/:editionId', auth_middleware_1.protect, auth_middleware_1.adminOnly, submission_controller_1.getSubmissionsByEdition);
exports.default = router;
