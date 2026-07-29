import mongoose, { Schema, Document } from 'mongoose';

export interface IFormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

export interface ISupportingDocument {
  id: string;
  title: string;
  description: string;
  mandatory: boolean;
  acceptedFileTypes: string[];
  maxFiles: number;
  maxFileSize: number;
}

export interface IQuestion {
  id: string;
  questionNumber: string;
  weightage: number;
  maxScore: number;
  scoringType: string;
  scoringRules: any;
  isEvaluatable: boolean;
  title: string;
  requiredDocuments: string;
  guidelinesRef: string;
  guidelinesPage?: number;
  scoringCriteria: string;
  fields: IFormField[];
  supportingDocuments?: ISupportingDocument[];
}

export interface IActionPoint {
  id: string;
  title: string;
  questions: IQuestion[];
}

export interface IReformArea {
  id: string;
  title: string;
  description: string;
  actionPoints: IActionPoint[];
}

export interface IFormSchema extends Document {
  editionId: mongoose.Types.ObjectId;
  areas: IReformArea[];
  createdAt: Date;
  updatedAt: Date;
}

const FormFieldSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  options: [{ type: String }]
}, { _id: false });

const SupportingDocumentSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  mandatory: { type: Boolean, default: true },
  acceptedFileTypes: [{ type: String }],
  maxFiles: { type: Number, default: 5 },
  maxFileSize: { type: Number, default: 10 } // MB
}, { _id: false });

const QuestionSchema = new Schema({
  id: { type: String, required: true },
  questionNumber: { type: String, required: true },
  weightage: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  scoringType: { type: String, default: 'Manual' },
  scoringRules: { type: Schema.Types.Mixed, default: {} },
  isEvaluatable: { type: Boolean, default: true },
  title: { type: String, required: true },
  requiredDocuments: { type: String, default: '' },
  guidelinesRef: { type: String, default: '' },
  guidelinesPage: { type: Number },
  scoringCriteria: { type: String, default: '' },
  fields: [FormFieldSchema],
  supportingDocuments: [SupportingDocumentSchema]
}, { _id: false });

const ActionPointSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  questions: [QuestionSchema]
}, { _id: false });

const ReformAreaSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionPoints: [ActionPointSchema]
}, { _id: false });

const FormSchemaSchema = new Schema({
  editionId: { type: Schema.Types.ObjectId, ref: 'Edition', required: true, unique: true },
  areas: [ReformAreaSchema]
}, { timestamps: true });

export const FormSchemaModel = mongoose.model<IFormSchema>('FormSchema', FormSchemaSchema);
