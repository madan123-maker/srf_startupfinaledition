import { Request, Response } from 'express';
import { Submission, SubmissionStatus } from '../models/Submission';
import { User } from '../models/User';
import { Assignment } from '../models/Assignment';
import { Evaluation } from '../models/Evaluation';
import { FormSchemaModel } from '../models/FormSchema';
import { EvaluationService } from '../services/EvaluationService';
import { Notification } from '../models/Notification';
import { RecycleBin, EntityType } from '../models/RecycleBin';
import { Edition, EditionStatus } from '../models/Edition';

export const buildConsolidatedSubmission = async (editionId: string) => {
  const schema = await FormSchemaModel.findOne({ editionId });
  const submissions = await Submission.find({ editionId }).populate('userId', 'name email state');
  const assignments = await Assignment.find({ editionId }).populate('userId', 'name email state');
  const subIds = submissions.map((s) => s._id);
  const evaluations = await Evaluation.find({ submissionId: { $in: subIds } });

  const consolidatedResponses: any[] = [];
  const reformAreaWinners: Record<string, { user: any; score: number; maxScore: number }> = {};
  let grandTotalScore = 0;

  if (schema && schema.areas && schema.areas.length > 0) {
    for (const area of schema.areas) {
      const areaQuestionIds: string[] = [];
      area.actionPoints.forEach((ap) => {
        ap.questions.forEach((q) => areaQuestionIds.push(q.id));
      });

      const userScores: Record<string, { user: any; totalScore: number; responsesMap: Map<string, any> }> = {};

      // Process assignments for this area
      const areaAssignments = assignments.filter(
        (a) => (a.reformAreaId === area.id || a.scope === 'EDITION' || a.scope === 'REFORM_AREA') && a.status === 'EVALUATED'
      );

      areaAssignments.forEach((a) => {
        const uObj: any = a.userId;
        const uId = uObj?._id?.toString() || uObj?.toString();
        if (!uId) return;
        if (!userScores[uId]) {
          userScores[uId] = { user: uObj, totalScore: 0, responsesMap: new Map() };
        }
        userScores[uId].totalScore = Math.max(userScores[uId].totalScore, a.awardedScore || 0);
      });

      // Process submission responses for questions in this area
      submissions.forEach((sub) => {
        const uObj: any = sub.userId;
        const uId = uObj?._id?.toString() || uObj?.toString();
        if (!uId) return;
        if (!userScores[uId]) {
          userScores[uId] = { user: uObj, totalScore: 0, responsesMap: new Map() };
        }

        const userEval = evaluations.find((ev) => ev.submissionId.toString() === sub._id.toString());
        let areaScoreFromSub = 0;

        areaQuestionIds.forEach((qId) => {
          const qResp = sub.responses.find((r) => r.questionId === qId);
          const evalAns = userEval?.answers.find((ans) => ans.questionId === qId);
          let qScore = 0;

          const isExplicitlyApproved = qResp?.fieldResponses?.some((f: any) => f.evaluationStatus === 'APPROVED') ||
            qResp?.additionalFiles?.some((f: any) => f.evaluationStatus === 'APPROVED') ||
            qResp?.supportingDocumentResponses?.some((d: any) => d.files?.some((f: any) => f.evaluationStatus === 'APPROVED'));

          if (evalAns && evalAns.awardedScore !== null && evalAns.awardedScore !== undefined && evalAns.awardedScore > 0) {
            qScore = evalAns.awardedScore;
          } else if (isExplicitlyApproved && qResp && qResp.score !== undefined && qResp.score !== null && qResp.score > 0) {
            qScore = qResp.score;
          } else if (isExplicitlyApproved) {
            const qDef = area.actionPoints.flatMap((ap) => ap.questions).find((q) => q.id === qId);
            qScore = qDef?.maxScore || qDef?.weightage || 1;
          }

          areaScoreFromSub += qScore;

          if (qResp) {
            if (!userScores[uId].responsesMap.has(qId)) {
              userScores[uId].responsesMap.set(qId, qResp);
            }
          }
        });

        if (areaScoreFromSub > userScores[uId].totalScore) {
          userScores[uId].totalScore = areaScoreFromSub;
        }
      });

      const candidates = Object.values(userScores);
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.totalScore - a.totalScore);
        const winner = candidates[0];
        
        const areaMax = area.actionPoints.reduce(
          (acc, ap) => acc + ap.questions.reduce((qAcc, q) => qAcc + (q.maxScore || q.weightage || 0), 0),
          0
        );

        reformAreaWinners[area.id] = {
          user: winner.user,
          score: winner.totalScore,
          maxScore: areaMax,
        };

        grandTotalScore += winner.totalScore;

        areaQuestionIds.forEach((qId) => {
          let qResp = winner.responsesMap.get(qId);
          if (!qResp) {
            const winnerId = (winner.user as any)?._id?.toString() || (winner.user as any)?.toString();
            const winnerSub = submissions.find((s) => {
              const sUId = (s.userId as any)?._id?.toString() || s.userId?.toString();
              return sUId === winnerId;
            });
            qResp = winnerSub?.responses?.find((r) => r.questionId === qId);
          }
          if (!qResp) {
            qResp = submissions.flatMap((s) => s.responses || []).find(
              (r) =>
                r.questionId === qId &&
                ((r.fieldResponses && r.fieldResponses.length > 0) ||
                  (r.supportingDocumentResponses && r.supportingDocumentResponses.length > 0) ||
                  (r.additionalFiles && r.additionalFiles.length > 0))
            );
          }

          const qDef = area.actionPoints.flatMap((ap) => ap.questions).find((q) => q.id === qId);
          const qMaxScore = qDef?.maxScore || qDef?.weightage || 1;

          const respObj = qResp
            ? { ...JSON.parse(JSON.stringify(qResp)) }
            : { questionId: qId, score: 0, fieldResponses: [] };

          const isExplicitlyApproved = respObj.fieldResponses?.some((f: any) => f.evaluationStatus === 'APPROVED') ||
            respObj.additionalFiles?.some((f: any) => f.evaluationStatus === 'APPROVED') ||
            respObj.supportingDocumentResponses?.some((d: any) => d.files?.some((f: any) => f.evaluationStatus === 'APPROVED'));

          if (isExplicitlyApproved && (!respObj.score || respObj.score === 0)) {
            respObj.score = qMaxScore;
          } else if (!isExplicitlyApproved) {
            respObj.score = 0;
          }

          respObj.topUser = winner.user;
          respObj.reformAreaId = area.id;
          respObj.reformAreaTitle = area.title;

          if (!consolidatedResponses.some((cr) => cr.questionId === qId)) {
            consolidatedResponses.push(respObj);
          }
        });
      }
    }
  }

  const firstSub = submissions[0];

  return {
    _id: `consolidated-${editionId}`,
    isConsolidated: true,
    editionId,
    stateName: 'Consolidated State',
    status: 'APPROVED',
    totalScore: grandTotalScore,
    responses: consolidatedResponses,
    reformAreaWinners,
    userId: { name: 'Consolidated SRF Edition', email: 'consolidated@srf.gov' },
    createdAt: firstSub ? firstSub.createdAt : new Date(),
  };
};

