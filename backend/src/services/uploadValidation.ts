import path from 'path';
import { UPLOAD_LIMITS } from '../constants/upload.constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  cleanOriginalName?: string;
}

export const validateUploadFile = (file: {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
}): ValidationResult => {
  // 1. Validate file existence & empty check
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  const size = file.size || (file.buffer ? file.buffer.length : 0);
  if (size === 0) {
    return { isValid: false, error: 'Empty files (0 bytes) are not allowed.' };
  }

  // 2. Validate maximum file size (Strict 3 MB limit)
  if (size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Maximum allowed file size is ${UPLOAD_LIMITS.MAX_UPLOAD_SIZE_MB} MB.`,
    };
  }

  // 3. Extract & sanitize filename and extension
  let rawName = file.originalname || 'file';
  let cleanName = rawName.replace(/[\x00-\x1F\x7F]/g, '').trim();
  cleanName = path.basename(cleanName);
  const ext = path.extname(cleanName).toLowerCase();

  // 4. Validate extension against allowed list
  const isExtensionAllowed = UPLOAD_LIMITS.ALLOWED_EXTENSIONS.includes(ext as any);
  if (!isExtensionAllowed) {
    return {
      isValid: false,
      error: 'Unsupported file type. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG.',
    };
  }

  // 5. Validate MIME type
  const providedMime = (file.mimetype || '').toLowerCase();
  const isMimeAllowed =
    providedMime === 'application/octet-stream' ||
    UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(providedMime as any);

  if (!isMimeAllowed) {
    return {
      isValid: false,
      error: 'Unsupported file type. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG.',
    };
  }

  // 6. Return clean sanitized original filename
  const baseName = path.basename(cleanName, ext).replace(/[^a-zA-Z0-9_-]/g, '_') || 'file';
  const cleanOriginalName = `${baseName}${ext}`;

  return {
    isValid: true,
    cleanOriginalName,
  };
};
