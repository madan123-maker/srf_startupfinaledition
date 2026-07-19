import mongoose, { Schema, Document } from 'mongoose';

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface IFieldResponse {
  fieldId: string;
  value: any;
  fileUrl?: string;
  fileName?: string;
  evaluationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  evaluationRemarks?: string;
  googleDriveFileId?: string;
}

export interface ISubmissionResponse {
  questionId: string;
  fieldResponses: IFieldResponse[];
}

export interface ISubmission extends Document {
  editionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: SubmissionStatus;
  totalScore: number;
  stateName: string;
  adminRemarks?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  responses: ISubmissionResponse[];
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema: Schema = new Schema(
  {
    editionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Edition',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stateName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SubmissionStatus),
      default: SubmissionStatus.DRAFT,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    adminRemarks: {
      type: String,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    responses: [
      {
        questionId: { type: String, required: true },
        fieldResponses: [
          {
            fieldId: { type: String, required: true },
            value: { type: mongoose.Schema.Types.Mixed },
            fileUrl: { type: String },
            fileName: { type: String },
            evaluationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
            evaluationRemarks: { type: String },
            googleDriveFileId: { type: String }
          }
        ]
      }
    ]
  },
  {
    timestamps: true,
  }
);

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);

