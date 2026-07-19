"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.getAllUsers = exports.createUser = exports.createAdmin = void 0;
const user_service_1 = require("../services/user.service");
const User_1 = require("../models/User");
const RecycleBin_1 = require("../models/RecycleBin");
const userService = new user_service_1.UserService();
const createAdmin = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Only Super Admins can create Admin accounts.' });
        }
        const { name, email, organization, state, district, username } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required.' });
        }
        const newAdmin = await userService.createAdmin({ name, email, organization, state, district, username });
        return res.status(201).json({
            message: `Admin account created successfully. Credentials have been sent to ${email}.`,
            user: newAdmin
        });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to create admin' });
    }
};
exports.createAdmin = createAdmin;
const createUser = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Only Super Admins can create User accounts.' });
        }
        const { name, email, organization, state, district, username } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required.' });
        }
        const newUser = await userService.createUser({ name, email, organization, state, district, username });
        return res.status(201).json({
            message: `User account created successfully. Credentials have been sent to ${email}.`,
            user: newUser
        });
    }
    catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to create user' });
    }
};
exports.createUser = createUser;
const getAllUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers(req.user?.id, req.user?.role);
        return res.status(200).json(users);
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
};
exports.getAllUsers = getAllUsers;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userToDel = await User_1.User.findById(id).lean();
        if (!userToDel) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (userToDel.role === User_1.Role.SUPER_ADMIN) {
            return res.status(403).json({ error: 'Super Admins cannot be deleted' });
        }
        // Move to Recycle Bin
        await RecycleBin_1.RecycleBin.create({
            originalId: id,
            entityType: RecycleBin_1.EntityType.USER,
            entityName: userToDel.name || userToDel.email,
            data: userToDel,
            deletedBy: req.user?.id
        });
        await User_1.User.findByIdAndDelete(id);
        res.status(200).json({ message: 'User moved to Recycle Bin' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
