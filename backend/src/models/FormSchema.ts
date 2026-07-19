import mongoose, { Schema, Document } from 'mongoose';

export interface IFormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

export interface IQuestion {
  id: string;
  questionNumber: string;
  weightage: number;
  title: string;
  requiredDocuments: string;
  guidelinesRef: string;
  scoringCriteria: string;
  fields: IFormField[];
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

const QuestionSchema = new Schema({
  id: { type: String, required: true },
  questionNumber: { type: String, required: true },
  weightage: { type: Number, default: 0 },
  title: { type: String, required: true },
  requiredDocuments: { type: String, default: '' },
  guidelinesRef: { type: String, default: '' },
  scoringCriteria: { type: String, default: '' },
  fields: [FormFieldSchema]
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
