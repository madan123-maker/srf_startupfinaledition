"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const auth_service_1 = require("../services/auth.service");
const authService = new auth_service_1.AuthService();
const login = async (req, res) => {
    try {
        const { email, password, isAdminLogin } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const result = await authService.login(email, password, !!isAdminLogin);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
};
exports.login = login;
