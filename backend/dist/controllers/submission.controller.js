"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSubmissionFile = exports.updateMySubmission = exports.getMySubmission = exports.getSubmissionsByEdition = void 0;
const Submission_1 = require("../models/Submission");
const User_1 = require("../models/User");
const getSubmissionsByEdition = async (req, res) => {
    try {
        const { editionId } = req.params;
        const submissions = await Submission_1.Submission.find({ editionId }).populate('userId', 'name email').sort({ createdAt: -1 });
        return res.status(200).json(submissions);
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
    }
};
exports.getSubmissionsByEdition = getSubmissionsByEdition;
const getMySubmission = async (req, res) => {
    try {
        const { editionId } = req.params;
        const userId = req.user.id;
        let submission = await Submission_1.Submission.findOne({ editionId, userId });
        if (!submission) {
            const user = await User_1.User.findById(userId);
            const stateName = user?.state || 'Unknown State';
            submission = await Submission_1.Submission.create({
                editionId,
                userId,
                stateName,
                status: Submission_1.SubmissionStatus.DRAFT,
                responses: [],
                totalScore: 0
            });
        }
        return res.status(200).json(submission);
    }
    catch (error) {
        console.error('Error fetching my submission:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch your submission' });
    }
};
exports.getMySubmission = getMySubmission;
const updateMySubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { responses, status } = req.body;
        const submission = await Submission_1.Submission.findById(id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        // Only allow edit if draft
        if (submission.status !== Submission_1.SubmissionStatus.DRAFT && submission.status !== Submission_1.SubmissionStatus.REJECTED) {
            return res.status(400).json({ error: 'Cannot edit a submitted or reviewed application' });
        }
        if (responses)
            submission.responses = responses;
        if (status)
            submission.status = status;
        await submission.save();
        return res.status(200).json(submission);
    }
    catch (error) {
        console.error('Error updating submission:', error);
        return res.status(500).json({ error: error.message || 'Failed to update submission' });
    }
};
exports.updateMySubmission = updateMySubmission;
const uploadSubmissionFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        return res.status(200).json({
            fileUrl,
            fileName: req.file.originalname
        });
    }
    catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).json({ error: error.message || 'File upload failed' });
    }
};
exports.uploadSubmissionFile = uploadSubmissionFile;
