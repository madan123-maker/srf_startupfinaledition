"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permanentDelete = exports.restoreItem = exports.getItems = exports.getStats = void 0;
const RecycleBin_1 = require("../models/RecycleBin");
const Department_1 = require("../models/Department");
const User_1 = require("../models/User");
const getStats = async (req, res) => {
    try {
        const [total, editions, assignments, applications, users] = await Promise.all([
            RecycleBin_1.RecycleBin.countDocuments(),
            RecycleBin_1.RecycleBin.countDocuments({ entityType: RecycleBin_1.EntityType.EDITION }),
            RecycleBin_1.RecycleBin.countDocuments({ entityType: RecycleBin_1.EntityType.ASSIGNMENT }),
            RecycleBin_1.RecycleBin.countDocuments({ entityType: RecycleBin_1.EntityType.APPLICATION }),
            RecycleBin_1.RecycleBin.countDocuments({ entityType: RecycleBin_1.EntityType.USER }),
        ]);
        res.status(200).json({ total, editions, assignments, applications, users });
    }
    catch (error) {
        console.error('Failed to get recycle bin stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
exports.getStats = getStats;
const getItems = async (req, res) => {
    try {
        // Note: populate deletedBy so frontend can show "deleted by" name
        const items = await RecycleBin_1.RecycleBin.find()
            .populate('deletedBy', 'name role')
            .sort({ deletedAt: -1 })
            .lean();
        res.status(200).json(items);
    }
    catch (error) {
        console.error('Failed to get recycle bin items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
};
exports.getItems = getItems;
const restoreItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await RecycleBin_1.RecycleBin.findById(id).lean();
        if (!item) {
            return res.status(404).json({ error: 'Item not found in recycle bin' });
        }
        // Logic to restore based on entityType
        if (item.entityType === RecycleBin_1.EntityType.DEPARTMENT) {
            // Re-create in Department collection
            const { _id, ...rest } = item.data;
            await Department_1.Department.create({ _id: item.originalId, ...rest });
        }
        else if (item.entityType === RecycleBin_1.EntityType.USER) {
            const { _id, ...rest } = item.data;
            await User_1.User.create({ _id: item.originalId, ...rest });
        }
        else {
            return res.status(400).json({ error: 'Restoration for this entity type is not implemented yet' });
        }
        // Remove from Recycle Bin
        await RecycleBin_1.RecycleBin.findByIdAndDelete(id);
        res.status(200).json({ message: 'Item restored successfully' });
    }
    catch (error) {
        console.error('Failed to restore item:', error);
        res.status(500).json({ error: 'Failed to restore item' });
    }
};
exports.restoreItem = restoreItem;
const permanentDelete = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await RecycleBin_1.RecycleBin.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.status(200).json({ message: 'Item permanently deleted' });
    }
    catch (error) {
        console.error('Failed to permanently delete item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
};
exports.permanentDelete = permanentDelete;
