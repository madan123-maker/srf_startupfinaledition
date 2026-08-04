import { Response } from 'express';
import { Assignment } from '../models/Assignment';
import { FormSchemaModel } from '../models/FormSchema';
import { Submission, SubmissionStatus } from '../models/Submission';
import { Edition } from '../models/Edition';
import { Evaluation } from '../models/Evaluation';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.middleware';
import { Notification } from '../models/Notification';

// ─── Create Assignment (Super Admin only) ────────────────────────────────────
export const createAssignment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admins can assign tasks.' });
    }

    const {
      userId,
      editionId,
      scope,
      reformAreaId,
      reformAreaTitle,
      actionPointId,
      actionPointTitle,
      questionId,
      questionTitle,
    } = req.body;

    if (!userId || !editionId || !scope) {
      return res.status(400).json({ error: 'userId, editionId, and scope are required.' });
    }

    const edition = await Edition.findById(editionId);
    if (!edition) {
      return res.status(404).json({ error: 'Edition not found.' });
    }

    if (edition.status === 'PUBLISHED') {
      return res.status(400).json({ error: 'Published editions cannot be assigned to users. Only unpublished editions can be assigned.' });
    }

    let finalRaTitle = reformAreaTitle;
    let finalApTitle = actionPointTitle;
    let finalQTitle = questionTitle;

    if (scope !== 'EDITION' && (!finalRaTitle || !finalApTitle || !finalQTitle) && (reformAreaId || actionPointId || questionId)) {
      const schema = await FormSchemaModel.findOne({ editionId }).lean();
      if (schema && schema.areas) {
        for (const area of schema.areas) {
          if (reformAreaId && area.id === reformAreaId) {
            finalRaTitle = finalRaTitle || area.title;
          }
          for (const ap of area.actionPoints || []) {
            if (actionPointId && ap.id === actionPointId) {
              finalApTitle = finalApTitle || ap.title;
              finalRaTitle = finalRaTitle || area.title;
            }
            for (const q of ap.questions || []) {
              if (questionId && q.id === questionId) {
                finalQTitle = finalQTitle || `${q.questionNumber}. ${q.title}`;
                finalApTitle = finalApTitle || ap.title;
                finalRaTitle = finalRaTitle || area.title;
              }
            }
          }
        }
      }
    }

    const assignment = await Assignment.create({
      userId,
      editionId,
      scope,
      reformAreaId: reformAreaId || undefined,
      reformAreaTitle: finalRaTitle || undefined,
      actionPointId: actionPointId || undefined,
      actionPointTitle: finalApTitle || undefined,
      questionId: questionId || undefined,
      questionTitle: finalQTitle || undefined,
      assignedBy: req.user.id,
    });

    try {
      const taskLabel = questionTitle || actionPointTitle || reformAreaTitle || 'Full Edition Task';
      await Notification.create({
        userId,
        message: `New Task Assigned (${scope}): ${taskLabel}`,
        link: '/user-dashboard/assigned-tasks',
        isRead: false
      });
    } catch (notifErr) {
      console.error('Notification creation failed for task assignment:', notifErr);
    }

    return res.status(201).json({ message: 'Task assigned successfully.', assignment });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This task is already assigned to the user.' });
    }
    console.error('Create assignment error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create assignment.' });
  }
};

// ─── Get all assignments (Super Admin view) ──────────────────────────────────
export const getAllAssignments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admins can view all assignments.' });
    }

    const assignments = await Assignment.find()
      .populate('userId', 'name email state')
      .populate('editionId', 'name version')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json(assignments);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch assignments.' });
  }
};

// ─── Get assignments for a specific user (Super Admin view) ─────────────────
export const getUserAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const assignments = await Assignment.find({ userId })
      .populate('editionId', 'name version status')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      assignments.map(async (a: any) => {
        let { reformAreaTitle, actionPointTitle, questionTitle, reformAreaId, actionPointId, questionId, editionId, scope } = a;
        if (scope !== 'EDITION' && (!reformAreaTitle || !actionPointTitle || !questionTitle) && (reformAreaId || actionPointId || questionId)) {
          const edId = editionId?._id || editionId;
          const schema = await FormSchemaModel.findOne({ editionId: edId }).lean();
          if (schema && schema.areas) {
            for (const area of schema.areas) {
              if (reformAreaId && area.id === reformAreaId) {
                reformAreaTitle = reformAreaTitle || area.title;
              }
              for (const ap of area.actionPoints || []) {
                if (actionPointId && ap.id === actionPointId) {
                  actionPointTitle = actionPointTitle || ap.title;
                  reformAreaTitle = reformAreaTitle || area.title;
                }
                for (const q of ap.questions || []) {
                  if (questionId && q.id === questionId) {
                    questionTitle = questionTitle || `${q.questionNumber}. ${q.title}`;
                    actionPointTitle = actionPointTitle || ap.title;
                    reformAreaTitle = reformAreaTitle || area.title;
                  }
                }
              }
            }
          }
        }
        return {
          ...a,
          reformAreaTitle,
          actionPointTitle,
          questionTitle,
        };
      })
    );

    return res.status(200).json(enriched);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch assignments.' });
  }
};

