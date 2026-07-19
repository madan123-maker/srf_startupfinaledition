import { Edition, IEdition, EditionStatus } from '../models/Edition';
import { Submission, SubmissionStatus } from '../models/Submission';

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
    const editions = await Edition.find().sort({ createdAt: -1 }).lean();
    
    // For each edition, aggregate submission metrics to show on the card
    const editionsWithStats = await Promise.all(editions.map(async (edition) => {
      const stats = await Submission.aggregate([
        { $match: { editionId: edition._id } },
        { 
          $group: { 
            _id: null,
            totalSubmissions: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', SubmissionStatus.UNDER_REVIEW] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', SubmissionStatus.APPROVED] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', SubmissionStatus.REJECTED] }, 1, 0] } },
            avgScore: { $avg: '$totalScore' }
          }
        }
      ]);

      const defaultStats = { totalSubmissions: 0, pending: 0, approved: 0, rejected: 0, avgScore: 0 };
      
      return {
        ...edition,
        stats: stats.length > 0 ? stats[0] : defaultStats
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
    edition.status = edition.status === EditionStatus.PUBLISHED ? EditionStatus.DRAFT : EditionStatus.PUBLISHED;
    
    // Only set publishedAt if it's being published and doesn't already have one
    if (edition.status === EditionStatus.PUBLISHED && !edition.publishedAt) {
      edition.publishedAt = new Date();
    }

    await edition.save();
    return edition;
  }

  async getPublicEditions() {
    // Standard users should only see published editions
    const editions = await Edition.find({ status: EditionStatus.PUBLISHED })
                                 .sort({ publishedAt: -1 })
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

  async deleteEdition(editionId: string) {
    const cleanId = editionId.trim();
    const edition = await Edition.findByIdAndDelete(cleanId);
    if (!edition) {
      throw new Error(`Edition not found for id: ${cleanId}`);
    }
    
    // Also delete any submissions tied to this edition
    await Submission.deleteMany({ editionId: cleanId });
    
    return { success: true, message: 'Edition deleted successfully' };
  }
}
