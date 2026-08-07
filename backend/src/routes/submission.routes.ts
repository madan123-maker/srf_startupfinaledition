import { Router } from 'express';
import {
  getSubmissionsByEdition,
  getMySubmission,
  updateMySubmission,
  evaluateDocument,
  getSubmissionById,
  getConsolidatedEditionSubmission,
  deleteSubmission,
} from '../controllers/submission.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isDriveEnabled, getOrCreateFolder, uploadFileToDrive } from '../services/googleDriveService';

import { StoredFile } from '../models/StoredFile';
import mongoose from 'mongoose';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 } // 16MB file size limit for database storage
});

import { uploadToR2 } from '../services/r2Upload';

const router = Router();

// ─── File Upload Route ─────────────────────────────────────────────────────
// Upload files to Cloudflare R2 and store metadata in StoredFile collection
router.post('/upload', protect as any, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload file to Cloudflare R2 Storage (organized under applications/ folder)
    const r2Result = await uploadToR2(req.file, { folder: 'applications', uploadedBy: req.user?.id });

    // Save metadata in MongoDB database (no binary Buffer stored)
    const storedFile = await StoredFile.create({
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
      uploadedBy: req.user?.id,
    });

    return res.status(200).json({
      fileUrl: r2Result.url || `/uploads/${storedFile._id}`,
      fileName: r2Result.originalName,
      fileId: storedFile._id,
      storage: 'r2',
    });
  } catch (error: any) {
    console.error('Error uploading file to Cloudflare R2:', error);
    return res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// Route to download/view stored files directly (redirects to R2 if available, or serves legacy binary)
router.get('/files/:fileId', async (req: any, res: any) => {
  try {
    const { fileId } = req.params;

    let cleanId = fileId;
    if (!mongoose.Types.ObjectId.isValid(cleanId) && cleanId.includes('.')) {
      const possibleId = cleanId.replace(/\.[^/.]+$/, '');
      if (mongoose.Types.ObjectId.isValid(possibleId)) {
        cleanId = possibleId;
      }
    }

    const dbFile = await StoredFile.findById(cleanId);
    if (!dbFile) {
      return res.status(404).json({ error: 'File not found in database' });
    }

    if (dbFile.storageProvider === 'r2' || dbFile.url) {
      return res.redirect(302, dbFile.url);
    }

    const { sendStoredFileResponse } = require('../app');
    return sendStoredFileResponse(res, dbFile);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching file from database' });
  }
});

// ─── State User Workspace routes (Protected) ──────────────────────────────
router.get('/edition/:editionId/my-submission', protect as any, getMySubmission);
router.put('/:id', protect as any, updateMySubmission);

// ─── Protected Admin routes ────────────────────────────────────────────────
router.get('/edition/:editionId/consolidated', protect as any, adminOnly as any, getConsolidatedEditionSubmission);
router.get('/edition/:editionId', protect as any, adminOnly as any, getSubmissionsByEdition);
router.get('/:id', protect as any, adminOnly as any, getSubmissionById);
router.post('/:id/evaluate-document', protect as any, adminOnly as any, evaluateDocument);
router.delete('/:id', protect as any, adminOnly as any, deleteSubmission);

export default router;