// ─── Get current user's own assignments (User view) ──────────────────────────
export const getMyAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const assignments = await Assignment.find({ userId })
      .populate('editionId', 'name version status description')
      .sort({ createdAt: -1 });

    // For each assignment, calculate completion status from the submission
    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const submission = await Submission.findOne({ editionId: a.editionId, userId });
        const schema = await FormSchemaModel.findOne({ editionId: a.editionId });

        let totalFields = 0;
        let filledFields = 0;

        if (schema && submission) {
          const areas = schema.areas || [];

          // Determine which questions belong to this assignment
          let relevantQuestionIds: string[] = [];

          if (a.scope === 'EDITION') {
            areas.forEach((area) =>
              area.actionPoints.forEach((ap) =>
                ap.questions.forEach((q) => relevantQuestionIds.push(q.id))
              )
            );
          } else if (a.scope === 'REFORM_AREA') {
            const area = areas.find((ar) => ar.id === a.reformAreaId);
            if (area) {
              area.actionPoints.forEach((ap) =>
                ap.questions.forEach((q) => relevantQuestionIds.push(q.id))
              );
            }
          } else if (a.scope === 'ACTION_POINT') {
            const area = areas.find((ar) => ar.id === a.reformAreaId);
            if (area) {
              const ap = area.actionPoints.find((ap) => ap.id === a.actionPointId);
              if (ap) ap.questions.forEach((q) => relevantQuestionIds.push(q.id));
            }
          } else if (a.scope === 'QUESTION') {
            relevantQuestionIds = [a.questionId!];
          }

          // Count total fields vs filled fields
          relevantQuestionIds.forEach((qId) => {
            const questionDef = areas
              .flatMap((ar) => ar.actionPoints.flatMap((ap) => ap.questions))
              .find((q) => q.id === qId);

            if (questionDef) {
              totalFields += questionDef.fields.length;
              const response = submission.responses.find((r) => r.questionId === qId);
              if (response) {
                filledFields += response.fieldResponses.filter(
                  (fr) => fr.value !== undefined && fr.value !== null && fr.value !== ''
                ).length;
              }
            }
          });
        }

        let calcStatus = 'NOT_STARTED';
        if (totalFields > 0) {
          if (filledFields >= totalFields) calcStatus = 'IN_PROGRESS'; // We used to auto-mark as COMPLETED, now we max out at IN_PROGRESS until explicitly submitted
          else if (filledFields > 0) calcStatus = 'IN_PROGRESS';
        }

        // If the DB has an explicit status of SUBMITTED or EVALUATED, use that, otherwise use calculated status
        const finalStatus = (a.status === 'SUBMITTED' || a.status === 'EVALUATED') ? a.status : calcStatus;

        return {
          ...a.toObject(),
          status: finalStatus,
          totalFields,
          filledFields,
        };
      })
    );

    return res.status(200).json(enriched);
  } catch (error: any) {
    console.error('Get my assignments error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch your assignments.' });
  }
};

// ─── Get My Submissions (User view for past submissions) ─────────────────────
export const getMySubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Find assignments for this user that are explicitly SUBMITTED or EVALUATED
    const submissions = await Assignment.find({
      userId,
      status: { $in: ['SUBMITTED', 'EVALUATED'] }
    }).populate('editionId', 'name version status').sort({ updatedAt: -1 });

    return res.status(200).json(submissions);
  } catch (error: any) {
    console.error('Get my submissions error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch your submissions.' });
  }
};

// ─── Delete assignment (Super Admin only) ────────────────────────────────────
export const deleteAssignment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admins can remove assignments.' });
    }

    const { id } = req.params;
    const assignment = await Assignment.findByIdAndDelete(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    return res.status(200).json({ message: 'Assignment removed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to delete assignment.' });
  }
};

