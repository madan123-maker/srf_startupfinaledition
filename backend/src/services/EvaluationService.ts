import { Evaluation, IEvaluationAnswer } from '../models/Evaluation';
import { EvaluationHistory } from '../models/EvaluationHistory';
import { FormSchemaModel } from '../models/FormSchema';
import { Submission } from '../models/Submission';
import { ManualScoring } from './ScoringEngine/ManualScoring';

export class EvaluationService {
  private manualScoring = new ManualScoring();

  async submitQuestionScore(submissionId: string, evaluatorId: string, questionId: string, awardedScore: number, remarks: string) {
    if (submissionId.startsWith('consolidated-')) {
      throw new Error('Cannot evaluate a consolidated submission directly');
    }
    const submission = await Submission.findById(submissionId);
    if (!submission) throw new Error('Submission not found');

    const formSchema = await FormSchemaModel.findOne({ editionId: submission.editionId });
    if (!formSchema) throw new Error('FormSchema not found');

    // Find the question maxScore
    let questionNode = null;
    for (const area of formSchema.areas) {
      for (const ap of area.actionPoints) {
        const q = ap.questions.find(q => q.id === questionId);
        if (q) {
          questionNode = q;
          break;
        }
      }
      if (questionNode) break;
    }

    if (!questionNode) throw new Error('Question not found in schema');

    const maxScore = questionNode.maxScore || questionNode.weightage || 0;

    // Use Strategy Pattern (hardcoded to Manual for now)
    const validatedScore = await this.manualScoring.evaluate(questionId, {}, { awardedScore, maxScore });

    // Find or create evaluation
    let evaluation = await Evaluation.findOne({ submissionId, evaluatorId });
    
    if (!evaluation) {
      evaluation = new Evaluation({
        submissionId,
        evaluatorId,
        round: 'Round 1',
        status: 'Evaluating',
        answers: []
      });
    }

    // Find existing answer
    const existingAnswerIndex = evaluation.answers.findIndex(a => a.questionId === questionId);
    const oldScore = existingAnswerIndex >= 0 ? evaluation.answers[existingAnswerIndex].awardedScore : null;

    if (existingAnswerIndex >= 0) {
      evaluation.answers[existingAnswerIndex].awardedScore = validatedScore;
      evaluation.answers[existingAnswerIndex].evaluatorRemarks = remarks;
    } else {
      evaluation.answers.push({
        questionId,
        awardedScore: validatedScore,
        evaluatorRemarks: remarks,
        evaluatorAction: 'Awarded'
      });
    }

    await evaluation.save();

    // Create Audit Trail
    await EvaluationHistory.create({
      evaluationId: evaluation._id,
      questionId,
      oldScore,
      newScore: validatedScore,
      changedBy: evaluatorId,
      remarks,
      ipAddress: 'System'
    });

    // Optionally update Submission totalScore for backward compatibility
    // In true decoupled architecture, we fetch summary via AggregationService, 
    // but for UI quick support we can update submission.totalScore
    const total = evaluation.answers.reduce((acc, ans) => acc + (ans.awardedScore || 0), 0);
    submission.totalScore = total;
    await submission.save();

    return evaluation;
  }
}
