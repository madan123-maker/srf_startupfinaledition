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

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
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
