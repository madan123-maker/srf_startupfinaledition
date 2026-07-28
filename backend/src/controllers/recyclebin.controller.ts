import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RecycleBin, EntityType } from '../models/RecycleBin';
import { Department } from '../models/Department';
import { User } from '../models/User';
import { Edition } from '../models/Edition';
import { FormSchemaModel } from '../models/FormSchema';

import { Submission } from '../models/Submission';

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const [total, editions, assignments, applications, users, reformAreas, actionPoints] = await Promise.all([
      RecycleBin.countDocuments(),
      RecycleBin.countDocuments({ entityType: EntityType.EDITION }),
      RecycleBin.countDocuments({ entityType: EntityType.ASSIGNMENT }),
      RecycleBin.countDocuments({ entityType: EntityType.APPLICATION }),
      RecycleBin.countDocuments({ entityType: EntityType.USER }),
      RecycleBin.countDocuments({ entityType: EntityType.REFORM_AREA }),
      RecycleBin.countDocuments({ entityType: EntityType.ACTION_POINT }),
    ]);

    res.status(200).json({ total, editions, assignments, applications, users, reformAreas, actionPoints });
  } catch (error) {
    console.error('Failed to get recycle bin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    // Note: populate deletedBy so frontend can show "deleted by" name or email
    const items = await RecycleBin.find()
      .populate('deletedBy', 'name email role')
      .sort({ deletedAt: -1 })
      .lean();
    res.status(200).json(items);
  } catch (error) {
    console.error('Failed to get recycle bin items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

export const restoreItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const item = await RecycleBin.findById(id).lean();

    if (!item) {
      return res.status(404).json({ error: 'Item not found in recycle bin' });
    }

    // Logic to restore based on entityType
    if (item.entityType === EntityType.DEPARTMENT) {
      // Re-create in Department collection
      const { _id, ...rest } = item.data;
      await Department.create({ _id: item.originalId, ...rest });
    } else if (item.entityType === EntityType.USER) {
      const { _id, ...rest } = item.data;
      await User.create({ _id: item.originalId, ...rest });
    } else if (item.entityType === EntityType.EDITION) {
      const { _id, ...rest } = item.data;
      await Edition.create({ _id: item.originalId, ...rest });
    } else if (item.entityType === EntityType.REFORM_AREA) {
      const { editionId, ...areaData } = item.data;
      if (!editionId) {
        return res.status(400).json({ error: 'Cannot restore: editionId is missing from archived data' });
      }
      await FormSchemaModel.findOneAndUpdate(
        { editionId },
        { $push: { areas: areaData } }
      );
    } else if (item.entityType === EntityType.ACTION_POINT) {
      const { editionId, areaId, ...apData } = item.data;
      if (!editionId || !areaId) {
        return res.status(400).json({ error: 'Cannot restore: parent IDs missing from archived data' });
      }
      await FormSchemaModel.findOneAndUpdate(
        { editionId, "areas.id": areaId },
        { $push: { "areas.$.actionPoints": apData } }
      );
    } else if (item.entityType === EntityType.APPLICATION) {
      const { _id, __v, ...rest } = item.data;
      await Submission.create({ _id: item.originalId, ...rest });
    } else {
      return res.status(400).json({ error: 'Restoration for this entity type is not implemented yet' });
    }

    // Remove from Recycle Bin
    await RecycleBin.findByIdAndDelete(id);
    res.status(200).json({ message: 'Item restored successfully' });

  } catch (error) {
    console.error('Failed to restore item:', error);
    res.status(500).json({ error: 'Failed to restore item' });
  }
};

export const permanentDelete = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await RecycleBin.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.status(200).json({ message: 'Item permanently deleted' });
  } catch (error) {
    console.error('Failed to permanently delete item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};
