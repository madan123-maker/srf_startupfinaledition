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

import { UPLOAD_LIMITS } from '../constants/upload.constants';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES } // Centralized 3MB limit
});

import { uploadToR2 } from '../services/r2Upload';

const router = Router();

import { StorageService } from '../services/storage/StorageService';
import { STORAGE_FOLDERS } from '../constants/storage.constants';

// ─── File Upload Route ─────────────────────────────────────────────────────
// Upload files via central StorageService using deterministic stable identifiers
router.post('/upload', protect as any, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const applicationId = req.body?.applicationId || req.query?.applicationId;
    const questionId = req.body?.questionId || req.query?.questionId;
    const documentId = req.body?.documentId || req.query?.documentId;

    // Atomic Upload Process via central StorageService
    const r2Result = await StorageService.upload(req.file, {
      folder: STORAGE_FOLDERS.APPLICATIONS,
      applicationId,
      questionId,
      documentId,
      uploadedBy: req.user?.id,
    });

    const storedFile = await StoredFile.findOne({ key: r2Result.key });

    return res.status(200).json({
      fileUrl: r2Result.url,
      fileName: r2Result.originalName,
      fileId: storedFile?._id || r2Result.key,
      storage: 'r2',
    });
  } catch (error: any) {
    console.error('Error uploading file to Cloudflare R2:', error);
    return res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// Route to download/view stored files directly (streams from R2, MongoDB, or fallback)
router.get('/files/:fileId(*)', async (req: any, res: any) => {
  try {
    const { fileId } = req.params;

    let cleanId = fileId ? fileId.replace(/^\//, '') : '';
    if (!mongoose.Types.ObjectId.isValid(cleanId) && cleanId.includes('.')) {
      const possibleId = cleanId.replace(/\.[^/.]+$/, '');
      if (mongoose.Types.ObjectId.isValid(possibleId)) {
        cleanId = possibleId;
      }
    }

    let dbFile: any = null;
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      dbFile = await StoredFile.findById(cleanId);
    }

    if (!dbFile) {
      dbFile = await StoredFile.findOne({
        $or: [
          { key: cleanId },
          { key: cleanId.replace(/^[^/]+\//, '') },
          { key: { $regex: cleanId, $options: 'i' } },
          { filename: cleanId },
          { originalName: cleanId },
          { fileName: cleanId },
          { url: { $regex: cleanId, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 });
    }

    const { sendStoredFileResponse } = require('../app');
    if (dbFile) {
      return await sendStoredFileResponse(res, dbFile, req);
    }

    return await sendStoredFileResponse(res, { filename: cleanId.split('/').pop() || 'document.pdf', key: cleanId }, req);
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
