import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { schemaService } from '../services/schema.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { parseSrfPdfBuffer } from '../services/pdfParser.service';

export const getSchema = async (req: Request, res: Response) => {
  try {
    const { editionId } = req.params;
    const schema = await schemaService.getSchemaByEditionId(editionId);
    return res.status(200).json(schema);
  } catch (error: any) {
    console.error('Error fetching schema:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch schema' });
  }
};

export const updateSchema = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    const { editionId } = req.params;
    const schemaData = req.body;
    const updatedSchema = await schemaService.updateSchema(editionId, schemaData, req.user.id);
    return res.status(200).json(updatedSchema);
  } catch (error: any) {
    console.error('Error updating schema:', error);
    return res.status(500).json({ error: error.message || 'Failed to update schema' });
  }
};

export const parseSrfPdf = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Only Super Admin can generate schemas from PDF.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded. Please upload a valid SRF Framework PDF.' });
    }

    const editionId = req.body.editionId || req.query.editionId;

    if (editionId && mongoose.Types.ObjectId.isValid(editionId)) {
      const { GuidelinePdf } = await import('../models/GuidelinePdf');
      // Upsert: one guideline PDF per edition — replaces previous if re-uploaded
      await GuidelinePdf.findOneAndUpdate(
        { editionId: new mongoose.Types.ObjectId(editionId) },
        {
          editionId: new mongoose.Types.ObjectId(editionId),
          filename: req.file.originalname,
          contentType: req.file.mimetype || 'application/pdf',
          data: req.file.buffer,
          size: req.file.size,
          uploadedBy: req.user.id,
        },
        { upsert: true, new: true }
      );
    }

    const areas = await parseSrfPdfBuffer(req.file.buffer);
    return res.status(200).json({ success: true, areas });
  } catch (error: any) {
    console.error('Error parsing SRF PDF:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse SRF PDF document.' });
  }
};
