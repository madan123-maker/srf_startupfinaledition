import { Router } from 'express';
import {
  getSubmissionsByEdition,
  getMySubmission,
  updateMySubmission,
  evaluateDocument,
  getSubmissionById,
} from '../controllers/submission.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isDriveEnabled, getOrCreateFolder, uploadFileToDrive } from '../services/googleDriveService';

// Always save to a local temp dir first, then push to Drive if enabled
const tempDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const router = Router();

// ─── File Upload Route ─────────────────────────────────────────────────────
// If Google Drive is enabled, upload temp file → Drive and return webViewLink.
// Otherwise fall back to serving the file from local /uploads.
router.post('/upload', protect as any, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const localPath = req.file.path;
    const originalName = req.file.originalname;

    if (isDriveEnabled()) {
      try {
        // Get or create an "SRF Submissions" folder in Drive
        const folderId = await getOrCreateFolder('SRF Submissions');
        const { fileId, webViewLink } = await uploadFileToDrive(localPath, folderId, originalName);

        // Delete the temp file after successful upload
        fs.unlink(localPath, () => {});

        return res.status(200).json({
          fileUrl: webViewLink,
          fileName: originalName,
          fileId,
          storage: 'drive',
        });
      } catch (driveErr: any) {
        console.error('Drive upload failed, falling back to local storage:', driveErr.message);
        // Fall through to local storage on Drive error
      }
    }

    // Local storage fallback — move temp file to /uploads
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const destPath = path.join(uploadsDir, req.file.filename);
    fs.renameSync(localPath, destPath);

    return res.status(200).json({
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: originalName,
      storage: 'local',
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// ─── State User Workspace routes (Protected) ──────────────────────────────
router.get('/edition/:editionId/my-submission', protect as any, getMySubmission);
router.put('/:id', protect as any, updateMySubmission);

// ─── Protected Admin routes ────────────────────────────────────────────────
router.get('/edition/:editionId', protect as any, adminOnly as any, getSubmissionsByEdition);
router.get('/:id', protect as any, adminOnly as any, getSubmissionById);
router.post('/:id/evaluate-document', protect as any, adminOnly as any, evaluateDocument);

export default router;