// ─── Helper to filter schema based on all user assignments for an edition ───
const filterSchemaForUserAssignments = (schemaAreas: any[], assignments: any[]) => {
  const hasFullEdition = assignments.some((a) => a.scope === 'EDITION');
  if (hasFullEdition) {
    return schemaAreas;
  }

  const assignedReformAreaIds = new Set(
    assignments.filter((a) => a.scope === 'REFORM_AREA' && a.reformAreaId).map((a) => String(a.reformAreaId))
  );
  const assignedReformAreaTitles = new Set(
    assignments.filter((a) => a.scope === 'REFORM_AREA' && a.reformAreaTitle).map((a) => a.reformAreaTitle.trim().toLowerCase())
  );

  const assignedActionPointIds = new Set(
    assignments.filter((a) => a.scope === 'ACTION_POINT' && a.actionPointId).map((a) => String(a.actionPointId))
  );
  const assignedActionPointTitles = new Set(
    assignments.filter((a) => a.scope === 'ACTION_POINT' && a.actionPointTitle).map((a) => a.actionPointTitle.trim().toLowerCase())
  );

  const assignedQuestionIds = new Set(
    assignments.filter((a) => a.scope === 'QUESTION' && a.questionId).map((a) => String(a.questionId))
  );
  const assignedQuestionTitles = new Set(
    assignments.filter((a) => a.scope === 'QUESTION' && a.questionTitle).map((a) => a.questionTitle.trim().toLowerCase())
  );

  return schemaAreas
    .map((area: any) => {
      const areaIdStr = String(area.id || area._id || '');
      const areaTitleStr = (area.title || '').trim().toLowerCase();

      // 1. Whole Reform Area assigned (by ID or Title)
      if (assignedReformAreaIds.has(areaIdStr) || (areaTitleStr && assignedReformAreaTitles.has(areaTitleStr))) {
        return area;
      }

      // 2. Specific Action Points or Questions assigned within this area
      const filteredActionPoints = (area.actionPoints || [])
        .map((ap: any) => {
          const apIdStr = String(ap.id || ap._id || '');
          const apTitleStr = (ap.title || '').trim().toLowerCase();

          if (assignedActionPointIds.has(apIdStr) || (apTitleStr && assignedActionPointTitles.has(apTitleStr))) {
            return ap;
          }
          const filteredQuestions = (ap.questions || []).filter((q: any) => {
            const qIdStr = String(q.id || q._id || '');
            const qTitleStr = (q.title || '').trim().toLowerCase();
            return assignedQuestionIds.has(qIdStr) || (qTitleStr && assignedQuestionTitles.has(qTitleStr));
          });
          if (filteredQuestions.length > 0) {
            return { ...ap, questions: filteredQuestions };
          }
          return null;
        })
        .filter(Boolean);

      if (filteredActionPoints.length > 0) {
        return { ...area, actionPoints: filteredActionPoints };
      }

      return null;
    })
    .filter(Boolean);
};

// ─── Get schema filtered to all user's assignments for an assignment ID ───────
export const getAssignmentSchema = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // assignmentId
    const userId = req.user?.id || (req.user as any)?._id;

    let targetAssignment = await Assignment.findOne({ _id: id, userId }).populate(
      'editionId',
      'name version status description guidelineFileId guidelineFileName'
    );

    if (!targetAssignment && mongoose.Types.ObjectId.isValid(id)) {
      targetAssignment = await Assignment.findById(id).populate(
        'editionId',
        'name version status description guidelineFileId guidelineFileName'
      );
    }

    if (!targetAssignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const editionId = typeof targetAssignment.editionId === 'object' ? (targetAssignment.editionId as any)._id : targetAssignment.editionId;

    // Get all assignments for this user and edition
    let allUserAssignments = await Assignment.find({ userId, editionId }).populate(
      'editionId',
      'name version status description guidelineFileId guidelineFileName'
    );

    if ((!allUserAssignments || allUserAssignments.length === 0) && mongoose.Types.ObjectId.isValid(editionId)) {
      allUserAssignments = await Assignment.find({
        userId: new mongoose.Types.ObjectId(userId),
        editionId: new mongoose.Types.ObjectId(editionId),
      }).populate('editionId', 'name version status description guidelineFileId guidelineFileName');
    }

    if (!allUserAssignments || allUserAssignments.length === 0) {
      allUserAssignments = [targetAssignment];
    }

    let schema = await FormSchemaModel.findOne({ editionId });
    if (!schema && mongoose.Types.ObjectId.isValid(editionId)) {
      schema = await FormSchemaModel.findOne({ editionId: new mongoose.Types.ObjectId(editionId) });
    }

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found for this edition.' });
    }

    let filteredAreas = filterSchemaForUserAssignments(schema.toObject().areas || [], allUserAssignments);
    if (!filteredAreas || filteredAreas.length === 0) {
      filteredAreas = schema.toObject().areas || [];
    }

    const edDoc = await Edition.findById(editionId).lean();
    const edGuidelineId = edDoc?.guidelineFileId ? edDoc.guidelineFileId.toString() : (targetAssignment?.editionId as any)?.guidelineFileId;

    return res.status(200).json({
      assignment: targetAssignment,
      assignments: allUserAssignments,
      edition: targetAssignment.editionId,
      guidelineFileId: edGuidelineId,
      filteredSchema: { areas: filteredAreas, guidelineFileId: edGuidelineId },
    });
  } catch (error: any) {
    console.error('Get assignment schema error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch assignment schema.' });
  }
};

