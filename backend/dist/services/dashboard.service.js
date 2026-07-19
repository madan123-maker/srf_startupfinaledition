"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const Submission_1 = require("../models/Submission");
class DashboardService {
    async getMetrics(editionId) {
        let matchStage = {};
        if (editionId) {
            matchStage.editionId = editionId;
        }
        // Parallel aggregations for performance
        const [totalApplications, draftApplications, submittedApplications, pendingReviewApplications, approvedApplications, rejectedApplications] = await Promise.all([
            Submission_1.Submission.countDocuments(matchStage),
            Submission_1.Submission.countDocuments({ ...matchStage, status: Submission_1.SubmissionStatus.DRAFT }),
            Submission_1.Submission.countDocuments({ ...matchStage, status: Submission_1.SubmissionStatus.SUBMITTED }),
            Submission_1.Submission.countDocuments({ ...matchStage, status: Submission_1.SubmissionStatus.UNDER_REVIEW }),
            Submission_1.Submission.countDocuments({ ...matchStage, status: Submission_1.SubmissionStatus.APPROVED }),
            Submission_1.Submission.countDocuments({ ...matchStage, status: Submission_1.SubmissionStatus.REJECTED }),
        ]);
        // Total Submissions means anything not in DRAFT status
        const totalSubmissions = totalApplications - draftApplications;
        // Optional: District Compliance Progress - since we don't have a districts model yet, 
        // we'll return dummy compliance data for the charts as requested by the dashboard structure.
        const districtCompliance = [
            { name: 'Bengaluru', progress: 85 },
            { name: 'Mysuru', progress: 60 },
            { name: 'Hubballi', progress: 45 },
            { name: 'Mangaluru', progress: 70 },
            { name: 'Belagavi', progress: 30 },
        ];
        return {
            executiveCommand: {
                totalSubmissions,
                pendingFinalReview: pendingReviewApplications,
                approvedFinal: approvedApplications,
                rejected: rejectedApplications,
            },
            validationMetrics: {
                totalApplications,
                draftApplications,
                submittedApplications,
                approvedApplications,
                rejectedApplications,
            },
            districtCompliance
        };
    }
}
exports.DashboardService = DashboardService;
