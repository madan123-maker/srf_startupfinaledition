import mongoose, { Schema, Document } from 'mongoose';

export interface IGuidelinePdf extends Document {
  editionId: mongoose.Types.ObjectId;
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
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
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const GuidelinePdf = mongoose.model<IGuidelinePdf>('GuidelinePdf', GuidelinePdfSchema);
