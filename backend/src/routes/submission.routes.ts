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

const router = Router();

// ─── File Upload Route ─────────────────────────────────────────────────────
// Store uploaded files directly into MongoDB database table (StoredFile collection)
router.post('/upload', protect as any, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalName = req.file.originalname;

    // Save directly into MongoDB database collection
    const storedFile = await StoredFile.create({
      filename: originalName,
      contentType: req.file.mimetype || 'application/octet-stream',
      size: req.file.size,
      data: req.file.buffer,
      uploadedBy: req.user?.id,
    });

    return res.status(200).json({
      fileUrl: `/uploads/${storedFile._id}`,
      fileName: originalName,
      fileId: storedFile._id,
      storage: 'database',
    });
  } catch (error: any) {
    console.error('Error uploading file to database:', error);
    return res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// Route to download/view stored files directly from MongoDB database
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
