import mongoose, { Schema, Document } from 'mongoose';

export interface IGuidelinePdf extends Document {
  editionId: mongoose.Types.ObjectId;
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

const GuidelinePdfSchema = new Schema<IGuidelinePdf>(
  {
    editionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Edition',
      required: true,
      unique: true, // One guideline PDF per edition — new upload overwrites previous
    },
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

export const GuidelinePdf = mongoose.model<IGuidelinePdf>('GuidelinePdf', GuidelinePdfSchema);
