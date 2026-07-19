"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const User_1 = require("../models/User");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auditlog_service_1 = require("./auditlog.service");
class AuthService {
    async login(email, passwordPlain, isAdminLogin) {
        const user = await User_1.User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password');
        }
        if (!user.isActive) {
            throw new Error('Account is deactivated');
        }
        // Role check depending on the login portal
        if (isAdminLogin && user.role === 'USER') {
            throw new Error('Unauthorized access. Admins only.');
        }
        if (!isAdminLogin && user.role !== 'USER') {
            throw new Error('Please use the Admin portal to login.');
        }
        const isMatch = await bcrypt_1.default.compare(passwordPlain, user.passwordHash);
        if (!isMatch) {
            throw new Error('Invalid email or password');
        }
        // Generate JWT
        const secret = process.env.JWT_SECRET || 'fallback_secret';
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, role: user.role }, secret, { expiresIn: '1d' });
        // Record login in audit log
        await auditlog_service_1.auditLogService.createLog({
            userId: user._id.toString(),
            userName: user.name || 'System User',
            userRole: user.role,
            action: 'User login (Backend Verified)',
            entity: 'auth',
            entityId: user.email,
        });
        return {
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                state: user.state,
            },
        };
    }
}
exports.AuthService = AuthService;
