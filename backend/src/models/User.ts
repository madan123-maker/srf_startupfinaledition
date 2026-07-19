import mongoose, { Schema, Document } from 'mongoose';

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  username?: string;
  organization?: string;
  district?: string;
  role: Role;
  state?: string;
  isActive: boolean;
  otp?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    organization: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.USER,
      required: true,
    },
    state: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
