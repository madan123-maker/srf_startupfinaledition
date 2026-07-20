import mongoose, { Schema, Document } from 'mongoose';

export interface IEvaluationHistory extends Document {
  evaluationId: mongoose.Types.ObjectId;
  questionId: string;
  oldScore: number | null;
  newScore: number | null;
  changedBy: mongoose.Types.ObjectId;
  changedOn: Date;
  remarks: string;
  ipAddress: string;
}

const EvaluationHistorySchema = new Schema({
  evaluationId: { type: Schema.Types.ObjectId, ref: 'Evaluation', required: true },
  questionId: { type: String, required: true },
  oldScore: { type: Number, default: null },
  newScore: { type: Number, default: null },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  changedOn: { type: Date, default: Date.now },
  remarks: { type: String, default: '' },
  ipAddress: { type: String, default: '' }
});

export const EvaluationHistory = mongoose.model<IEvaluationHistory>('EvaluationHistory', EvaluationHistorySchema);
