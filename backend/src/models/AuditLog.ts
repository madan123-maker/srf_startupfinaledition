import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId: string;
  details?: any;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      trim: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    userRole: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
