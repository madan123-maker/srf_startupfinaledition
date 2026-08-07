import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const maxMb = Number(process.env.MAX_UPLOAD_SIZE_MB) || 3;

export const UPLOAD_LIMITS = {
  MAX_UPLOAD_SIZE_MB: maxMb,
  MAX_FILE_SIZE_BYTES: maxMb * 1024 * 1024, // 3 MB = 3,145,728 bytes
  ALLOWED_EXTENSIONS: [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.jpg',
    '.jpeg',
    '.png',
  ] as const,
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/pjpeg',
  ] as const,
};