export const getConsolidatedEditionSubmission = async (req: Request, res: Response) => {
  try {
    const { editionId } = req.params;
    const result = await buildConsolidatedSubmission(editionId);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error fetching consolidated submission:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch consolidated submission' });
  }
};

export const getSubmissionsByEdition = async (req: Request, res: Response) => {
  try {
    const { editionId } = req.params;

    // Submissions query matching either non-draft status or any submitted/approved question response
    const submissionFilter = {
      editionId,
      $or: [
        { status: { $ne: SubmissionStatus.DRAFT } },
        { "responses.fieldResponses.status": "SUBMITTED" },
        { "responses.fieldResponses.evaluationStatus": "APPROVED" },
        { "responses.additionalFiles.status": "SUBMITTED" },
        { "responses.additionalFiles.evaluationStatus": "APPROVED" },
        { "responses.supportingDocumentResponses.files.status": "SUBMITTED" },
        { "responses.supportingDocumentResponses.files.evaluationStatus": "APPROVED" }
      ]
    };

    const submissions = await Submission.find(submissionFilter)
      .populate('userId', 'name email state')
      .sort({ createdAt: -1 });

    const validSubmissions = await Promise.all(
      submissions
        .filter((s: any) => s.userId != null)
        .map(async (s: any) => {
          const subObj = s.toObject ? s.toObject() : s;
          if (subObj.status === 'DRAFT') {
            subObj.status = 'UNDER_REVIEW';
          }

          // Calculate evaluated score from Evaluation documents
          const evaluations = await Evaluation.find({ submissionId: subObj._id }).lean();
          let evalScore = 0;
          if (evaluations && evaluations.length > 0) {
            evaluations.forEach((ev: any) => {
              if (Array.isArray(ev.answers)) {
                ev.answers.forEach((ans: any) => {
                  if (typeof ans.awardedScore === 'number') {
                    evalScore += ans.awardedScore;
                  }
                });
              }
            });
          }

          // Fallback score calculation from embedded response objects
          let respScore = 0;
          if (Array.isArray(subObj.responses)) {
            subObj.responses.forEach((r: any) => {
              if (r.score) respScore += r.score;
              if (Array.isArray(r.fieldResponses)) {
                r.fieldResponses.forEach((f: any) => {
                  if (f.score) respScore += f.score;
                });
              }
              if (Array.isArray(r.additionalFiles)) {
                r.additionalFiles.forEach((f: any) => {
                  if (f.score) respScore += f.score;
                });
              }
              if (Array.isArray(r.supportingDocumentResponses)) {
                r.supportingDocumentResponses.forEach((d: any) => {
                  if (Array.isArray(d.files)) {
                    d.files.forEach((f: any) => {
                      if (f.score) respScore += f.score;
                    });
                  }
                });
              }
            });
          }

          const calculatedTotalScore = Math.max(subObj.totalScore || 0, evalScore, respScore);
          subObj.totalScore = calculatedTotalScore;

          // If dynamically calculated total score differs, update database
          if (calculatedTotalScore !== s.totalScore) {
            await Submission.findByIdAndUpdate(subObj._id, { $set: { totalScore: calculatedTotalScore } });
          }

          return subObj;
        })
    );

    if (validSubmissions.length > 0) {
      return res.status(200).json(validSubmissions);
    }

    // Fallback: If no individual user submissions, return Consolidated SRF Edition summary if available
    const consolidated = await buildConsolidatedSubmission(editionId);
    if (consolidated && consolidated.responses && consolidated.responses.length > 0) {
      return res.status(200).json([consolidated]);
    }

    return res.status(200).json([]);
  } catch (error: any) {
    console.error('Error fetching submissions by edition:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
};

export const getSubmissionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id.startsWith('consolidated-')) {
      const editionId = id.replace('consolidated-', '');
      const result = await buildConsolidatedSubmission(editionId);
      return res.status(200).json(result);
    }
    const submission = await Submission.findById(id).populate('userId', 'name email');
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    return res.status(200).json(submission);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch submission' });
  }
};

