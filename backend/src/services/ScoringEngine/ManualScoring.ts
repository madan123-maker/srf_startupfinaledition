import { IScoringStrategy } from './IScoringStrategy';

export class ManualScoring implements IScoringStrategy {
  async evaluate(questionId: string, ruleContext: any, inputParams: any): Promise<number | null> {
    const { awardedScore, maxScore } = inputParams;

    if (awardedScore === null || awardedScore === undefined) {
      return null;
    }

    if (typeof awardedScore !== 'number') {
      throw new Error(`Invalid score type. Expected number, got ${typeof awardedScore}`);
    }

    if (awardedScore < 0) {
      throw new Error(`Score cannot be negative. Given: ${awardedScore}`);
    }

    if (maxScore !== undefined && awardedScore > maxScore) {
      throw new Error(`Awarded score (${awardedScore}) exceeds maximum score (${maxScore})`);
    }

    return awardedScore;
  }
}
