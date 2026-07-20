import { Evaluation } from '../models/Evaluation';
import { FormSchemaModel } from '../models/FormSchema';
import { Submission } from '../models/Submission';

export class AggregationService {
  /**
   * Calculates the hierarchical score summary for a submission.
   */
  async getScoreSummary(submissionId: string) {
    const submission = await Submission.findById(submissionId);
    if (!submission) throw new Error('Submission not found');

    const formSchema = await FormSchemaModel.findOne({ editionId: submission.editionId });
    if (!formSchema) throw new Error('FormSchema not found');

    // For now, get the most recent or active evaluation
    const evaluation = await Evaluation.findOne({ submissionId }).sort({ createdAt: -1 });

    const summary = {
      overall: { awarded: 0, max: 0 },
      reformAreas: [] as any[],
      completion: { evaluated: 0, total: 0, pending: 0, percentage: 0 }
    };

    let evaluatedQuestionsCount = 0;
    let totalQuestionsCount = 0;

    for (const area of formSchema.areas) {
      const areaSummary = {
        id: area.id,
        title: area.title,
        awarded: 0,
        max: 0,
        actionPoints: [] as any[]
      };

      for (const ap of area.actionPoints) {
        const apSummary = {
          id: ap.id,
          title: ap.title,
          awarded: 0,
          max: 0,
          questions: [] as any[]
        };

        for (const q of ap.questions) {
          if (!q.isEvaluatable) continue;
          
          totalQuestionsCount++;
          // For legacy support, fallback to weightage if maxScore is 0
          const max = q.maxScore || q.weightage || 0;
          let awarded = 0;

          // Find awarded score from Evaluation
          const ans = evaluation?.answers.find(a => a.questionId === q.id);
          if (ans && ans.awardedScore !== null && ans.awardedScore !== undefined) {
            awarded = ans.awardedScore;
            evaluatedQuestionsCount++;
          }

          apSummary.questions.push({ id: q.id, title: q.title, awarded, max });
          apSummary.awarded += awarded;
          apSummary.max += max;
        }

        areaSummary.actionPoints.push(apSummary);
        areaSummary.awarded += apSummary.awarded;
        areaSummary.max += apSummary.max;
      }

      summary.reformAreas.push(areaSummary);
      summary.overall.awarded += areaSummary.awarded;
      summary.overall.max += areaSummary.max;
    }

    summary.completion.evaluated = evaluatedQuestionsCount;
    summary.completion.total = totalQuestionsCount;
    summary.completion.pending = totalQuestionsCount - evaluatedQuestionsCount;
    summary.completion.percentage = totalQuestionsCount > 0 ? Math.round((evaluatedQuestionsCount / totalQuestionsCount) * 100) : 0;

    return summary;
  }
}