// ─── Get schema filtered to all user's assignments for an edition ID ─────────
export const getEditionAssignmentSchema = async (req: AuthRequest, res: Response) => {
  try {
    const { editionId } = req.params;
    const userId = req.user?.id || (req.user as any)?._id;

    let edition = await Edition.findById(editionId);
    if (!edition && mongoose.Types.ObjectId.isValid(editionId)) {
      edition = await Edition.findById(new mongoose.Types.ObjectId(editionId));
    }

    if (!edition) {
      return res.status(404).json({ error: 'Edition not found.' });
    }

    let assignments = await Assignment.find({ userId, editionId }).populate(
      'editionId',
      'name version status description guidelineFileId guidelineFileName'
    );

    if ((!assignments || assignments.length === 0) && mongoose.Types.ObjectId.isValid(editionId)) {
      assignments = await Assignment.find({
        userId: new mongoose.Types.ObjectId(userId),
        editionId: new mongoose.Types.ObjectId(editionId),
      }).populate('editionId', 'name version status description guidelineFileId guidelineFileName');
    }

    if (!assignments) assignments = [];

    let schema = await FormSchemaModel.findOne({ editionId });
    if (!schema && mongoose.Types.ObjectId.isValid(editionId)) {
      schema = await FormSchemaModel.findOne({ editionId: new mongoose.Types.ObjectId(editionId) });
    }

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found for this edition.' });
    }

    let filteredAreas = assignments.length > 0
      ? filterSchemaForUserAssignments(schema.toObject().areas || [], assignments)
      : schema.toObject().areas || [];

    if (!filteredAreas || filteredAreas.length === 0) {
      filteredAreas = schema.toObject().areas || [];
    }

    const primaryAssignment = assignments[0] || {
      _id: `edition-${editionId}`,
      scope: 'EDITION',
      editionId: edition,
      status: 'ASSIGNED',
    };

    const edGuidelineId = edition?.guidelineFileId ? edition.guidelineFileId.toString() : undefined;

    return res.status(200).json({
      assignment: primaryAssignment,
      assignments,
      edition,
      guidelineFileId: edGuidelineId,
      filteredSchema: { areas: filteredAreas, guidelineFileId: edGuidelineId },
    });
  } catch (error: any) {
    console.error('Get edition assignment schema error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch edition assignment schema.' });
  }
};

// ─── Submit Assignment (User action) ─────────────────────────────────────────
export const submitAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const assignment = await Assignment.findOne({ _id: id, userId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found or not yours.' });
    }

    // Mark all assignments for this edition as SUBMITTED
    await Assignment.updateMany(
      { userId, editionId: assignment.editionId },
      { status: 'SUBMITTED' }
    );

    const updatedAssignment = await Assignment.findById(id);

    return res.status(200).json({ message: 'Task submitted successfully.', assignment: updatedAssignment });
  } catch (error: any) {
    console.error('Submit assignment error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit assignment.' });
  }
};

// ─── Submit Edition Assignment (User action) ─────────────────────────────────
export const submitEditionAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { editionId } = req.params;
    const userId = req.user?.id;

    const result = await Assignment.updateMany(
      { userId, editionId },
      { status: 'SUBMITTED' }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'No assignments found for this edition.' });
    }

    return res.status(200).json({ message: 'Edition tasks submitted successfully.' });
  } catch (error: any) {
    console.error('Submit edition assignment error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit edition tasks.' });
  }
};

