import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
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

const app: Application = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve files from MongoDB Database (with disk fallback for legacy uploads)
app.get('/uploads/:fileId', async (req: Request, res: Response, next: any) => {
  try {
    const { fileId } = req.params;

    if (mongoose.Types.ObjectId.isValid(fileId)) {
      const dbFile = await StoredFile.findById(fileId);
      if (dbFile) {
        res.setHeader('Content-Type', dbFile.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(dbFile.filename)}"`);
        res.setHeader('Content-Length', dbFile.size || dbFile.data.length);
        return res.send(dbFile.data);
      }
    }

    // Check MongoDB database by filename
    const dbFileByName = await StoredFile.findOne({ filename: fileId });
    if (dbFileByName) {
      res.setHeader('Content-Type', dbFileByName.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(dbFileByName.filename)}"`);
      res.setHeader('Content-Length', dbFileByName.size || dbFileByName.data.length);
      return res.send(dbFileByName.data);
    }

    const localFilePath = path.join(__dirname, '../uploads', fileId);
    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
      return res.sendFile(localFilePath);
    }

    return res.status(404).json({ error: 'File not found' });
  } catch (err) {
    next(err);
  }
});

// ─── Serve edition-specific guideline PDFs from GuidelinePdf collection ──────
app.get('/api/guidelines/:editionId', async (req: Request, res: Response) => {
  try {
    const { editionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(editionId)) {
      return res.status(400).json({ error: 'Invalid editionId.' });
    }
    const pdf = await GuidelinePdf.findOne({ editionId: new mongoose.Types.ObjectId(editionId) });
    if (!pdf) {
      return res.status(404).json({ error: 'No guideline PDF uploaded for this edition.' });
    }
    res.setHeader('Content-Type', pdf.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pdf.filename)}"`);
    res.setHeader('Content-Length', pdf.size || pdf.data.length);
    return res.send(pdf.data);
  } catch (err: any) {
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
