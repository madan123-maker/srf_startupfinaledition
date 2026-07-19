"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSubmissions = exports.exportAdmins = exports.exportUsers = exports.getSystemStats = void 0;
const User_1 = require("../models/User");
const Edition_1 = require("../models/Edition");
const Submission_1 = require("../models/Submission");
const AuditLog_1 = require("../models/AuditLog");
const json2csv_1 = require("json2csv");
const getSystemStats = async (req, res) => {
    try {
        const [editions, applications, registeredUsers, auditLogs] = await Promise.all([
            Edition_1.Edition.countDocuments(),
            Submission_1.Submission.countDocuments(),
            User_1.User.countDocuments({ role: User_1.Role.USER }), // Only standard users for the stat
            AuditLog_1.AuditLog.countDocuments()
        ]);
        return res.status(200).json({
            editions,
            applications,
            registeredUsers,
            auditLogs
        });
    }
    catch (error) {
        console.error('Failed to get system stats:', error);
        return res.status(500).json({ error: 'Failed to fetch system stats' });
    }
};
exports.getSystemStats = getSystemStats;
const exportUsers = async (req, res) => {
    try {
        const users = await User_1.User.find({ role: User_1.Role.USER }).select('-passwordHash').lean();
        if (users.length === 0) {
            return res.status(404).json({ error: 'No users found to export' });
        }
        const fields = ['name', 'username', 'email', 'organization', 'state', 'district', 'isActive', 'createdAt'];
        const json2csvParser = new json2csv_1.Parser({ fields });
        const csv = json2csvParser.parse(users);
        res.header('Content-Type', 'text/csv');
        res.attachment('users_export.csv');
        return res.send(csv);
    }
    catch (error) {
        console.error('Failed to export users:', error);
        return res.status(500).json({ error: 'Failed to export users' });
    }
};
exports.exportUsers = exportUsers;
const exportAdmins = async (req, res) => {
    try {
        const admins = await User_1.User.find({ role: { $in: [User_1.Role.ADMIN, User_1.Role.SUPER_ADMIN] } }).select('-passwordHash').lean();
        if (admins.length === 0) {
            return res.status(404).json({ error: 'No admins found to export' });
        }
        const fields = ['name', 'username', 'email', 'role', 'organization', 'state', 'district', 'isActive', 'createdAt'];
        const json2csvParser = new json2csv_1.Parser({ fields });
        const csv = json2csvParser.parse(admins);
        res.header('Content-Type', 'text/csv');
        res.attachment('admins_export.csv');
        return res.send(csv);
    }
    catch (error) {
        console.error('Failed to export admins:', error);
        return res.status(500).json({ error: 'Failed to export admins' });
    }
};
exports.exportAdmins = exportAdmins;
const exportSubmissions = async (req, res) => {
    try {
        const submissions = await Submission_1.Submission.find().populate('userId', 'name email').populate('editionId', 'name').lean();
        // Flatten data for CSV
        const flatData = submissions.map((sub) => ({
            submissionId: sub._id,
            userName: sub.userId?.name || 'Unknown',
            userEmail: sub.userId?.email || 'Unknown',
            editionName: sub.editionId?.name || 'Unknown',
            status: sub.status,
            score: sub.score || 0,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt
        }));
        if (flatData.length === 0) {
            return res.status(404).json({ error: 'No submissions found to export' });
        }
        const fields = ['submissionId', 'userName', 'userEmail', 'editionName', 'status', 'score', 'createdAt', 'updatedAt'];
        const json2csvParser = new json2csv_1.Parser({ fields });
        const csv = json2csvParser.parse(flatData);
        res.header('Content-Type', 'text/csv');
        res.attachment('submissions_export.csv');
        return res.send(csv);
    }
    catch (error) {
        console.error('Failed to export submissions:', error);
        return res.status(500).json({ error: 'Failed to export submissions' });
    }
};
exports.exportSubmissions = exportSubmissions;
