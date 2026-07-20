import mongoose, { Schema, Document } from 'mongoose';

export interface IEvaluationAnswer {
  questionId: string;
  awardedScore: number | null;
  evaluatorRemarks: string;
  evaluatorAction: string; // 'Accept', 'Reject', 'Observation', etc.
}

export interface IEvaluation extends Document {
  submissionId: mongoose.Types.ObjectId;
  evaluatorId: mongoose.Types.ObjectId;
  round: string; // 'Round 1', 'Moderation', 'Final'
  status: 'Draft' | 'Submitted' | 'Evaluating' | 'Completed' | 'Locked';
  answers: IEvaluationAnswer[];
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationAnswerSchema = new Schema({
  questionId: { type: String, required: true },
  awardedScore: { type: Number, default: null },
  evaluatorRemarks: { type: String, default: '' },
  evaluatorAction: { type: String, default: '' }
}, { _id: false });

const EvaluationSchema = new Schema({
  submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
  evaluatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  round: { type: String, default: 'Round 1' },
  status: { 
    type: String, 
    enum: ['Draft', 'Submitted', 'Evaluating', 'Completed', 'Locked'],
    default: 'Draft'
  },
  answers: [EvaluationAnswerSchema]
}, { timestamps: true });

// A submission can have multiple evaluations, but typically one per evaluator per round
EvaluationSchema.index({ submissionId: 1, evaluatorId: 1, round: 1 }, { unique: true });

export const Evaluation = mongoose.model<IEvaluation>('Evaluation', EvaluationSchema);
