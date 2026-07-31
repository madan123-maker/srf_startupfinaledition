import mongoose from 'mongoose';
import { Edition, IEdition, EditionStatus } from '../models/Edition';
import { Submission, SubmissionStatus } from '../models/Submission';
import { Assignment } from '../models/Assignment';
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
      const editionStrId = edition._id.toString();
      let editionObjId: mongoose.Types.ObjectId | null = null;
      try {
        editionObjId = new mongoose.Types.ObjectId(editionStrId);
      } catch {
        // ignore
      }

      const idQuery = editionObjId ? { $in: [editionObjId, editionStrId] } : editionStrId;

      // Fetch non-draft submissions for this edition
      const nonDraftSubmissionsRaw = await Submission.find({
        editionId: idQuery,
        status: { $ne: SubmissionStatus.DRAFT }
      }).populate('userId', '_id name email').lean();

      // Filter out orphaned submissions where user was deleted (userId === null)
      const nonDraftSubmissions = nonDraftSubmissionsRaw.filter((s: any) => s.userId != null);

      // Fetch submitted / evaluated assignments for this edition
      const submittedAssignments = await Assignment.find({
        editionId: idQuery,
        status: { $in: ['SUBMITTED', 'EVALUATED'] }
      }).lean();

      let totalSubmissions = nonDraftSubmissions.length;
      let pending = 0;
      let approved = 0;
      let rejected = 0;
      let sumScore = 0;
      let approvedCount = 0;

      nonDraftSubmissions.forEach((s: any) => {
        let hasResubmission = false;
        let hasApprovedFields = false;
        let score = s.totalScore || 0;

        if (Array.isArray(s.responses)) {
          s.responses.forEach((r: any) => {
            if (Array.isArray(r.fieldResponses)) {
              r.fieldResponses.forEach((f: any) => {
                if (f.evaluationStatus === 'RESUBMISSION_REQUIRED') hasResubmission = true;
                if (f.evaluationStatus === 'APPROVED') hasApprovedFields = true;
                if (f.score) score += f.score;
              });
            }
            if (Array.isArray(r.additionalFiles)) {
              r.additionalFiles.forEach((f: any) => {
                if (f.evaluationStatus === 'RESUBMISSION_REQUIRED') hasResubmission = true;
                if (f.evaluationStatus === 'APPROVED') hasApprovedFields = true;
                if (f.score) score += f.score;
              });
            }
            if (Array.isArray(r.supportingDocumentResponses)) {
              r.supportingDocumentResponses.forEach((d: any) => {
                if (d.evaluationStatus === 'RESUBMISSION_REQUIRED') hasResubmission = true;
                if (d.evaluationStatus === 'APPROVED') hasApprovedFields = true;
                if (Array.isArray(d.files)) {
                  d.files.forEach((f: any) => {
                    if (f.evaluationStatus === 'RESUBMISSION_REQUIRED') hasResubmission = true;
                    if (f.evaluationStatus === 'APPROVED') hasApprovedFields = true;
                    if (f.score) score += f.score;
                  });
                }
              });
            }
          });
        }

        const isPending = hasResubmission || s.status === 'PENDING';
        const isApproved = !isPending && (s.status === SubmissionStatus.APPROVED || hasApprovedFields);
        const isRejected = !isPending && !isApproved && s.status === SubmissionStatus.REJECTED;

        if (isPending) {
          pending++;
        } else if (isApproved) {
          approved++;
        } else if (isRejected) {
          rejected++;
        } else {
          pending++;
        }

        if (isApproved || score > 0) {
          sumScore += score;
          approvedCount++;
        }
      });

      const avgScore = approvedCount > 0 ? Math.round((sumScore / approvedCount) * 10) / 10 : 0;

      return {
        ...edition,
        stats: {
          totalSubmissions,
          pending,
          approved,
          rejected,
          avgScore
        }
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
    const editions = await Edition.find({
      status: { $in: [EditionStatus.PUBLISHED, 'published', 'PUBLISHED'] as any }
    })
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
