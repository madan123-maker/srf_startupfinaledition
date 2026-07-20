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
  status?: 'DRAFT' | 'SUBMITTED';
  evaluationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
  evaluationRemarks?: string;
  googleDriveFileId?: string;
  history?: {
    fileUrl: string;
    fileName: string;
    evaluationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
    evaluationRemarks?: string;
    submittedAt: Date;
  }[];
}

export interface ISubmissionResponse {
  questionId: string;
  isApplying?: boolean;
  score?: number;
  fieldResponses: IFieldResponse[];
  additionalFiles?: {
    fileId: string;
    fileUrl: string;
    fileName: string;
    status: 'DRAFT' | 'SUBMITTED';
    evaluationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
    evaluationRemarks?: string;
    history?: {
      fileUrl: string;
      fileName: string;
      evaluationStatus: string;
      evaluationRemarks?: string;
      submittedAt: Date;
    }[];
  }[];
  supportingDocumentResponses?: {
    documentId: string;
    files: {
      fileId: string;
      fileUrl: string;
      fileName: string;
      status: 'DRAFT' | 'SUBMITTED';
      evaluationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
      evaluationRemarks?: string;
      history?: {
        fileUrl: string;
        fileName: string;
        evaluationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
        evaluationRemarks?: string;
        submittedAt: Date;
      }[];
    }[];
  }[];
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
        isApplying: { type: Boolean },
        score: { type: Number, default: 0 },
        fieldResponses: [
          {
            fieldId: { type: String, required: true },
            value: { type: mongoose.Schema.Types.Mixed },
            fileUrl: { type: String },
            fileName: { type: String },
            status: { type: String, enum: ['DRAFT', 'SUBMITTED'], default: 'DRAFT' },
            evaluationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'], default: 'PENDING' },
            evaluationRemarks: { type: String },
            googleDriveFileId: { type: String },
            history: [
              {
                fileUrl: { type: String, required: true },
                fileName: { type: String, required: true },
                evaluationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'], required: true },
                evaluationRemarks: { type: String },
                submittedAt: { type: Date, default: Date.now }
              }
            ]
          }
        ],
        additionalFiles: [
          {
            fileId: { type: String, required: true },
            fileUrl: { type: String, required: true },
            fileName: { type: String, required: true },
            status: { type: String, enum: ['DRAFT', 'SUBMITTED'], default: 'DRAFT' },
            evaluationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'], default: 'PENDING' },
            evaluationRemarks: { type: String },
            history: [
              {
                fileUrl: { type: String, required: true },
                fileName: { type: String, required: true },
                evaluationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'], required: true },
                evaluationRemarks: { type: String },
                submittedAt: { type: Date, default: Date.now }
              }
            ]
          }
        ],
        supportingDocumentResponses: [
          {
            documentId: { type: String, required: true },
            files: [
              {
                fileId: { type: String, required: true },
                fileUrl: { type: String, required: true },
                fileName: { type: String, required: true },
                status: { type: String, enum: ['DRAFT', 'SUBMITTED'], default: 'DRAFT' },
                evaluationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'], default: 'PENDING' },
                evaluationRemarks: { type: String },
                history: [
                  {
                    fileUrl: { type: String, required: true },
                    fileName: { type: String, required: true },
                    evaluationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'], required: true },
                    evaluationRemarks: { type: String },
                    submittedAt: { type: Date, default: Date.now }
                  }
                ]
              }
            ]
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

