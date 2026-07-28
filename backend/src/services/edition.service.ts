import { Edition, IEdition, EditionStatus } from '../models/Edition';
import { Submission, SubmissionStatus } from '../models/Submission';
import { RecycleBin, EntityType } from '../models/RecycleBin';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

export class EditionService {
  async createEdition(editionData: Partial<IEdition>, createdBy: string) {
    const existingEdition = await Edition.findOne({ name: editionData.name });
    if (existingEdition) {
      throw new Error(`An edition with the name ${editionData.name} already exists.`);
    }

    const newEdition = await Edition.create({
      ...editionData,
      createdBy,
      status: EditionStatus.DRAFT, // Always default to DRAFT initially
    });

    return newEdition;
  }

  async getAllEditions() {
    // Get all editions
    const editions = await Edition.find().sort({ createdAt: 1 }).lean();
    
    // Import dynamically to avoid circular dependencies if any
    const { buildConsolidatedSubmission } = require('../controllers/submission.controller');

    // For each edition, aggregate submission metrics to show on the card
    const editionsWithStats = await Promise.all(editions.map(async (edition) => {
      let statsToUse: any = { totalSubmissions: 0, pending: 0, approved: 0, rejected: 0, avgScore: 0 };
      
      try {
        const consolidated = await buildConsolidatedSubmission(edition._id.toString());
        if (consolidated && consolidated.responses && consolidated.responses.length > 0) {
          if (consolidated.status === 'APPROVED' || consolidated.status === 'REJECTED') {
            statsToUse = {
              totalSubmissions: 1,
              pending: consolidated.status === 'UNDER_REVIEW' ? 1 : 0,
              approved: consolidated.status === 'APPROVED' ? 1 : 0,
              rejected: consolidated.status === 'REJECTED' ? 1 : 0,
              avgScore: consolidated.totalScore || 0
            };
          } else {
            statsToUse = { totalSubmissions: '-', pending: '-', approved: '-', rejected: '-', avgScore: '-' };
          }
          return {
            ...edition,
            stats: statsToUse
          };
        }
      } catch (e) {
        console.error('Error fetching consolidated stats for edition:', e);
      }

      // Aggregation for non-draft submissions
      const nonDraftSubmissions = await Submission.find({ editionId: edition._id, status: { $ne: EditionStatus.DRAFT as any } }).lean();
      if (nonDraftSubmissions.length > 0) {
        const stats = await Submission.aggregate([
          { $match: { editionId: edition._id, status: { $ne: 'DRAFT' } } },
          { 
            $group: { 
              _id: null,
              totalSubmissions: { $sum: 1 },
              pending: { $sum: { $cond: [{ $in: ['$status', [SubmissionStatus.UNDER_REVIEW, SubmissionStatus.SUBMITTED]] }, 1, 0] } },
              approved: { $sum: { $cond: [{ $eq: ['$status', SubmissionStatus.APPROVED] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ['$status', SubmissionStatus.REJECTED] }, 1, 0] } },
              avgScore: { $avg: '$totalScore' }
            }
          }
        ]);
        if (stats.length > 0) {
          statsToUse = stats[0];
        }
      }
      
      return {
        ...edition,
        stats: statsToUse
      };
    }));

    return editionsWithStats;
  }

  async togglePublishStatus(editionId: string) {
    console.log("togglePublishStatus received ID:", editionId, "typeof:", typeof editionId);
    
    // Sometimes whitespace can sneak in
    const cleanId = editionId.trim();
    
    const edition = await Edition.findById(cleanId);
    
    console.log("FindById result:", edition ? "Found" : "Null");
    
    if (!edition) {
      throw new Error(`Edition not found for id: ${cleanId}`);
    }

    // Toggle between DRAFT and PUBLISHED
    const previousStatus = edition.status;
    edition.status = edition.status === EditionStatus.PUBLISHED ? EditionStatus.DRAFT : EditionStatus.PUBLISHED;
    
    // Only set publishedAt if it's being published and doesn't already have one
    if (edition.status === EditionStatus.PUBLISHED && !edition.publishedAt) {
      edition.publishedAt = new Date();
    }

    await edition.save();

    // Trigger notifications if newly published
    if (previousStatus !== EditionStatus.PUBLISHED && edition.status === EditionStatus.PUBLISHED) {
      try {
        const allUsers = await User.find({ status: { $ne: 'DEACTIVATED' } }).select('_id role');
        const notifications = allUsers.map(u => ({
          userId: u._id,
          message: `Edition "${edition.name}" has been published!`,
          link: u.role === 'USER' ? '/user-dashboard' : '/admin/editions',
          isRead: false,
          createdAt: new Date()
        }));
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } catch (notifErr) {
        console.error('Failed to create publish notifications:', notifErr);
      }
    }

    return edition;
  }

  async getPublicEditions() {
    // Standard users should only see published editions
    const editions = await Edition.find({ status: EditionStatus.PUBLISHED })
                                 .sort({ createdAt: 1 })
                                 .lean();
    return editions;
  }

  async getEditionById(editionId: string) {
    const cleanId = editionId.trim();
    const edition = await Edition.findById(cleanId).lean();
    if (!edition) {
      throw new Error(`Edition not found for id: ${cleanId}`);
    }
    return edition;
  }

  async deleteEdition(editionId: string, deletedBy: string) {
    const cleanId = editionId.trim();
    
    // First find it to save to recycle bin
    const edition = await Edition.findById(cleanId).lean();
    if (!edition) {
      throw new Error(`Edition not found for id: ${cleanId}`);
    }

    // Save to Recycle Bin
    await RecycleBin.create({
      originalId: edition._id.toString(),
      entityType: EntityType.EDITION,
      entityName: edition.name,
      data: edition,
      deletedBy
    });

    // Delete it from main collection
    await Edition.findByIdAndDelete(cleanId);
    
    // Also delete any submissions tied to this edition
    // In a real app we might want to recycle these too, but for now we just delete them
    await Submission.deleteMany({ editionId: cleanId });
    
    return { success: true, message: 'Edition deleted successfully' };
  }
}
