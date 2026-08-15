import { SubmissionStatus } from '../models/Submission';

export interface EffectiveStatusResult {
  hasResubmission: boolean;
  hasApprovedFields: boolean;
  effectiveStatus: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
}

/**
 * Centralized business logic helper to classify a submission's effective status
 * consistently across edition services, dashboard metrics, and report exports.
 */
export function computeSubmissionEffectiveStatus(s: any): EffectiveStatusResult {
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
  const isApproved = !isPending && (s.status === SubmissionStatus.APPROVED || s.status === 'APPROVED' || hasApprovedFields);
  const isRejected = !isPending && !isApproved && (s.status === SubmissionStatus.REJECTED || s.status === 'REJECTED');

  let effectiveStatus: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' = 'UNDER_REVIEW';

  if (s.status === SubmissionStatus.DRAFT || s.status === 'DRAFT') {
    effectiveStatus = 'DRAFT';
  } else if (isPending) {
    effectiveStatus = 'PENDING';
  } else if (isApproved) {
    effectiveStatus = 'APPROVED';
  } else if (isRejected) {
    effectiveStatus = 'REJECTED';
  } else {
    effectiveStatus = 'UNDER_REVIEW';
  }

  return {
    hasResubmission,
    hasApprovedFields,
    effectiveStatus,
  };
}
