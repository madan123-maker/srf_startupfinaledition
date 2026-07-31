import { Submission, SubmissionStatus } from '../models/Submission';
import mongoose from 'mongoose';

export class DashboardService {
  async getMetrics(editionId?: string) {
    let matchStage: any = {};
    if (editionId && editionId !== 'all' && mongoose.Types.ObjectId.isValid(editionId)) {
      matchStage.editionId = new mongoose.Types.ObjectId(editionId);
    }

    // Fetch all submissions matching matchStage with populated userId
    const rawSubmissions = await Submission.find(matchStage).populate('userId', '_id name email').lean();
    
    // Filter out orphaned submissions from deleted users
    const validSubmissions = rawSubmissions.filter((sub: any) => sub.userId != null);

    const totalApplications = validSubmissions.length;
    const draftApplications = validSubmissions.filter((s: any) => s.status === SubmissionStatus.DRAFT).length;
    const submittedApplications = validSubmissions.filter((s: any) => s.status === SubmissionStatus.SUBMITTED).length;
    const underReviewApplications = validSubmissions.filter((s: any) => s.status === SubmissionStatus.UNDER_REVIEW).length;
    const approvedApplications = validSubmissions.filter((s: any) => s.status === SubmissionStatus.APPROVED).length;
    const rejectedApplications = validSubmissions.filter((s: any) => s.status === SubmissionStatus.REJECTED).length;
    const submissionsList = validSubmissions;

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