export const getMySubmission = async (req: any, res: Response) => {
  try {
    const { editionId } = req.params;
    const userId = req.user.id;

    let submission = await Submission.findOne({ editionId, userId });

    if (!submission) {
      const user = await User.findById(userId);
      const stateName = user?.state || 'Unknown State';

      submission = await Submission.create({
        editionId,
        userId,
        stateName,
        status: SubmissionStatus.DRAFT,
        responses: [],
        totalScore: 0
      });
    }

    return res.status(200).json(submission);
  } catch (error: any) {
    console.error('Error fetching my submission:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch your submission' });
  }
};

export const updateMySubmission = async (req: any, res: Response) => {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const { id } = req.params;
      const { responses, status } = req.body;

      const submission = await Submission.findById(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Check if any field requires resubmission or is rejected
      const hasResubmission = submission.responses.some(q =>
        q.fieldResponses.some((f: any) => f.evaluationStatus === 'RESUBMISSION_REQUIRED' || f.evaluationStatus === 'REJECTED') ||
        q.additionalFiles?.some((f: any) => f.evaluationStatus === 'RESUBMISSION_REQUIRED' || f.evaluationStatus === 'REJECTED') ||
        q.supportingDocumentResponses?.some((d: any) => d.files.some((f: any) => f.evaluationStatus === 'RESUBMISSION_REQUIRED' || f.evaluationStatus === 'REJECTED'))
      );

      // Allow edit if submission is DRAFT, UNDER_REVIEW, REJECTED, has resubmission, or contains newly added/unsubmitted question responses
      const canEdit = submission.status === SubmissionStatus.DRAFT ||
        submission.status === SubmissionStatus.UNDER_REVIEW ||
        submission.status === SubmissionStatus.REJECTED ||
        hasResubmission ||
        responses?.some((newQ: any) => {
          const oldQ = submission.responses.find(r => String(r.questionId) === String(newQ.questionId));
          if (!oldQ) return true; // Newly added question response for newly assigned task
          return newQ.fieldResponses?.some((f: any) => f.status !== 'SUBMITTED' || f.evaluationStatus === 'RESUBMISSION_REQUIRED' || f.evaluationStatus === 'REJECTED') ||
            newQ.supportingDocumentResponses?.some((d: any) => d.files?.some((f: any) => f.status !== 'SUBMITTED' || f.evaluationStatus === 'RESUBMISSION_REQUIRED' || f.evaluationStatus === 'REJECTED'));
        });

      if (!canEdit && submission.status === SubmissionStatus.APPROVED) {
        return res.status(400).json({ error: 'Cannot edit a fully approved application unless resubmission is required' });
      }

      if (responses) {
        // Merge logic to handle file rejection history
        for (const newQ of responses) {
          const oldQ = submission.responses.find(r => String(r.questionId) === String(newQ.questionId));
          if (oldQ) {
            for (const newF of newQ.fieldResponses) {
              const oldF = oldQ.fieldResponses.find((f: any) => f.fieldId === newF.fieldId);
              if (oldF) {
                // Preserve history
                newF.history = oldF.history || [];

                // If frontend is uploading a new file after rejection or resubmission request:
                if ((oldF.evaluationStatus === 'REJECTED' || oldF.evaluationStatus === 'RESUBMISSION_REQUIRED') && newF.fileUrl && newF.fileUrl !== oldF.fileUrl) {
                  newF.history.push({
                    fileUrl: oldF.fileUrl,
                    fileName: oldF.fileName || 'Unknown',
                    evaluationStatus: oldF.evaluationStatus,
                    evaluationRemarks: oldF.evaluationRemarks,
                    submittedAt: new Date()
                  });
                  newF.evaluationStatus = 'PENDING';
                  newF.evaluationRemarks = '';
                } else if (newF.evaluationStatus === undefined) {
                  // Preserve existing evaluation status if not explicitly sent
                  newF.evaluationStatus = oldF.evaluationStatus;
                  newF.evaluationRemarks = oldF.evaluationRemarks;
                }
              }
            }

            if (newQ.additionalFiles) {
              for (const newAF of newQ.additionalFiles) {
                const oldAF = oldQ.additionalFiles?.find((af: any) => af.fileId === newAF.fileId);
                if (oldAF) {
                  newAF.history = oldAF.history || [];
                  if ((oldAF.evaluationStatus === 'REJECTED' || oldAF.evaluationStatus === 'RESUBMISSION_REQUIRED') && newAF.fileUrl && newAF.fileUrl !== oldAF.fileUrl) {
                    newAF.history.push({
                      fileUrl: oldAF.fileUrl,
                      fileName: oldAF.fileName || 'Unknown',
                      evaluationStatus: oldAF.evaluationStatus,
                      evaluationRemarks: oldAF.evaluationRemarks,
                      submittedAt: new Date()
                    });
                    newAF.evaluationStatus = 'PENDING';
                    newAF.evaluationRemarks = '';
                  } else if (newAF.evaluationStatus === undefined) {
                    newAF.evaluationStatus = oldAF.evaluationStatus;
                    newAF.evaluationRemarks = oldAF.evaluationRemarks;
                  }
                }
              }
            }

            if (newQ.supportingDocumentResponses) {
              for (const newDoc of newQ.supportingDocumentResponses) {
                const oldDoc = oldQ.supportingDocumentResponses?.find((doc: any) => doc.documentId === newDoc.documentId);
                if (oldDoc) {
                  for (const newFile of newDoc.files) {
                    const oldFile = oldDoc.files.find((f: any) => f.fileId === newFile.fileId);
                    if (oldFile) {
                      newFile.history = oldFile.history || [];
                      if ((oldFile.evaluationStatus === 'REJECTED' || oldFile.evaluationStatus === 'RESUBMISSION_REQUIRED') && newFile.fileUrl && newFile.fileUrl !== oldFile.fileUrl) {
                        newFile.history.push({
                          fileUrl: oldFile.fileUrl,
                          fileName: oldFile.fileName || 'Unknown',
                          evaluationStatus: oldFile.evaluationStatus,
                          evaluationRemarks: oldFile.evaluationRemarks,
                          submittedAt: new Date()
                        });
                        newFile.evaluationStatus = 'PENDING';
                        newFile.evaluationRemarks = '';
                      } else if (newFile.evaluationStatus === undefined) {
                        newFile.evaluationStatus = oldFile.evaluationStatus;
                        newFile.evaluationRemarks = oldFile.evaluationRemarks;
                      }
                    }
                  }
                }
              }
            }
          }
        }
        submission.responses = responses;
      }
      if (status) submission.status = status;

      await submission.save();

      if (status === 'UNDER_REVIEW' || status === 'SUBMITTED' || submission.status === 'UNDER_REVIEW' || submission.status === 'SUBMITTED') {
        await Assignment.updateMany(
          { userId: submission.userId, editionId: submission.editionId, status: { $ne: 'EVALUATED' } },
          { status: 'SUBMITTED' }
        );
      }

      return res.status(200).json(submission);
    } catch (error: any) {
      const isVersionError = error.name === 'VersionError' || error.message?.includes('VersionError') || error.kind === 'VersionError';
      if (isVersionError && attempt < maxRetries - 1) {
        attempt++;
        console.warn(`VersionError updating submission ${req.params.id}, retrying attempt ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 50 * attempt));
        continue;
      }
      console.error('Error updating submission:', error);
      return res.status(500).json({ error: error.message || 'Failed to update submission' });
    }
  }
};

import { StoredFile } from '../models/StoredFile';
import { StorageService } from '../services/storage/StorageService';
import { STORAGE_FOLDERS } from '../constants/storage.constants';

export const uploadSubmissionFile = async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const applicationId = req.body?.applicationId || req.query?.applicationId;
    const questionId = req.body?.questionId || req.query?.questionId;
    const documentId = req.body?.documentId || req.query?.documentId;

    const r2Result = await StorageService.upload(req.file, {
      folder: STORAGE_FOLDERS.APPLICATIONS,
      applicationId,
      questionId,
      documentId,
      uploadedBy: req.user?.id,
    });

    const storedFile = await StoredFile.findOne({ key: r2Result.key });

    return res.status(200).json({
      fileUrl: r2Result.url,
      fileName: r2Result.originalName,
      fileId: storedFile?._id || r2Result.key,
      storage: 'r2',
    });
  } catch (error: any) {
    console.error('Error uploading file to Cloudflare R2:', error);
    return res.status(500).json({ error: error.message || 'File upload failed' });
  }
};

export const evaluateDocument = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    if (id.startsWith('consolidated-')) {
      return res.status(400).json({ error: 'Cannot evaluate documents on a consolidated submission' });
    }
    const { questionId, fieldId, documentId, status, remarks, isAdditionalFile, isSupportingDocument } = req.body;

    let updateFields: any = {};
    let arrayFilters: any[] = [{ 'q.questionId': questionId }];

    if (isSupportingDocument) {
      updateFields = {
        'responses.$[q].supportingDocumentResponses.$[d].files.$[f].evaluationStatus': status,
        'responses.$[q].supportingDocumentResponses.$[d].files.$[f].evaluationRemarks': remarks,
      };
      arrayFilters.push({ 'd.documentId': documentId });
      arrayFilters.push({ 'f.fileId': fieldId }); // Here fieldId is used as fileId for the specific file
    } else if (isAdditionalFile) {
      updateFields = {
        'responses.$[q].additionalFiles.$[f].evaluationStatus': status,
        'responses.$[q].additionalFiles.$[f].evaluationRemarks': remarks,
      };
      arrayFilters.push({ 'f.fileId': fieldId });
    } else {
      updateFields = {
        'responses.$[q].fieldResponses.$[f].evaluationStatus': status,
        'responses.$[q].fieldResponses.$[f].evaluationRemarks': remarks,
      };
      arrayFilters.push({ 'f.fieldId': fieldId });
    }

    const updated = await Submission.findByIdAndUpdate(
      id,
      { $set: updateFields },
      {
        arrayFilters,
        new: true,
        runValidators: false,
      }
    ).populate('userId', 'name email');

    if (!updated) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (status === 'RESUBMISSION_REQUIRED') {
      try {
        await Notification.create({
          userId: updated.userId,
          message: `Admin has requested a document resubmission for Question ${questionId}. Remarks: ${remarks || 'None'}`,
          link: `/user-dashboard/workspace/${updated.editionId}`
        });
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }
    }

    // Auto-evaluate score based on document status
    try {
      const formSchema = await FormSchemaModel.findOne({ editionId: updated.editionId });
      if (formSchema) {
        let questionNode = null;
        for (const area of formSchema.areas) {
          for (const ap of area.actionPoints) {
            const q = ap.questions.find((q: any) => q.id === questionId);
            if (q) { questionNode = q; break; }
          }
          if (questionNode) break;
        }

        if (questionNode) {
          const response = updated.responses.find(r => r.questionId === questionId);
          if (response) {
            let scoreToAward = 0;

            // Auto-scoring logic based on supporting documents if they exist
            if (response.supportingDocumentResponses && response.supportingDocumentResponses.length > 0) {
              // Determine if all required documents are APPROVED
              // Note: since we don't have the exact mandatory schema here easily, we rely on checking if ANY file is REJECTED or if no files are APPROVED yet
              // For a simpler strict rule: if ANY file in supportingDocumentResponses is REJECTED, score is 0. Else if at least one is APPROVED, award full score.
              const hasRejectedSuppDoc = response.supportingDocumentResponses.some((docResp: any) =>
                docResp.files?.some((f: any) => f.evaluationStatus === 'REJECTED' || f.evaluationStatus === 'RESUBMISSION_REQUIRED')
              );
              const hasApprovedSuppDoc = response.supportingDocumentResponses.some((docResp: any) =>
                docResp.files?.some((f: any) => f.evaluationStatus === 'APPROVED')
              );

              if (hasRejectedSuppDoc) {
                scoreToAward = 0;
              } else if (hasApprovedSuppDoc) {
                scoreToAward = (questionNode.maxScore || questionNode.weightage || 0);
              }
            } else {
              // Fallback to legacy fields
              const hasApprovedField = response.fieldResponses?.some((f: any) => f.evaluationStatus === 'APPROVED');
              const hasApprovedAdditional = response.additionalFiles?.some((f: any) => f.evaluationStatus === 'APPROVED');
              scoreToAward = (hasApprovedField || hasApprovedAdditional) ? (questionNode.maxScore || questionNode.weightage || 0) : 0;
            }

            const evaluationService = new EvaluationService();
            await evaluationService.submitQuestionScore(id, req.user.id, questionId, scoreToAward, `Auto-scored from document evaluation (${status})`);

            // Refetch updated submission since evaluationService might have updated totalScore
            const finalUpdated = await Submission.findById(id).populate('userId', 'name email');
            return res.status(200).json(finalUpdated);
          }
        }
      }
    } catch (evalErr) {
      console.error('Error auto-generating score:', evalErr);
      // Continue anyway, don't fail the document evaluation
    }

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('Error evaluating document:', error);
    return res.status(500).json({ error: error.message || 'Document evaluation failed' });
  }
};

export const deleteSubmission = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const sub = await Submission.findById(id).populate('userId', 'name email state').lean();
    if (!sub) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const stateName = sub.stateName || (sub.userId as any)?.state || 'State';
    const userName = (sub.userId as any)?.name || (sub.userId as any)?.email || 'User';

    // 1. Save in RecycleBin
    await RecycleBin.create({
      originalId: sub._id.toString(),
      entityType: EntityType.APPLICATION,
      entityName: `Application (${stateName} - ${userName})`,
      data: sub,
      deletedBy: userId
    });

    // 2. Delete from Submissions collection
    await Submission.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Application moved to Recycle Bin successfully' });
  } catch (error: any) {
    console.error('Error deleting submission:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete application' });
  }
};
