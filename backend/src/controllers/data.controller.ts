import { Request, Response } from 'express';
import { User, Role } from '../models/User';
import { Edition } from '../models/Edition';
import { Submission } from '../models/Submission';
import { AuditLog } from '../models/AuditLog';
import { Parser } from 'json2csv';

export const getSystemStats = async (req: Request, res: Response) => {
  try {
    const [editions, applications, registeredUsers, auditLogs] = await Promise.all([
      Edition.countDocuments(),
      Submission.countDocuments(),
      User.countDocuments({ role: Role.USER }), // Only standard users for the stat
      AuditLog.countDocuments()
    ]);

    return res.status(200).json({
      editions,
      applications,
      registeredUsers,
      auditLogs
    });
  } catch (error) {
    console.error('Failed to get system stats:', error);
    return res.status(500).json({ error: 'Failed to fetch system stats' });
  }
};

export const exportUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ role: Role.USER }).select('-passwordHash').lean();
    if (users.length === 0) {
      return res.status(404).json({ error: 'No users found to export' });
    }

    const fields = ['name', 'username', 'email', 'organization', 'state', 'district', 'isActive', 'createdAt'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(users);

    res.header('Content-Type', 'text/csv');
    res.attachment('users_export.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Failed to export users:', error);
    return res.status(500).json({ error: 'Failed to export users' });
  }
};

export const exportAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await User.find({ role: { $in: [Role.ADMIN, Role.SUPER_ADMIN] } }).select('-passwordHash').lean();
    if (admins.length === 0) {
      return res.status(404).json({ error: 'No admins found to export' });
    }

    const fields = ['name', 'username', 'email', 'role', 'organization', 'state', 'district', 'isActive', 'createdAt'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(admins);

    res.header('Content-Type', 'text/csv');
    res.attachment('admins_export.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Failed to export admins:', error);
    return res.status(500).json({ error: 'Failed to export admins' });
  }
};

export const exportSubmissions = async (req: Request, res: Response) => {
  try {
    const submissions = await Submission.find().populate('userId', 'name email').populate('editionId', 'name').lean();
    
    // Flatten data for CSV
    const flatData = submissions.map((sub: any) => ({
      submissionId: sub._id,
      userName: sub.userId?.name || 'Unknown',
      userEmail: sub.userId?.email || 'Unknown',
      editionName: sub.editionId?.name || 'Unknown',
      status: sub.status,
      score: sub.score || 0,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt
    }));

    if (flatData.length === 0) {
      return res.status(404).json({ error: 'No submissions found to export' });
    }

    const fields = ['submissionId', 'userName', 'userEmail', 'editionName', 'status', 'score', 'createdAt', 'updatedAt'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(flatData);

    res.header('Content-Type', 'text/csv');
    res.attachment('submissions_export.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Failed to export submissions:', error);
    return res.status(500).json({ error: 'Failed to export submissions' });
  }
};
