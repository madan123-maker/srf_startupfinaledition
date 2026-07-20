import { Request, Response } from 'express';
import { EditionService } from '../services/edition.service';
import { AuthRequest } from '../middleware/auth.middleware';

const editionService = new EditionService();

export const createEdition = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // Only SUPER_ADMIN can create editions based on the prompt rules
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admins can create new Editions.' });
    }

    const newEdition = await editionService.createEdition(req.body, req.user.id);
    return res.status(201).json(newEdition);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create edition' });
  }
};

export const getAllEditions = async (req: Request, res: Response) => {
  try {
    const editions = await editionService.getAllEditions();
    return res.status(200).json(editions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch editions' });
  }
};

export const toggleEditionStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admins can toggle publish status.' });
    }
    const updatedEdition = await editionService.togglePublishStatus(req.params.id);
    return res.status(200).json(updatedEdition);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to toggle status' });
  }
};

export const getPublicEditions = async (req: Request, res: Response) => {
  try {
    const editions = await editionService.getPublicEditions();
    return res.status(200).json(editions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch public editions' });
  }
};

export const deleteEdition = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admins can delete Editions.' });
    }
    const result = await editionService.deleteEdition(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to delete edition' });
  }
};

export const getEditionById = async (req: Request, res: Response) => {
  try {
    const edition = await editionService.getEditionById(req.params.id);
    return res.status(200).json(edition);
  } catch (error: any) {
    return res.status(404).json({ error: error.message || 'Edition not found' });
  }
};
