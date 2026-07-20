import mongoose, { Schema, Document } from 'mongoose';

export interface IEvaluationConfiguration extends Document {
  editionId: mongoose.Types.ObjectId;
  scoringEngine: 'Absolute' | 'Relative' | 'Binary' | 'Percentage' | 'Manual' | 'Formula' | 'Auto Calculated';
  roundingMethod: 'Round' | 'Ceil' | 'Floor' | 'None';
  allowDecimal: boolean;
  minimumScore: number;
  maximumScore: number;
  passPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationConfigurationSchema = new Schema({
  editionId: { type: Schema.Types.ObjectId, ref: 'Edition', required: true, unique: true },
  scoringEngine: { 
    type: String, 
    enum: ['Absolute', 'Relative', 'Binary', 'Percentage', 'Manual', 'Formula', 'Auto Calculated'],
    default: 'Manual'
  },
  roundingMethod: {
    type: String,
    enum: ['Round', 'Ceil', 'Floor', 'None'],
    default: 'None'
  },
  allowDecimal: { type: Boolean, default: true },
  minimumScore: { type: Number, default: 0 },
  maximumScore: { type: Number, default: 100 },
  passPercentage: { type: Number, default: 50 },
}, { timestamps: true });

export const EvaluationConfiguration = mongoose.model<IEvaluationConfiguration>('EvaluationConfiguration', EvaluationConfigurationSchema);
