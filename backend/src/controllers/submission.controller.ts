import { Request, Response } from 'express';
import { Submission, SubmissionStatus } from '../models/Submission';
import { User } from '../models/User';
import { Assignment } from '../models/Assignment';
import { Evaluation } from '../models/Evaluation';
import { FormSchemaModel } from '../models/FormSchema';
import { EvaluationService } from '../services/EvaluationService';
import { Notification } from '../models/Notification';

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
          if (evalAns && evalAns.awardedScore !== null && evalAns.awardedScore !== undefined && evalAns.awardedScore > 0) {
            qScore = evalAns.awardedScore;
          } else if (qResp && qResp.score !== undefined && qResp.score !== null && qResp.score > 0) {
            qScore = qResp.score;
          } else if (qResp && qResp.fieldResponses) {
            const hasYesOrApproved = qResp.fieldResponses.some((f: any) =>
              (typeof f.value === 'string' && (f.value.toLowerCase() === 'yes' || f.value.toLowerCase() === 'true')) ||
              f.evaluationStatus === 'APPROVED'
            );
            if (hasYesOrApproved) {
              const qDef = area.actionPoints.flatMap((ap) => ap.questions).find((q) => q.id === qId);
              qScore = qDef?.maxScore || qDef?.weightage || 1;
            }
          }

          areaScoreFromSub += qScore;

          if (qResp) {
            if ((!qResp.score || qResp.score === 0) && qScore > 0) {
              qResp.score = qScore;
            }
            userScores[uId].responsesMap.set(qId, qResp);
          }
        });

        userScores[uId].totalScore = Math.max(userScores[uId].totalScore, areaScoreFromSub);
      });

      const candidates = Object.values(userScores);
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.totalScore - a.totalScore);
        const winner = candidates[0];
        const winnerId = (winner.user as any)?._id?.toString() || (winner.user as any)?.toString();

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
            const winnerSub = submissions.find((s) => {
              const sUId = (s.userId as any)?._id?.toString() || s.userId?.toString();
              return sUId === winnerId;
            });
            qResp = winnerSub?.responses?.find((r) => r.questionId === qId);
          }
          if (!qResp) {
            for (const sub of submissions) {
              const r = sub.responses?.find((r) => r.questionId === qId);
              if (r) {
                qResp = r;
                break;
              }
            }
          }

          const respObj = qResp
            ? { ...JSON.parse(JSON.stringify(qResp)) }
            : { questionId: qId, fieldResponses: [] };

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
  const firstUser = firstSub ? (firstSub.userId as any) : null;
  const stateName = firstSub?.stateName || firstUser?.state || 'Andhra Pradesh';

  return {
    _id: `consolidated-${editionId}`,
    isConsolidated: true,
    editionId,
    stateName,
    status: 'APPROVED',
    totalScore: grandTotalScore,
    responses: consolidatedResponses,
    reformAreaWinners,
    userId: firstUser || { name: 'Top Performers', email: 'consolidated@srf.gov' },
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
    const consolidated = await buildConsolidatedSubmission(editionId);

    if (consolidated.responses.length > 0) {
      return res.status(200).json([consolidated]);
    }

    const submissions = await Submission.find({ editionId }).populate('userId', 'name email state').sort({ createdAt: -1 });
    return res.status(200).json(submissions);
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

      // Only allow edit if draft, rejected, or if resubmission is required
      if (submission.status !== SubmissionStatus.DRAFT && submission.status !== SubmissionStatus.REJECTED && !hasResubmission) {
        return res.status(400).json({ error: 'Cannot edit a submitted or reviewed application unless resubmission is required' });
      }

      if (responses) {
        // Merge logic to handle file rejection history
        for (const newQ of responses) {
          const oldQ = submission.responses.find(r => r.questionId === newQ.questionId);
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

export const uploadSubmissionFile = async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({
      fileUrl,
      fileName: req.file.originalname
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
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
