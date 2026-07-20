import { Request, Response } from 'express';
import { EvaluationService } from '../services/EvaluationService';
import { AggregationService } from '../services/AggregationService';

const evaluationService = new EvaluationService();
const aggregationService = new AggregationService();

export const scoreQuestion = async (req: any, res: Response) => {
  try {
    const { submissionId, questionId } = req.params;
    const { awardedScore, remarks } = req.body;
    const evaluatorId = req.user.id;

    const evaluation = await evaluationService.submitQuestionScore(submissionId, evaluatorId, questionId, awardedScore, remarks);
    
    // Optionally return the full summary back to frontend to support instant updates
    const summary = await aggregationService.getScoreSummary(submissionId);

    return res.status(200).json({ evaluation, summary });
  } catch (error: any) {
    console.error('Error evaluating question:', error);
    return res.status(400).json({ error: error.message || 'Evaluation failed' });
  }
};

export const getScoreSummary = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const summary = await aggregationService.getScoreSummary(submissionId);
    return res.status(200).json(summary);
  } catch (error: any) {
    console.error('Error getting score summary:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch summary' });
  }
};
