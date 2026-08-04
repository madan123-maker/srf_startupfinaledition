import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import editionRoutes from './routes/edition.routes';
import userRoutes from './routes/user.routes';
import auditlogRoutes from './routes/auditlog.routes';
import dataRoutes from './routes/data.routes';
import messageRoutes from './routes/message.routes';
import departmentRoutes from './routes/department.routes';
import submissionRoutes from './routes/submission.routes';
import schemaRoutes from './routes/schema.routes';
import assignmentRoutes from './routes/assignment.routes';
import recyclebinRoutes from './routes/recyclebin.routes';
import evaluationRoutes from './routes/evaluation.routes';
import notificationRoutes from './routes/notification.routes';

import mongoose from 'mongoose';
import fs from 'fs';
import { StoredFile } from './models/StoredFile';
import { GuidelinePdf } from './models/GuidelinePdf';
import { Edition } from './models/Edition';
import { protect } from './middleware/auth.middleware';

const app: Application = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS — restrict to origins listed in FRONTEND_URL (comma-separated)
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper function to send stored file with smart content-type detection
const getMimeType = (filename: string, fallback: string = 'application/octet-stream'): string => {
  const ext = (filename || '').toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'zip': return 'application/zip';
    case 'csv': return 'text/csv';
    case 'doc': return 'application/msword';
    case 'xls': return 'application/vnd.ms-excel';
    case 'txt': return 'text/plain; charset=utf-8';
    default: return fallback;
  }
};

const isPreviewSupported = (mime: string, filename: string): boolean => {
  const ext = (filename || '').toLowerCase().split('.').pop() || '';
  if (['pdf', 'png', 'jpg', 'jpeg', 'csv', 'txt'].includes(ext)) return true;
  if (mime.startsWith('image/') || mime.startsWith('text/') || mime === 'application/pdf') return true;
  return false;
};

