import mongoose, { Schema, Document } from 'mongoose';

export enum EditionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface IEdition extends Document {
  name: string;
  version: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: EditionStatus;
  publishedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EditionSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    version: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(EditionStatus),
      default: EditionStatus.DRAFT,
    },
    publishedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Edition = mongoose.model<IEdition>('Edition', EditionSchema);
