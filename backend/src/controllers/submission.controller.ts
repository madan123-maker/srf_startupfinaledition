import { Request, Response } from 'express';
import { Submission, SubmissionStatus } from '../models/Submission';
import { User } from '../models/User';

export const getSubmissionsByEdition = async (req: Request, res: Response) => {
  try {
    const { editionId } = req.params;
    const submissions = await Submission.find({ editionId }).populate('userId', 'name email').sort({ createdAt: -1 });
    return res.status(200).json(submissions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
};

export const getSubmissionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
  try {
    const { id } = req.params;
    const { responses, status } = req.body;

    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Only allow edit if draft or rejected
    if (submission.status !== SubmissionStatus.DRAFT && submission.status !== SubmissionStatus.REJECTED) {
      return res.status(400).json({ error: 'Cannot edit a submitted or reviewed application' });
    }

    if (responses) submission.responses = responses;
    if (status) submission.status = status;

    await submission.save();
    return res.status(200).json(submission);
  } catch (error: any) {
    console.error('Error updating submission:', error);
    return res.status(500).json({ error: error.message || 'Failed to update submission' });
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
    const { questionId, fieldId, status, remarks } = req.body;

    // Atomic update using positional array filters — avoids VersionError
    const updateFields: any = {
      'responses.$[q].fieldResponses.$[f].evaluationStatus': status,
      'responses.$[q].fieldResponses.$[f].evaluationRemarks': remarks,
    };

    const updated = await Submission.findByIdAndUpdate(
      id,
      { $set: updateFields },
      {
        arrayFilters: [
          { 'q.questionId': questionId },
          { 'f.fieldId': fieldId },
        ],
        new: true,
        runValidators: false,
      }
    ).populate('userId', 'name email');

    if (!updated) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('Error evaluating document:', error);
    return res.status(500).json({ error: error.message || 'Document evaluation failed' });
  }
};
