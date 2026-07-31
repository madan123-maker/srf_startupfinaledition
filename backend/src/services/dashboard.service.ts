import { Submission, SubmissionStatus } from '../models/Submission';
import mongoose from 'mongoose';

export class DashboardService {
  async getMetrics(editionId?: string) {
    let matchStage: any = {};
    if (editionId && editionId !== 'all' && mongoose.Types.ObjectId.isValid(editionId)) {
      matchStage.editionId = new mongoose.Types.ObjectId(editionId);
    }

    // Parallel aggregations for counts
    const [
      totalApplications,
      draftApplications,
      submittedApplications,
      underReviewApplications,
      approvedApplications,
      rejectedApplications,
      submissionsList
    ] = await Promise.all([
      Submission.countDocuments(matchStage),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.DRAFT }),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.SUBMITTED }),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.UNDER_REVIEW }),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.APPROVED }),
      Submission.countDocuments({ ...matchStage, status: SubmissionStatus.REJECTED }),
      Submission.find(matchStage).select('stateName status responses').lean()
    ]);

    // Total Submitted & Pending Review = SUBMITTED + UNDER_REVIEW
    const totalSubmittedAndPending = submittedApplications + underReviewApplications;

    // Dynamic State / District Compliance Progress based on real submissions data
    const stateMap: { [state: string]: { count: number; totalProgress: number } } = {};

    submissionsList.forEach((sub: any) => {
      const stateName = sub.stateName || 'Unassigned';
      
      let progress = 25; // Default draft progress
      if (sub.status === SubmissionStatus.APPROVED) {
        progress = 100;
      } else if (sub.status === SubmissionStatus.UNDER_REVIEW) {
        progress = 80;
      } else if (sub.status === SubmissionStatus.SUBMITTED) {
        progress = 60;
      } else if (sub.status === SubmissionStatus.REJECTED) {
        progress = 15;
      } else if (sub.status === SubmissionStatus.DRAFT) {
        let completedFields = 0;
        if (Array.isArray(sub.responses)) {
          sub.responses.forEach((r: any) => {
            if (Array.isArray(r.fieldResponses)) {
              completedFields += r.fieldResponses.length;
            }
          });
        }
        progress = completedFields > 0 ? Math.min(50, 20 + completedFields * 5) : 25;
      }

      if (!stateMap[stateName]) {
        stateMap[stateName] = { count: 0, totalProgress: 0 };
      }
      stateMap[stateName].count += 1;
      stateMap[stateName].totalProgress += progress;
    });

    const districtCompliance = Object.keys(stateMap).map((state) => ({
      name: state,
      progress: Math.round(stateMap[state].totalProgress / stateMap[state].count)
    }));

    return {
      executiveCommand: {
        totalSubmissions: totalApplications - draftApplications,
        pendingFinalReview: totalSubmittedAndPending,
        approvedFinal: approvedApplications,
        rejected: rejectedApplications,
      },
      validationMetrics: {
        totalApplications,
        draftApplications,
        submittedApplications: totalSubmittedAndPending,
        approvedApplications,
        rejectedApplications,
      },
      districtCompliance
    };
  }
}

