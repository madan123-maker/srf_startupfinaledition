import mongoose, { Schema, Document } from 'mongoose';

export type AssignmentScope = 'EDITION' | 'REFORM_AREA' | 'ACTION_POINT' | 'QUESTION';

export interface IAssignment extends Document {
  userId: mongoose.Types.ObjectId;
  editionId: mongoose.Types.ObjectId;
  scope: AssignmentScope;
  reformAreaId?: string;
  reformAreaTitle?: string;
  actionPointId?: string;
  actionPointTitle?: string;
  questionId?: string;
  questionTitle?: string;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
  status: 'ASSIGNED' | 'SUBMITTED' | 'EVALUATED';
  evaluationStatus?: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  evaluationRemarks?: string;
  evaluatedBy?: mongoose.Types.ObjectId;
  evaluatedAt?: Date;
  awardedScore?: number;
  maxScore?: number;
}

const AssignmentSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    editionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Edition',
      required: true,
    },
    scope: {
      type: String,
      enum: ['EDITION', 'REFORM_AREA', 'ACTION_POINT', 'QUESTION'],
      required: true,
    },
    reformAreaId: { type: String },
    reformAreaTitle: { type: String },
    actionPointId: { type: String },
    actionPointTitle: { type: String },
    questionId: { type: String },
    questionTitle: { type: String },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'SUBMITTED', 'EVALUATED'],
      default: 'ASSIGNED',
    },
    evaluationStatus: {
      type: String,
      enum: ['APPROVED', 'REJECTED', 'NEEDS_REVISION'],
    },
    evaluationRemarks: { type: String },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    evaluatedAt: { type: Date },
    awardedScore: { type: Number },
    maxScore: { type: Number },
  },
  {
    timestamps: true,
  }
);

// Prevent exact duplicate assignments for the same user+scope
AssignmentSchema.index(
  { userId: 1, editionId: 1, scope: 1, reformAreaId: 1, actionPointId: 1, questionId: 1 },
  { unique: true, sparse: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
