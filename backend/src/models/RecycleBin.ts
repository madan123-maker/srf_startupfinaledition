import mongoose, { Schema, Document } from 'mongoose';

export enum EntityType {
  EDITION = 'Edition',
  ASSIGNMENT = 'Assignment',
  APPLICATION = 'Application',
  USER = 'User',
  DEPARTMENT = 'Department',
  REFORM_AREA = 'Reform Area',
  ACTION_POINT = 'Action Point',
}

export interface IRecycleBin extends Document {
  originalId: string;
  entityType: EntityType;
  entityName: string; // for searching by item name
  data: any;
  deletedBy: mongoose.Types.ObjectId;
  deletedAt: Date;
}

const RecycleBinSchema: Schema = new Schema(
  {
    originalId: { type: String, required: true },
    entityType: { type: String, enum: Object.values(EntityType), required: true },
    entityName: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'deletedAt', updatedAt: false } }
);

// TTL Index: automatically delete document 30 days after `deletedAt`
RecycleBinSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
RecycleBinSchema.index({ entityType: 1 });
RecycleBinSchema.index({ deletedBy: 1 });

export const RecycleBin = mongoose.model<IRecycleBin>('RecycleBin', RecycleBinSchema);