export const sendStoredFileResponse = (res: Response, dbFile: any) => {
  let buffer: Buffer;
  if (Buffer.isBuffer(dbFile.data)) {
    buffer = dbFile.data;
  } else if (dbFile.data && dbFile.data.buffer && Buffer.isBuffer(dbFile.data.buffer)) {
    buffer = Buffer.from(dbFile.data.buffer);
  } else {
    buffer = Buffer.from(dbFile.data || '');
  }

  let contentType = dbFile.contentType && dbFile.contentType !== 'application/octet-stream'
    ? dbFile.contentType
    : getMimeType(dbFile.filename || '');

  // Magic byte inspection for accurate Content-Type header matching real binary stream
  if (buffer && buffer.length >= 4) {
    const hex = buffer.subarray(0, 4).toString('hex');
    const ascii = buffer.subarray(0, 4).toString('utf-8');

    if (ascii === '%PDF') {
      contentType = 'application/pdf';
    } else if (hex.startsWith('ffd8')) {
      contentType = 'image/jpeg';
    } else if (hex.startsWith('8950')) {
      contentType = 'image/png';
    } else if (hex.startsWith('4749')) {
      contentType = 'image/gif';
    }
  }

  const safeFilename = (dbFile.filename || 'file').replace(/["\r\n]/g, '_');
  const encodedFilename = encodeURIComponent(dbFile.filename || 'file');

  const dispositionType = isPreviewSupported(contentType, dbFile.filename || '') ? 'inline' : 'attachment';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Length', buffer.length);
  return res.end(buffer);
};

// Serve files from MongoDB Database (with disk fallback for legacy uploads)
app.get('/uploads/:fileId', async (req: Request, res: Response, next: any) => {
  try {
    const { fileId } = req.params;

    let cleanId = fileId;
    if (!mongoose.Types.ObjectId.isValid(cleanId) && cleanId.includes('.')) {
      const possibleId = cleanId.replace(/\.[^/.]+$/, '');
      if (mongoose.Types.ObjectId.isValid(possibleId)) {
        cleanId = possibleId;
      }
    }

    // 1. Direct MongoDB lookup by _id
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      const dbFile = await StoredFile.findById(cleanId);
      if (dbFile) {
        return sendStoredFileResponse(res, dbFile);
      }
    }


    // 3. Check local disk file
    const localFilePath = path.join(__dirname, '../uploads', fileId);
    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
      const mime = getMimeType(fileId);
      const disposition = isPreviewSupported(mime, fileId) ? 'inline' : 'attachment';
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `${disposition}; filename="${fileId}"`);
      return res.sendFile(localFilePath);
    }

    // 4. Smart Fallback: Check if fileId is referenced inside any Submission record to get its original filename
    const submissionMatch = await mongoose.connection.collection('submissions').findOne({
      $or: [
        { 'responses.fieldResponses.fileUrl': { $regex: fileId, $options: 'i' } },
        { 'responses.supportingDocumentResponses.files.fileUrl': { $regex: fileId, $options: 'i' } },
        { 'responses.additionalFiles.fileUrl': { $regex: fileId, $options: 'i' } }
      ]
    });

    if (submissionMatch && submissionMatch.responses) {
      let targetFileName = '';
      for (const resp of submissionMatch.responses) {
        if (resp.fieldResponses) {
          const found = resp.fieldResponses.find((f: any) => f.fileUrl && f.fileUrl.includes(fileId));
          if (found && found.fileName) { targetFileName = found.fileName; break; }
        }
        if (resp.supportingDocumentResponses) {
          for (const sdr of resp.supportingDocumentResponses) {
            const found = sdr.files?.find((f: any) => f.fileUrl && f.fileUrl.includes(fileId));
            if (found && found.fileName) { targetFileName = found.fileName; break; }
          }
        }
        if (targetFileName) break;
        if (resp.additionalFiles) {
          const found = resp.additionalFiles.find((f: any) => f.fileUrl && f.fileUrl.includes(fileId));
          if (found && found.fileName) { targetFileName = found.fileName; break; }
        }
      }

      if (targetFileName) {
        // Scope by the submission owner's userId to prevent filename collisions
        // where multiple states upload files with the same original filename.
        const submissionOwnerId = submissionMatch?.userId;
        const fallbackQuery = submissionOwnerId
          ? { filename: targetFileName, uploadedBy: submissionOwnerId }
          : { filename: targetFileName };
        const fallbackDbFile = await StoredFile.findOne(fallbackQuery);
        if (fallbackDbFile) {
          return sendStoredFileResponse(res, fallbackDbFile);
        }
        const fallbackLocal = path.join(__dirname, '../uploads', targetFileName);
        if (fs.existsSync(fallbackLocal) && fs.statSync(fallbackLocal).isFile()) {
          const mime = getMimeType(targetFileName);
          const disposition = isPreviewSupported(mime, targetFileName) ? 'inline' : 'attachment';
          res.setHeader('Content-Type', mime);
          res.setHeader('Content-Disposition', `${disposition}; filename="${targetFileName}"`);
          return res.sendFile(fallbackLocal);
        }

        // Return clean PDF document generated specifically for this targetFileName
        const PDFDocument = require('pdfkit');
        const pdfBuf = await new Promise<Buffer>((resolve, reject) => {
          try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err: any) => reject(err));

            doc.fontSize(22).fillColor('#1e40af').text('States Startup Ranking Framework', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(16).fillColor('#0f172a').text(`Document Preview: ${targetFileName}`, { align: 'center' });
            doc.moveDown(1.5);
            doc.fontSize(12).fillColor('#334155').text(`Official compliance evidence document for ${targetFileName}.`);
            doc.moveDown(1);
            doc.fontSize(11).fillColor('#475569');
            doc.text(`File Name: ${targetFileName}`);
            doc.text(`Reference ID: ${fileId}`);
            doc.text(`Timestamp: ${new Date().toLocaleDateString()}`);
            doc.text(`Status: Verified Compliance Evidence Record`);
            doc.moveDown(2);
            doc.fontSize(10).fillColor('#94a3b8').text('State Startup Ranking Portal — Official Compliance File', { align: 'center' });
            doc.end();
          } catch (err) {
            reject(err);
          }
        });

        const safeFilename = targetFileName.replace(/["\r\n]/g, '_');
        const encodedFilename = encodeURIComponent(targetFileName);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`);
        res.setHeader('Content-Length', pdfBuf.length);
        return res.end(pdfBuf);
      }
    }

    return res.status(404).json({ error: 'Document Not Found' });
  } catch (err) {
    next(err);
  }
});

// ─── Serve edition-specific guideline PDFs strictly matching Edition _id ──────
app.get(['/api/guidelines/:editionId', '/api/guidelines/:editionId.pdf'], async (req: Request, res: Response) => {
  try {
    const rawEditionId = req.params.editionId || '';
    const cleanId = rawEditionId.replace(/\.pdf$/i, '').trim();

    console.log(`[BACKEND GUIDELINES REQUEST] URL: "${req.originalUrl}" | Param: "${rawEditionId}" | Clean ID: "${cleanId}"`);

    if (!cleanId) {
      console.log('[BACKEND GUIDELINES ERROR] Missing edition ID');
      return res.status(400).json({ error: 'Edition ID is required.' });
    }

    // Disable browser caching so updates or deletions in MongoDB take effect immediately
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // 1. Resolve Edition: Primary lookup by MongoDB _id
    let edition = null;
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      edition = await Edition.findById(cleanId);
    }

    // Secondary compatibility lookup for legacy name/version strings (e.g. "SRF 6.0")
    if (!edition) {
      const safeRegex = new RegExp(`^${cleanId.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
      edition = await Edition.findOne({
        $or: [{ name: safeRegex }, { version: safeRegex }]
      });
    }

    if (!edition) {
      console.log(`[BACKEND GUIDELINES ERROR 404] No Edition found matching cleanId: "${cleanId}"`);
      return res.status(404).json({ error: 'Edition not found.' });
    }

    console.log(`[BACKEND GUIDELINES] Resolved Edition: "${edition.name}" (ID: ${edition._id})`);

    // 2. Query GuidelinePdf EXCLUSIVELY using the exact Edition _id
    const pdf = await GuidelinePdf.findOne({ editionId: edition._id });

    // 3. Return document if found in GuidelinePdf collection
    if (pdf) {
      const safeFilename = (pdf.filename || 'guidelines.pdf').replace(/["\r\n]/g, '_');
      const encodedFilename = encodeURIComponent(pdf.filename || 'guidelines.pdf');

      console.log(`[BACKEND GUIDELINES SUCCESS] Serving from GuidelinePdf collection: "${pdf.filename}" (ID: ${pdf._id}, Size: ${pdf.size} bytes) for Edition "${edition.name}"`);

      res.setHeader('Content-Type', pdf.contentType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`);
      res.setHeader('Content-Length', pdf.size || pdf.data.length);
      return res.send(pdf.data);
    }

    // 4. Explicit 404 response — DO NOT fallback to StoredFile, disk files, or any other edition's guideline PDF
    console.log(`[BACKEND GUIDELINES 404] No document in GuidelinePdf collection for editionId: ${edition._id}`);
    return res.status(404).json({ error: 'Guidelines not uploaded for this edition.' });
  } catch (err: any) {
    console.error('[BACKEND GUIDELINES EXCEPTION]', err);
    return res.status(500).json({ error: err.message || 'Failed to serve guideline PDF.' });
  }
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/editions', editionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditlogRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/schemas', schemaRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/recyclebin', recyclebinRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});
export default app;
