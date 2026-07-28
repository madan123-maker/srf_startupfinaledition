import mongoose from 'mongoose';
import { StoredFile } from '../models/StoredFile';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await StoredFile.createCollection().catch((err) => console.log('StoredFile collection ready:', err.message));
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};
