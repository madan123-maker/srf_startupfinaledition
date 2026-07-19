import { Submission, SubmissionStatus } from '../models/Submission';
import { Edition } from '../models/Edition';

export class DashboardService {
  async getMetrics(editionId?: string) {
    let matchStage: any = {};
    if (editionId) {
      matchStage.editionId = editionId;
    }

    // Parallel aggregations for performance
    const [
      totalApplications,
      draftApplications,
      submittedApplications,
      pendingReviewApplications,
      approvedApplications,
      rejectedApplications
    ] = await Promise.all([
      Submission.countDocuments(matchStage),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.DRAFT }),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.SUBMITTED }),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.UNDER_REVIEW }),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.APPROVED }),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.REJECTED }),
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
