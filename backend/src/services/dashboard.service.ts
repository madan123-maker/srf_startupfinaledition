import { Submission, SubmissionStatus } from '../models/Submission';
import mongoose from 'mongoose';

export class DashboardService {
  async getMetrics(editionId?: string) {
    let matchStage: any = {};
    if (editionId && editionId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(editionId)) {
        matchStage.editionId = new mongoose.Types.ObjectId(editionId);
      } else {
        matchStage.editionId = editionId;
      }
    }

    // Fetch all submissions matching matchStage with populated userId
    const rawSubmissions = await Submission.find(matchStage).populate('userId', '_id name email').lean();
    
    // Filter out orphaned submissions from deleted users
    const validSubmissions = rawSubmissions.filter((sub: any) => sub.userId != null);

    // Non-draft submissions count towards official submitted applications
    const nonDraftSubmissions = validSubmissions.filter((s: any) => s.status !== SubmissionStatus.DRAFT);
    const draftApplications = validSubmissions.filter((s: any) => s.status === SubmissionStatus.DRAFT).length;

    let submittedApplications = 0; // Pending review applications
    let approvedApplications = 0;
    let rejectedApplications = 0;

    nonDraftSubmissions.forEach((s: any) => {
      let hasResubmission = false;
      let hasApprovedFields = false;

      if (Array.isArray(s.responses)) {
        s.responses.forEach((r: any) => {
          if (Array.isArray(r.fieldResponses)) {
            r.fieldResponses.forEach((f: any) => {
              if (f.evaluationStatus === 'RESUBMISSION_REQUIRED') hasResubmission = true;
              if (f.evaluationStatus === 'APPROVED') hasApprovedFields = true;
            });
          }
          if (Array.isArray(r.additionalFiles)) {
            r.additionalFiles.forEach((f: any) => {
              if (f.evaluationStatus === 'RESUBMISSION_REQUIRED') hasResubmission = true;
              if (f.evaluationStatus === 'APPROVED') hasApprovedFields = true;
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
        submittedApplications++;
      } else if (isApproved) {
        approvedApplications++;
      } else if (isRejected) {
        rejectedApplications++;
      } else {
        submittedApplications++;
      }
    });

    const totalApplications = nonDraftSubmissions.length;
    const submissionsList = nonDraftSubmissions;

    // Dynamic State / District Compliance Progress based on real submissions data
    const stateMap: { [state: string]: { count: number; totalProgress: number } } = {};

    submissionsList.forEach((sub: any) => {
      const stateName = sub.stateName || 'Unassigned';
      
      let progress = 60; // Default submitted progress
      if (sub.status === SubmissionStatus.APPROVED || approvedApplications > 0) {
        progress = 100;
      } else if (sub.status === SubmissionStatus.UNDER_REVIEW) {
        progress = 80;
      } else if (sub.status === SubmissionStatus.REJECTED) {
        progress = 15;
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
        totalSubmissions: totalApplications,
        pendingFinalReview: submittedApplications,
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