// ─── Get Submitted Assignments (Admin & Super Admin view) ──────────────────────
export const getSubmittedAssignments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only Admins and Super Admins can view submitted tasks.' });
    }

    // Sync any existing user Submissions that are UNDER_REVIEW or SUBMITTED into Assignment status = 'SUBMITTED'
    const activeSubmissions = await Submission.find({
      $or: [
        { status: { $in: [SubmissionStatus.UNDER_REVIEW, SubmissionStatus.SUBMITTED, SubmissionStatus.APPROVED] } },
        { 'responses.fieldResponses.status': 'SUBMITTED' },
        { 'responses.additionalFiles.status': 'SUBMITTED' },
        { 'responses.supportingDocumentResponses.files.status': 'SUBMITTED' }
      ]
    } as any);

    const pairs = activeSubmissions
      .filter(s => s.userId && s.editionId)
      .map(s => ({ userId: s.userId, editionId: s.editionId }));

    const baseQuery = { status: { $in: ['SUBMITTED', 'EVALUATED'] as any } };
    const query = pairs.length > 0 
      ? { $or: [baseQuery, ...pairs] } as any
      : baseQuery as any;

    const assignments = await Assignment.find(query)
      .populate('userId', 'name email state')
      .populate('editionId', 'name version')
      .sort({ updatedAt: -1 });

    return res.status(200).json(assignments);
  } catch (error: any) {
    console.error('Get submitted assignments error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch submitted tasks.' });
  }
};

// ─── Get Assignment Details for Admin (Admin & Super Admin view) ─────────────
export const getAdminAssignmentDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only Admins and Super Admins can view these details.' });
    }

    const { id } = req.params;
    const assignment = await Assignment.findById(id)
      .populate('editionId', 'name version')
      .populate('userId', 'name email state');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const rawEditionId = (assignment.editionId as any)?._id || assignment.editionId;
    const rawUserId = (assignment.userId as any)?._id || assignment.userId;

    // Get the filtered schema
    const schema = await FormSchemaModel.findOne({ editionId: rawEditionId });
    if (!schema) return res.status(404).json({ error: 'Schema not found.' });

    let filteredAreas = schema.toObject().areas;
    if (assignment.scope === 'REFORM_AREA') {
      filteredAreas = filteredAreas.filter((a: any) => a.id === assignment.reformAreaId);
    } else if (assignment.scope === 'ACTION_POINT') {
      filteredAreas = filteredAreas
        .filter((a: any) => a.id === assignment.reformAreaId)
        .map((a: any) => ({
          ...a,
          actionPoints: a.actionPoints.filter((ap: any) => ap.id === assignment.actionPointId),
        })) as any;
    } else if (assignment.scope === 'QUESTION') {
      filteredAreas = filteredAreas
        .filter((a: any) => a.id === assignment.reformAreaId)
        .map((a: any) => ({
          ...a,
          actionPoints: a.actionPoints
            .filter((ap: any) => ap.id === assignment.actionPointId)
            .map((ap: any) => ({
              ...ap,
              questions: ap.questions.filter((q: any) => q.id === assignment.questionId),
            })),
        })) as any;
    }

    // Get the user's submission to see their filled data
    const submission = await Submission.findOne({
      editionId: rawEditionId,
      userId: rawUserId
    });

    return res.status(200).json({
      assignment,
      filteredSchema: { areas: filteredAreas },
      submission
    });
  } catch (error: any) {
    console.error('Get admin assignment details error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch details.' });
  }
};

