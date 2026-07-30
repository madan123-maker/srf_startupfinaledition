import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { User, Role } from '../models/User';
import { sendUserCredentials } from '../services/email.service';
import { RecycleBin, EntityType } from '../models/RecycleBin';
import { AuthRequest } from '../middleware/auth.middleware';
import { Submission } from '../models/Submission';
import { Assignment } from '../models/Assignment';
import { StoredFile } from '../models/StoredFile';

const userService = new UserService();

export const createAdmin = async (req: AuthRequest, res: Response) => {
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
      message: 'Admin account created successfully.',
      user: newAdmin
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, organization, state, district, username } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    const newUser = await userService.createUser({ name, email, organization, state, district, username });
    return res.status(201).json({ 
      message: 'User account created successfully.',
      user: newUser
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await userService.getAllUsers(req.user?.id, req.user?.role);
    return res.status(200).json(users);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const userToDel = await User.findById(id).lean();
    if (!userToDel) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userToDel.role === Role.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Super Admins cannot be deleted' });
    }

    // Move to Recycle Bin
    await RecycleBin.create({
      originalId: id,
      entityType: EntityType.USER,
      entityName: userToDel.name || userToDel.email,
      data: userToDel,
      deletedBy: req.user?.id
    });

    await User.findByIdAndDelete(id);

    // Delete associated submissions, assignments, and uploaded files so orphaned N/A rows are removed
    await Submission.deleteMany({ userId: id });
    await Assignment.deleteMany({ userId: id });
    await StoredFile.deleteMany({ uploadedBy: id });

    res.status(200).json({ message: 'User deleted and user data removed successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, organization, state, district, role } = req.body;
    
    // Check if user is authorized to edit. A super admin can edit anything, but maybe restrict role changes.
    // For now we just update basic fields.
    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (name) userToUpdate.name = name;
    if (email) userToUpdate.email = email;
    if (organization !== undefined) userToUpdate.organization = organization;
    if (state !== undefined) userToUpdate.state = state;
    if (district !== undefined) userToUpdate.district = district;
    if (role && req.user?.role === 'SUPER_ADMIN') {
      userToUpdate.role = role;
    }

    await userToUpdate.save();

    res.status(200).json({ message: 'User updated successfully', user: userToUpdate });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};
