import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';

export class AuditLogService {
  async createLog(data: {
    userId?: string;
    userName?: string;
    userRole?: string;
    action: string;
    entity: string;
    entityId: string;
    details?: any;
  }) {
    try {
      const log = await AuditLog.create(data);
      return log;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // We don't want to throw and break main flows if audit logging fails
    }
  }

  async getLogs(filters: any = {}) {
    const andConditions: any[] = [];

    // Order of execution: Search -> Role -> District -> Action -> Date Range

    // 1. Search (Search across username, full name, email, role, action, entity, entityId)
    if (filters.search && filters.search.trim() !== '') {
      const safeSearch = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingUsersForSearch = await User.find({
        $or: [
          { name: { $regex: safeSearch, $options: 'i' } },
          { username: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } },
        ]
      }, '_id email name username').lean();

      const searchUserIds = matchingUsersForSearch.map(u => String(u._id));
      const searchEmails = matchingUsersForSearch.map(u => u.email.toLowerCase());

      andConditions.push({
        $or: [
          { userName: { $regex: safeSearch, $options: 'i' } },
          { userRole: { $regex: safeSearch, $options: 'i' } },
          { action: { $regex: safeSearch, $options: 'i' } },
          { entity: { $regex: safeSearch, $options: 'i' } },
          { entityId: { $regex: safeSearch, $options: 'i' } },
          { userId: { $in: searchUserIds } },
          { entityId: { $in: searchEmails } },
        ]
      });
    }

    // 2. Role / User Type filter
    let roleFilterQuery: any = null;
    if (filters.admin && filters.admin !== 'All Admins / Reviewers') {
      if (filters.admin === 'Super Administrators') {
        roleFilterQuery = 'SUPER_ADMIN';
        andConditions.push({ userRole: 'SUPER_ADMIN' });
      } else if (filters.admin === 'Standard Admins') {
        roleFilterQuery = { $in: ['ADMIN', 'EVALUATOR'] };
        andConditions.push({ userRole: { $in: ['ADMIN', 'EVALUATOR'] } });
      } else if (filters.admin === 'Regular Users') {
        roleFilterQuery = 'USER';
        andConditions.push({ userRole: 'USER' });
      } else {
        const safeAdmin = filters.admin.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        andConditions.push({
          $or: [
            { userName: { $regex: safeAdmin, $options: 'i' } },
            { userId: filters.admin }
          ]
        });
      }
    }

    // 3. District filter (Strict user profile join)
    if (filters.district && filters.district !== 'All Districts') {
      const cleanDistrict = filters.district.trim().toLowerCase().replace(/^(ap\s*-\s*|andhra\s+pradesh\s*-\s*)/i, '');
      const matchingUsersForDistrict = await User.find({
        $or: [
          { district: { $regex: `^${cleanDistrict}$`, $options: 'i' } },
          { district: { $regex: cleanDistrict, $options: 'i' } }
        ]
      }, '_id email name username district').lean();

      const districtUserIds = matchingUsersForDistrict.map(u => String(u._id));
      const districtEmails = matchingUsersForDistrict.map(u => u.email.toLowerCase());
      const districtNames = matchingUsersForDistrict.map(u => u.name || '');

      andConditions.push({
        $or: [
          { userId: { $in: districtUserIds } },
          { entityId: { $in: districtEmails } },
          { userName: { $in: districtNames } },
          { "details.district": { $regex: cleanDistrict, $options: 'i' } },
          { "details.stateName": { $regex: cleanDistrict, $options: 'i' } }
        ]
      });
    }

    // 4. Action filter
    if (filters.action && filters.action !== 'All Actions') {
      if (filters.action === 'Login History') {
        andConditions.push({ action: { $regex: /login|auth|otp/i } });
      } else if (filters.action === 'Approvals (App/Doc/Q)') {
        andConditions.push({ action: { $regex: /approve|approved|approval|done/i } });
      } else if (filters.action === 'Rejections & Resubmissions') {
        andConditions.push({ action: { $regex: /reject|rejected|resubmi/i } });
      } else if (filters.action === 'Task Assignments') {
        andConditions.push({ action: { $regex: /assign|reassign/i } });
      } else {
        andConditions.push({ action: { $regex: new RegExp(filters.action, 'i') } });
      }
    }

    // 5. Date Range filter (inclusive)
    if (filters.startDate || filters.endDate) {
      const dateCond: any = {};
      if (filters.startDate) {
        dateCond.$gte = new Date(`${filters.startDate}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        dateCond.$lte = new Date(`${filters.endDate}T23:59:59.999Z`);
      }
      andConditions.push({ createdAt: dateCond });
    }

    const query: any = andConditions.length > 0 ? { $and: andConditions } : {};
    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(300).lean();

    // Compute dynamic available districts for matching role/users
    const userQuery: any = roleFilterQuery ? { role: roleFilterQuery } : {};
    const matchingUsers = await User.find(userQuery, 'district state').lean();

    const stateNamesToIgnore = new Set(['ap', 'andhra pradesh', 'andhrapradesh', 'ts', 'telangana', 'ka', 'karnataka']);
    const districtSet = new Set<string>();
    matchingUsers.forEach(u => {
      if (u.district && u.district.trim()) {
        const dist = u.district.trim();
        if (!stateNamesToIgnore.has(dist.toLowerCase())) {
          districtSet.add(dist);
        }
      }
    });

    const availableDistricts = Array.from(districtSet).sort();

    return { logs, availableDistricts };
  }
}

export const auditLogService = new AuditLogService();
