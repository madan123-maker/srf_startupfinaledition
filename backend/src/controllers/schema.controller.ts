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
      const { Edition } = await import('../models/Edition');
      const { StorageService } = await import('../services/storage/StorageService');
      const { STORAGE_FOLDERS } = await import('../constants/storage.constants');

      // Upload framework PDF to Cloudflare R2 via StorageService (deterministic key: guidelines/{editionId}/guideline.pdf)
      const r2Result = await StorageService.upload(req.file, {
        folder: STORAGE_FOLDERS.GUIDELINES,
        editionId: String(editionId),
        uploadedBy: req.user.id,
      });

      // Upsert: one guideline PDF per edition
      const pdfDoc = await GuidelinePdf.findOneAndUpdate(
        { editionId: new mongoose.Types.ObjectId(editionId) },
        {
          editionId: new mongoose.Types.ObjectId(editionId),
          originalName: r2Result.originalName,
          fileName: r2Result.fileName,
          url: r2Result.url,
          key: r2Result.key,
          mimeType: r2Result.mimeType,
          size: r2Result.size,
          uploadedAt: r2Result.uploadedAt,
          storageProvider: 'r2',
          filename: r2Result.originalName,
          contentType: r2Result.mimeType,
          uploadedBy: req.user.id,
        },
        { upsert: true, returnDocument: 'after' }
      );

      if (pdfDoc) {
        await Edition.findByIdAndUpdate(editionId, {
          guidelineFileId: pdfDoc._id,
          guidelineFileName: req.file.originalname,
        });
      }
    }

    const areas = await parseSrfPdfBuffer(req.file.buffer);
    return res.status(200).json({ success: true, areas });
  } catch (error: any) {
    console.error('Error parsing SRF PDF:', error);
    return res.status(500).json({ error: error.message || 'Failed to parse SRF PDF document.' });
  }
};
