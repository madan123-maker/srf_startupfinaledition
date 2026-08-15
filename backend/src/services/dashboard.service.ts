import { Submission, SubmissionStatus } from '../models/Submission';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { computeSubmissionEffectiveStatus } from '../utils/submissionUtils';

export class DashboardService {
  async getMetrics(editionId?: string) {
    // Ensure User model is loaded for populate
    void User;
    let matchStage: any = {};
    if (editionId && editionId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(editionId)) {
        matchStage.editionId = new mongoose.Types.ObjectId(editionId);
      } else {
        matchStage.editionId = editionId;
      }
    }

    // Fetch all submissions matching matchStage with populated userId
    const rawSubmissions = await Submission.find(matchStage)
      .populate('userId', '_id name email state district')
      .lean();
    
    // Filter out orphaned submissions from deleted users
    const validSubmissions = rawSubmissions.filter((sub: any) => sub.userId != null);

    // Non-draft submissions count towards official submitted applications
    const nonDraftSubmissions = validSubmissions.filter((s: any) => s.status !== SubmissionStatus.DRAFT);
    const draftApplications = validSubmissions.filter((s: any) => s.status === SubmissionStatus.DRAFT).length;

    let submittedApplications = 0; // Pending review applications
    let approvedApplications = 0;
    let rejectedApplications = 0;

    // Dynamic District-wise Compliance Progress based on real submissions data
    const districtMap: { [district: string]: { count: number; totalProgress: number } } = {};

    nonDraftSubmissions.forEach((s: any) => {
      const { effectiveStatus, hasResubmission, hasApprovedFields } = computeSubmissionEffectiveStatus(s);

      let totalFields = 0;
      let approvedFields = 0;

      if (Array.isArray(s.responses)) {
        s.responses.forEach((r: any) => {
          if (Array.isArray(r.fieldResponses)) {
            r.fieldResponses.forEach((f: any) => {
              totalFields++;
              if (f.evaluationStatus === 'APPROVED') approvedFields++;
            });
          }
          if (Array.isArray(r.additionalFiles)) {
            r.additionalFiles.forEach((f: any) => {
              totalFields++;
              if (f.evaluationStatus === 'APPROVED') approvedFields++;
            });
          }
          if (Array.isArray(r.supportingDocumentResponses)) {
            r.supportingDocumentResponses.forEach((d: any) => {
              totalFields++;
              if (d.evaluationStatus === 'APPROVED') approvedFields++;
              if (Array.isArray(d.files)) {
                d.files.forEach((f: any) => {
                  totalFields++;
                  if (f.evaluationStatus === 'APPROVED') approvedFields++;
                });
              }
            });
          }
        });
      }

      // Count metrics based strictly on central effective status logic
      if (effectiveStatus === 'APPROVED') {
        approvedApplications++;
      } else if (effectiveStatus === 'REJECTED') {
        rejectedApplications++;
      } else {
        submittedApplications++;
      }

      // Calculate progress for THIS specific submission based on its lifecycle
      let submissionProgress = 0;
      if (effectiveStatus === 'APPROVED') {
        submissionProgress = 100;
      } else if (effectiveStatus === 'REJECTED') {
        submissionProgress = 0;
      } else {
        if (hasResubmission) {
          submissionProgress = 35;
        } else if (totalFields > 0 && approvedFields > 0) {
          submissionProgress = Math.min(95, Math.max(50, Math.round((approvedFields / totalFields) * 100)));
        } else {
          submissionProgress = 75;
        }
      }

      // Resolve District Name dynamically
      const userObj = s.userId as any;
      const districtName = (s as any).districtName
        || (userObj?.district && userObj.district.trim() !== '' ? userObj.district.trim() : '')
        || (s.stateName && s.stateName !== 'Unassigned' ? s.stateName : '')
        || (userObj?.state && userObj.state.trim() !== '' ? userObj.state.trim() : '')
        || 'General';

      if (!districtMap[districtName]) {
        districtMap[districtName] = { count: 0, totalProgress: 0 };
      }
      districtMap[districtName].count += 1;
      districtMap[districtName].totalProgress += submissionProgress;
    });

    const totalApplications = nonDraftSubmissions.length;

    const districtCompliance = Object.keys(districtMap).map((district) => ({
      name: district,
      progress: Math.round(districtMap[district].totalProgress / districtMap[district].count)
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
