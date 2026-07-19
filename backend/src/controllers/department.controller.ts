import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Department } from '../models/Department';
import { RecycleBin, EntityType } from '../models/RecycleBin';

export const getDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(departments);
  } catch (error) {
    console.error('Failed to get departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description } = req.body;

    const existingCode = await Department.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ error: 'A department with this code already exists' });
    }

    const newDepartment = await Department.create({
      name,
      code: code.toUpperCase(),
      description,
    });

    res.status(201).json(newDepartment);
  } catch (error) {
    console.error('Failed to create department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;

    // Check if new code conflicts with another department
    const existingCode = await Department.findOne({ code: code.toUpperCase(), _id: { $ne: id } });
    if (existingCode) {
      return res.status(400).json({ error: 'A department with this code already exists' });
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      id,
      { name, code: code.toUpperCase(), description },
      { new: true, runValidators: true }
    );

    if (!updatedDepartment) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.status(200).json(updatedDepartment);
  } catch (error) {
    console.error('Failed to update department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find before deleting
    const departmentToDel = await Department.findById(id).lean();
    if (!departmentToDel) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Save to Recycle Bin
    await RecycleBin.create({
      originalId: id,
      entityType: EntityType.DEPARTMENT,
      entityName: departmentToDel.name,
      data: departmentToDel,
      deletedBy: req.user?.id
    });

    // Now delete from original
    await Department.findByIdAndDelete(id);

    res.status(200).json({ message: 'Department moved to Recycle Bin' });
  } catch (error) {
    console.error('Failed to delete department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
};
