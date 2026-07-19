"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getDepartments = void 0;
const Department_1 = require("../models/Department");
const RecycleBin_1 = require("../models/RecycleBin");
const getDepartments = async (req, res) => {
    try {
        const departments = await Department_1.Department.find().sort({ createdAt: -1 }).lean();
        res.status(200).json(departments);
    }
    catch (error) {
        console.error('Failed to get departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
};
exports.getDepartments = getDepartments;
const createDepartment = async (req, res) => {
    try {
        const { name, code, description } = req.body;
        const existingCode = await Department_1.Department.findOne({ code: code.toUpperCase() });
        if (existingCode) {
            return res.status(400).json({ error: 'A department with this code already exists' });
        }
        const newDepartment = await Department_1.Department.create({
            name,
            code: code.toUpperCase(),
            description,
        });
        res.status(201).json(newDepartment);
    }
    catch (error) {
        console.error('Failed to create department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
};
exports.createDepartment = createDepartment;
const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, description } = req.body;
        // Check if new code conflicts with another department
        const existingCode = await Department_1.Department.findOne({ code: code.toUpperCase(), _id: { $ne: id } });
        if (existingCode) {
            return res.status(400).json({ error: 'A department with this code already exists' });
        }
        const updatedDepartment = await Department_1.Department.findByIdAndUpdate(id, { name, code: code.toUpperCase(), description }, { new: true, runValidators: true });
        if (!updatedDepartment) {
            return res.status(404).json({ error: 'Department not found' });
        }
        res.status(200).json(updatedDepartment);
    }
    catch (error) {
        console.error('Failed to update department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        // Find before deleting
        const departmentToDel = await Department_1.Department.findById(id).lean();
        if (!departmentToDel) {
            return res.status(404).json({ error: 'Department not found' });
        }
        // Save to Recycle Bin
        await RecycleBin_1.RecycleBin.create({
            originalId: id,
            entityType: RecycleBin_1.EntityType.DEPARTMENT,
            entityName: departmentToDel.name,
            data: departmentToDel,
            deletedBy: req.user?.id
        });
        // Now delete from original
        await Department_1.Department.findByIdAndDelete(id);
        res.status(200).json({ message: 'Department moved to Recycle Bin' });
    }
    catch (error) {
        console.error('Failed to delete department:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
};
exports.deleteDepartment = deleteDepartment;
