import mongoose, { Schema, Document } from 'mongoose';

export interface IStoredFile extends Document {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StoredFileSchema = new Schema<IStoredFile>(
  {
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const StoredFile = mongoose.model<IStoredFile>('StoredFile', StoredFileSchema);
