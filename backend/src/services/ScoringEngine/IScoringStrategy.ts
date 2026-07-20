export interface IScoringStrategy {
  evaluate(questionId: string, ruleContext: any, inputParams: any): Promise<number | null>;
}
