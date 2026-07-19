"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const User_1 = require("../models/User");
const email_service_1 = require("./email.service");
const bcrypt_1 = __importDefault(require("bcrypt"));
// Generate a strong random password
const generatePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '@#$!';
    // Ensure at least one of each required character type
    const pass = [
        upper[Math.floor(Math.random() * upper.length)],
        lower[Math.floor(Math.random() * lower.length)],
        digits[Math.floor(Math.random() * digits.length)],
        special[Math.floor(Math.random() * special.length)],
    ];
    // Fill rest of the password to 10 chars
    const all = upper + lower + digits + special;
    for (let i = 0; i < 6; i++) {
        pass.push(all[Math.floor(Math.random() * all.length)]);
    }
    // Shuffle the array so required chars aren't always at start
    return pass.sort(() => Math.random() - 0.5).join('');
};
class UserService {
    async createAdmin(data) {
        // Check if user already exists
        const existingUser = await User_1.User.findOne({
            $or: [
                { email: data.email.toLowerCase() },
                ...(data.username ? [{ username: data.username }] : [])
            ]
        });
        if (existingUser) {
            if (existingUser.email === data.email.toLowerCase()) {
                throw new Error(`A user with the email ${data.email} already exists.`);
            }
            throw new Error(`The username "${data.username}" is already taken.`);
        }
        // Generate a secure temporary password
        const tempPassword = generatePassword();
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(tempPassword, salt);
        // Create the admin user in the database
        const newAdmin = await User_1.User.create({
            email: data.email.toLowerCase(),
            passwordHash,
            name: data.name,
            username: data.username,
            organization: data.organization || 'DPIIT',
            state: data.state,
            district: data.district,
            role: User_1.Role.ADMIN,
            isActive: true,
        });
        // Send credentials to the admin's email via SMTP
        try {
            await (0, email_service_1.sendAdminCredentials)(data.email, data.name, tempPassword);
            console.log(`✅ Credentials email sent to ${data.email}`);
        }
        catch (emailError) {
            // Log but don't fail — admin is already created in DB
            console.error(`❌ SMTP Error: Failed to send email to ${data.email}:`, emailError.message);
        }
        return {
            id: newAdmin._id,
            email: newAdmin.email,
            name: newAdmin.name,
            username: newAdmin.username,
            role: newAdmin.role,
            organization: newAdmin.organization,
            state: newAdmin.state,
            district: newAdmin.district,
            createdAt: newAdmin.createdAt,
        };
    }
    async createUser(data) {
        const existingUser = await User_1.User.findOne({
            $or: [
                { email: data.email.toLowerCase() },
                ...(data.username ? [{ username: data.username }] : [])
            ]
        });
        if (existingUser) {
            if (existingUser.email === data.email.toLowerCase()) {
                throw new Error(`A user with the email ${data.email} already exists.`);
            }
            throw new Error(`The username "${data.username}" is already taken.`);
        }
        const tempPassword = generatePassword();
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(tempPassword, salt);
        const newUser = await User_1.User.create({
            email: data.email.toLowerCase(),
            passwordHash,
            name: data.name,
            username: data.username,
            organization: data.organization,
            state: data.state,
            district: data.district,
            role: User_1.Role.USER,
            isActive: true,
        });
        try {
            await (0, email_service_1.sendUserCredentials)(data.email, data.name, tempPassword);
            console.log(`✅ User credentials email sent to ${data.email}`);
        }
        catch (emailError) {
            console.error(`❌ SMTP Error: Failed to send email to ${data.email}:`, emailError.message);
        }
        return {
            id: newUser._id,
            email: newUser.email,
            name: newUser.name,
            username: newUser.username,
            role: newUser.role,
            organization: newUser.organization,
            state: newUser.state,
            district: newUser.district,
            createdAt: newUser.createdAt,
        };
    }
    async getAllUsers(callerId, callerRole) {
        let filter = {};
        if (callerRole === User_1.Role.ADMIN && callerId) {
            const caller = await User_1.User.findById(callerId);
            if (caller) {
                if (caller.state) {
                    // State Admins see users strictly in their state
                    filter.state = caller.state;
                }
                else if (caller.organization) {
                    // Central Admins (no state) see all regular users + their own organization
                    filter = {
                        $or: [
                            { role: User_1.Role.USER },
                            { organization: caller.organization }
                        ]
                    };
                }
            }
        }
        const users = await User_1.User.find(filter)
            .select('-passwordHash') // Never expose the password hash
            .sort({ createdAt: -1 })
            .lean();
        return users;
    }
    async deleteUser(userId) {
        const user = await User_1.User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (user.role === User_1.Role.SUPER_ADMIN) {
            throw new Error('The Super Admin account cannot be deleted.');
        }
        await User_1.User.findByIdAndDelete(userId);
        return { success: true };
    }
}
exports.UserService = UserService;
