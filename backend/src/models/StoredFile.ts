import mongoose, { Schema, Document } from 'mongoose';

export interface IStoredFile extends Document {
  filename?: string;
  contentType?: string;
  size: number;
  data?: Buffer;
  url?: string;
  key?: string;
  storageProvider?: 'mongo' | 'local' | 'r2';
  originalName?: string;
  fileName?: string;
  mimeType?: string;
  uploadedAt?: Date;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StoredFileSchema = new Schema<IStoredFile>(
  {
    filename: { type: String },
    contentType: { type: String },
    size: { type: Number, required: true },
    data: { type: Buffer, required: false },
    url: { type: String },
    key: { type: String },
    storageProvider: { type: String, enum: ['mongo', 'local', 'r2'], default: 'r2' },
    originalName: { type: String },
    fileName: { type: String },
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const StoredFile = mongoose.model<IStoredFile>('StoredFile', StoredFileSchema);