// ─── Evaluate Assignment (Admin & Super Admin action) ─────────────────────────
export const evaluateAssignment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only Admins and Super Admins can evaluate tasks.' });
    }

    const { id } = req.params;
    const { evaluationStatus, evaluationRemarks, fieldEvaluations, questionScores, awardedScore, maxScore } = req.body;

    if (!evaluationStatus) {
      return res.status(400).json({ error: 'evaluationStatus is required.' });
    }

    const assignment = await Assignment.findByIdAndUpdate(
      id,
      {
        status: 'EVALUATED',
        evaluationStatus,
        evaluationRemarks,
        evaluatedBy: req.user.id,
        evaluatedAt: new Date(),
        awardedScore,
        maxScore,
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    try {
      await Notification.create({
        userId: assignment.userId,
        message: `Your task evaluation status has been updated: ${evaluationStatus}`,
        link: '/user-dashboard/assigned-tasks',
        isRead: false
      });
    } catch (notifErr) {
      console.error('Notification creation failed for evaluation:', notifErr);
    }

    if ((fieldEvaluations && Object.keys(fieldEvaluations).length > 0) || (questionScores && Object.keys(questionScores).length > 0) || awardedScore !== undefined) {
      const rawEditionId = (assignment.editionId as any)?._id || assignment.editionId;
      const rawUserId = (assignment.userId as any)?._id || assignment.userId;

      const submission = await Submission.findOne({
        editionId: rawEditionId,
        userId: rawUserId
      });

      if (submission) {
        let changed = false;

        if (fieldEvaluations) {
          submission.responses.forEach(qResp => {
            qResp.fieldResponses?.forEach(fResp => {
              const key = `${qResp.questionId}_${fResp.fieldId}`;
              if (fieldEvaluations[key]) {
                fResp.evaluationStatus = fieldEvaluations[key].status || 'PENDING';
                fResp.evaluationRemarks = fieldEvaluations[key].remarks || '';
                changed = true;
              }
            });

            qResp.supportingDocumentResponses?.forEach(docResp => {
              docResp.files?.forEach(f => {
                const k1 = `${qResp.questionId}_${f.fileId}`;
                const k2 = `${qResp.questionId}_${docResp.documentId}`;
                const evalObj = fieldEvaluations[k1] || fieldEvaluations[k2];
                if (evalObj) {
                  f.evaluationStatus = evalObj.status || 'PENDING';
                  f.evaluationRemarks = evalObj.remarks || '';
                  changed = true;
                }
              });
            });

            qResp.additionalFiles?.forEach(af => {
              const key = `${qResp.questionId}_${af.fileId}`;
              if (fieldEvaluations[key]) {
                af.evaluationStatus = fieldEvaluations[key].status || 'PENDING';
                af.evaluationRemarks = fieldEvaluations[key].remarks || '';
                changed = true;
              }
            });
          });
        }

        if (questionScores) {
          submission.responses.forEach(qResp => {
            if (questionScores[qResp.questionId] !== undefined) {
              qResp.score = Number(questionScores[qResp.questionId]);
              changed = true;
            }
          });

          try {
            const answersArr = Object.entries(questionScores).map(([qId, score]) => ({
              questionId: qId,
              awardedScore: Number(score),
              evaluatorRemarks: evaluationRemarks || '',
              evaluatorAction: evaluationStatus === 'APPROVED' ? 'Accept' : 'Reject'
            }));

            await Evaluation.findOneAndUpdate(
              { submissionId: submission._id, evaluatorId: req.user.id },
              {
                submissionId: submission._id,
                evaluatorId: req.user.id,
                round: 'Round 1',
                status: 'Completed',
                answers: answersArr
              },
              { upsert: true, new: true }
            );
          } catch (evalErr) {
            console.error('Failed to sync Evaluation document:', evalErr);
          }
        }

        if (awardedScore !== undefined) {
          submission.totalScore = awardedScore;
          changed = true;
        }

        if (changed) {
          await submission.save();
        }
      }
    }

    return res.status(200).json({ message: 'Task evaluated successfully.', assignment });
  } catch (error: any) {
    console.error('Evaluate assignment error:', error);
    return res.status(500).json({ error: error.message || 'Failed to evaluate assignment.' });
  }
};

// ─── Re-assign Assignment (Super Admin action) ───────────────────────────────
export const reassignAssignment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Super Admins can reassign tasks.' });
    }

    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'New userId is required.' });
    }

    const oldAssignment = await Assignment.findById(id);
    if (!oldAssignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const oldUserId = oldAssignment.userId;

    const assignment = await Assignment.findByIdAndUpdate(
      id,
      { userId },
      { new: true }
    );

    // Transfer the submission data to the new user so they can continue where the previous user left off
    if (assignment) {
      await Submission.updateMany(
        { editionId: assignment.editionId, userId: oldUserId },
        { $set: { userId: userId } }
      );

      try {
        await Notification.create({
          userId,
          message: `A task has been reassigned to you by Super Admin.`,
          link: '/user-dashboard/assigned-tasks',
          isRead: false
        });
      } catch (notifErr) {
        console.error('Notification creation failed for reassignment:', notifErr);
      }
    }

    return res.status(200).json({ message: 'Task reassigned successfully.', assignment });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'The selected user is already assigned this exact task.' });
    }
    console.error('Reassign assignment error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reassign assignment.' });
  }
};
