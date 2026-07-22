import { Request, Response } from 'express';
import { User, Role } from '../models/User';
import { Edition } from '../models/Edition';
import { Submission } from '../models/Submission';
import { Assignment } from '../models/Assignment';
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
    const { editionId } = req.query;
    const filter: any = {};
    if (editionId && editionId !== 'all') {
      filter.editionId = editionId;
    }

    const submissions = await Submission.find(filter).populate('userId', 'name email').populate('editionId', 'name').lean();
    
    // Flatten data for CSV
    const flatData = submissions.map((sub: any) => ({
      submissionId: sub._id,
      userName: sub.userId?.name || 'Unknown',
      userEmail: sub.userId?.email || 'Unknown',
      editionName: sub.editionId?.name || 'Unknown',
      status: sub.status,
      score: sub.totalScore ?? sub.score ?? 0,
      awardedScore: sub.totalScore ?? sub.score ?? 0,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt
    }));

    if (flatData.length === 0) {
      return res.status(404).json({ error: 'No submissions found to export' });
    }

    const fields = ['submissionId', 'userName', 'userEmail', 'editionName', 'status', 'score', 'awardedScore', 'createdAt', 'updatedAt'];
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

export const exportFilteredSubmissions = async (req: Request, res: Response) => {
  try {
    const { editionId, userId, status } = req.query;

    const assignmentFilter: any = {};
    if (editionId && editionId !== 'all') {
      assignmentFilter.editionId = editionId;
    }
    if (userId && userId !== 'all') {
      assignmentFilter.userId = userId;
    }
    if (status && status !== 'all') {
      assignmentFilter.$or = [
        { status: status },
        { evaluationStatus: status }
      ];
    }

    const assignments = await Assignment.find(assignmentFilter)
      .populate('userId', 'name email state organization')
      .populate('editionId', 'name version')
      .sort({ updatedAt: -1 })
      .lean();

    const flatData: any[] = await Promise.all(assignments.map(async (asgn: any) => {
      const taskLabel = asgn.questionTitle || asgn.actionPointTitle || asgn.reformAreaTitle || 'Full Edition';
      const effectiveStatus = asgn.evaluationStatus || asgn.status || 'DRAFT';

      let calcScore = asgn.awardedScore;
      let calcMaxScore = asgn.maxScore;

      const rawEditionId = (asgn.editionId as any)?._id || asgn.editionId;
      const rawUserId = (asgn.userId as any)?._id || asgn.userId;

      if (rawEditionId && rawUserId) {
        const sub = await Submission.findOne({ editionId: rawEditionId, userId: rawUserId }).lean();
        if (sub) {
          if (calcScore === undefined || calcScore === null) {
            calcScore = sub.totalScore;
          }
          if (asgn.questionId && sub.responses) {
            const qResp = sub.responses.find((r: any) => r.questionId === asgn.questionId);
            if (qResp && qResp.score !== undefined && qResp.score !== null) {
              calcScore = qResp.score;
            }
          }
        }
      }

      return {
        recordId: asgn._id,
        userName: asgn.userId?.name || 'N/A',
        userEmail: asgn.userId?.email || 'N/A',
        state: asgn.userId?.state || 'N/A',
        organization: asgn.userId?.organization || 'DPIIT',
        editionName: asgn.editionId ? `${asgn.editionId.name} (v${asgn.editionId.version})` : 'N/A',
        scope: asgn.scope,
        taskTitle: taskLabel,
        status: effectiveStatus,
        score: calcScore ?? 0,
        awardedScore: calcScore ?? 0,
        maxScore: calcMaxScore ?? 1,
        evaluationRemarks: asgn.evaluationRemarks || '—',
        assignedAt: asgn.createdAt ? new Date(asgn.createdAt).toLocaleString() : 'N/A',
        lastUpdated: asgn.updatedAt ? new Date(asgn.updatedAt).toLocaleString() : 'N/A',
      };
    }));

    if (flatData.length === 0) {
      const subFilter: any = {};
      if (editionId && editionId !== 'all') subFilter.editionId = editionId;
      if (userId && userId !== 'all') subFilter.userId = userId;
      if (status && status !== 'all') subFilter.status = status;

      const submissions = await Submission.find(subFilter)
        .populate('userId', 'name email state organization')
        .populate('editionId', 'name version')
        .sort({ updatedAt: -1 })
        .lean();

      submissions.forEach((sub: any) => {
        flatData.push({
          recordId: sub._id,
          userName: sub.userId?.name || 'N/A',
          userEmail: sub.userId?.email || 'N/A',
          state: sub.stateName || sub.userId?.state || 'N/A',
          organization: sub.userId?.organization || 'DPIIT',
          editionName: sub.editionId ? `${sub.editionId.name} (v${sub.editionId.version})` : 'N/A',
          scope: 'EDITION',
          taskTitle: 'Full Edition Submission',
          status: sub.status,
          score: sub.totalScore ?? 0,
          awardedScore: sub.totalScore ?? 0,
          maxScore: 100,
          evaluationRemarks: '—',
          assignedAt: sub.createdAt ? new Date(sub.createdAt).toLocaleString() : 'N/A',
          lastUpdated: sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : 'N/A',
        });
      });
    }

    if (flatData.length === 0) {
      return res.status(404).json({ error: 'No matching records found for the selected filters' });
    }

    const fields = [
      'recordId',
      'userName',
      'userEmail',
      'state',
      'organization',
      'editionName',
      'scope',
      'taskTitle',
      'status',
      'score',
      'awardedScore',
      'maxScore',
      'evaluationRemarks',
      'assignedAt',
      'lastUpdated'
    ];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(flatData);

    res.header('Content-Type', 'text/csv');
    res.attachment('filtered_export.csv');
    return res.send(csv);
  } catch (error: any) {
    console.error('Failed to export filtered submissions:', error);
    return res.status(500).json({ error: error.message || 'Failed to export filtered submissions' });
  }
};
