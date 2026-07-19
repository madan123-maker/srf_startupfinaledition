"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditionService = void 0;
const Edition_1 = require("../models/Edition");
const Submission_1 = require("../models/Submission");
class EditionService {
    async createEdition(editionData, createdBy) {
        const existingEdition = await Edition_1.Edition.findOne({ name: editionData.name });
        if (existingEdition) {
            throw new Error(`An edition with the name ${editionData.name} already exists.`);
        }
        const newEdition = await Edition_1.Edition.create({
            ...editionData,
            createdBy,
            status: Edition_1.EditionStatus.DRAFT, // Always default to DRAFT initially
        });
        return newEdition;
    }
    async getAllEditions() {
        // Get all editions
        const editions = await Edition_1.Edition.find().sort({ createdAt: -1 }).lean();
        // For each edition, aggregate submission metrics to show on the card
        const editionsWithStats = await Promise.all(editions.map(async (edition) => {
            const stats = await Submission_1.Submission.aggregate([
                { $match: { editionId: edition._id } },
                {
                    $group: {
                        _id: null,
                        totalSubmissions: { $sum: 1 },
                        pending: { $sum: { $cond: [{ $eq: ['$status', Submission_1.SubmissionStatus.UNDER_REVIEW] }, 1, 0] } },
                        approved: { $sum: { $cond: [{ $eq: ['$status', Submission_1.SubmissionStatus.APPROVED] }, 1, 0] } },
                        rejected: { $sum: { $cond: [{ $eq: ['$status', Submission_1.SubmissionStatus.REJECTED] }, 1, 0] } },
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
    async togglePublishStatus(editionId) {
        console.log("togglePublishStatus received ID:", editionId, "typeof:", typeof editionId);
        // Sometimes whitespace can sneak in
        const cleanId = editionId.trim();
        const edition = await Edition_1.Edition.findById(cleanId);
        console.log("FindById result:", edition ? "Found" : "Null");
        if (!edition) {
            throw new Error(`Edition not found for id: ${cleanId}`);
        }
        // Toggle between DRAFT and PUBLISHED
        edition.status = edition.status === Edition_1.EditionStatus.PUBLISHED ? Edition_1.EditionStatus.DRAFT : Edition_1.EditionStatus.PUBLISHED;
        // Only set publishedAt if it's being published and doesn't already have one
        if (edition.status === Edition_1.EditionStatus.PUBLISHED && !edition.publishedAt) {
            edition.publishedAt = new Date();
        }
        await edition.save();
        return edition;
    }
    async getPublicEditions() {
        // Standard users should only see published editions
        const editions = await Edition_1.Edition.find({ status: Edition_1.EditionStatus.PUBLISHED })
            .sort({ publishedAt: -1 })
            .lean();
        return editions;
    }
    async getEditionById(editionId) {
        const cleanId = editionId.trim();
        const edition = await Edition_1.Edition.findById(cleanId).lean();
        if (!edition) {
            throw new Error(`Edition not found for id: ${cleanId}`);
        }
        return edition;
    }
    async deleteEdition(editionId) {
        const cleanId = editionId.trim();
        const edition = await Edition_1.Edition.findByIdAndDelete(cleanId);
        if (!edition) {
            throw new Error(`Edition not found for id: ${cleanId}`);
        }
        // Also delete any submissions tied to this edition
        await Submission_1.Submission.deleteMany({ editionId: cleanId });
        return { success: true, message: 'Edition deleted successfully' };
    }
}
exports.EditionService = EditionService;
