import { Response } from 'express';
import { Assignment } from '../models/Assignment';
import { FormSchemaModel } from '../models/FormSchema';
import { Submission } from '../models/Submission';
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

    const assignment = await Assignment.create({
      userId,
      editionId,
      scope,
      reformAreaId: reformAreaId || undefined,
      reformAreaTitle: reformAreaTitle || undefined,
      actionPointId: actionPointId || undefined,
      actionPointTitle: actionPointTitle || undefined,
      questionId: questionId || undefined,
      questionTitle: questionTitle || undefined,
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
      .sort({ createdAt: -1 });

    return res.status(200).json(assignments);
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

// ─── Get schema filtered to the assignment scope (for FocusedFormView) ───────
export const getAssignmentSchema = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // assignmentId
    const userId = req.user?.id;

    const assignment = await Assignment.findOne({ _id: id, userId }).populate(
      'editionId',
      'name version status'
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const schema = await FormSchemaModel.findOne({ editionId: assignment.editionId });
    if (!schema) {
      return res.status(404).json({ error: 'Schema not found for this edition.' });
    }

    // Filter schema to only the assigned scope
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

    return res.status(200).json({
      assignment,
      filteredSchema: { areas: filteredAreas },
    });
  } catch (error: any) {
    console.error('Get assignment schema error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch assignment schema.' });
  }
};

// ─── Submit Assignment (User action) ─────────────────────────────────────────
export const submitAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const assignment = await Assignment.findOneAndUpdate(
      { _id: id, userId },
      { status: 'SUBMITTED' },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found or not yours.' });
    }

    return res.status(200).json({ message: 'Task submitted successfully.', assignment });
  } catch (error: any) {
    console.error('Submit assignment error:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit assignment.' });
  }
};

// ─── Get Submitted Assignments (Admin & Super Admin view) ──────────────────────
export const getSubmittedAssignments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only Admins and Super Admins can view submitted tasks.' });
    }

    const assignments = await Assignment.find({ status: { $in: ['SUBMITTED', 'EVALUATED'] } })
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
            qResp.fieldResponses.forEach(fResp => {
              const key = `${qResp.questionId}_${fResp.fieldId}`;
              if (fieldEvaluations[key]) {
                fResp.evaluationStatus = fieldEvaluations[key].status || 'PENDING';
                fResp.evaluationRemarks = fieldEvaluations[key].remarks || '';
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
