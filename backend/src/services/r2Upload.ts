import { PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import { getR2Client, getR2Config } from '../config/r2';

export interface MulterFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  filename?: string;
  path?: string;
}

export interface R2UploadOptions {
  folder?: 'applications' | 'guidelines' | 'profile' | 'editions' | 'documents' | string;
  uploadedBy?: string;
  applicationId?: string;
  editionId?: string;
}

export interface R2UploadResult {
  key: string;
  url: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

// Dangerous extensions blocked for security
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.vbs', '.php', '.js', '.py', '.pl',
  '.cgi', '.msi', '.dll', '.scr', '.pif', '.com', '.htm', '.html', '.jar', '.asp', '.aspx'
]);

// Maximum allowed upload size (50 MB)
const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Sanitizes original filenames to prevent Path Traversal, null bytes,
 * double extensions, and execution of dangerous files.
 */
export const sanitizeFilename = (rawName: string): { safeBaseName: string; cleanExt: string; cleanOriginalName: string } => {
  if (!rawName) {
    return { safeBaseName: 'unnamed_file', cleanExt: '.bin', cleanOriginalName: 'unnamed_file.bin' };
  }

  // 1. Remove null bytes and control characters
  let cleanName = rawName.replace(/[\x00-\x1F\x7F]/g, '').trim();

  // 2. Prevent path traversal by taking basename only
  cleanName = path.basename(cleanName);

  // 3. Extract extension and lowercase it
  const ext = path.extname(cleanName).toLowerCase();

  // 4. Validate extension against blocked extensions list
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    throw new Error(`Upload rejected: File extension "${ext}" is not permitted for security reasons.`);
  }

  // 5. Remove non-alphanumeric characters from base name
  const baseName = path.basename(cleanName, ext);
  let safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeBaseName) {
    safeBaseName = 'file';
  }

  const cleanExt = ext || '.bin';
  const cleanOriginalName = `${safeBaseName}${cleanExt}`;

  return { safeBaseName, cleanExt, cleanOriginalName };
};

/**
 * Determines appropriate Cache-Control header based on MIME type and extension.
 */
export const getCacheControlHeader = (mimeType: string, ext: string): string => {
  if (mimeType.startsWith('image/')) {
    return 'public, max-age=31536000'; // 1 year cache for static images
  }
  if (mimeType === 'application/pdf' || ext === '.pdf') {
    return 'public, max-age=86400'; // 1 day cache for PDFs
  }
  return 'no-cache'; // Frequently updated compliance documents or data files
};

/**
 * Robustly resolves MIME type when browser provides generic application/octet-stream.
 */
export const resolveMimeType = (providedMime: string, ext: string): string => {
  if (providedMime && providedMime !== 'application/octet-stream') {
    return providedMime;
  }
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
  };

  return mimeMap[ext] || providedMime || 'application/octet-stream';
};

/**
 * Hardened Upload Service for Cloudflare R2.
 */
export const uploadToR2 = async (
  file: MulterFile,
  options: R2UploadOptions | string = 'uploads'
): Promise<R2UploadResult> => {
  // Normalize options
  const opts: R2UploadOptions = typeof options === 'string' ? { folder: options } : options;
  const folder = opts.folder || 'uploads';

  // 1. Validate File Existence & Size
  if (!file || !file.buffer) {
    throw new Error('Invalid upload payload: File buffer is missing or empty.');
  }

  const size = file.size || file.buffer.length;
  if (size === 0) {
    throw new Error('Upload rejected: Empty files (0 bytes) are not permitted.');
  }

  if (size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(`Upload rejected: File size (${(size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum limit of 50 MB.`);
  }

  // 2. Sanitize Filename & Security Check
  const rawOriginalName = file.originalname || 'file';
  const { safeBaseName, cleanExt, cleanOriginalName } = sanitizeFilename(rawOriginalName);

  // 3. Resolve Content-Type & Cache-Control
  const mimeType = resolveMimeType(file.mimetype, cleanExt);
  const cacheControl = getCacheControlHeader(mimeType, cleanExt);

  // 4. Generate Unique Key (Ensures old files are NEVER overwritten)
  const config = getR2Config();
  if (!config.bucketName) {
    throw new Error('R2_BUCKET_NAME is not defined in environment variables.');
  }

  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  const fileName = `${timestamp}-${uuid}-${safeBaseName}${cleanExt}`;
  const key = `${folder}/${fileName}`;

  // 5. Construct S3 Metadata (No secrets included)
  const metadata: Record<string, string> = {
    uploadedat: new Date().toISOString(),
    originalfilename: encodeURIComponent(cleanOriginalName),
  };
  if (opts.uploadedBy) metadata.uploadedby = String(opts.uploadedBy);
  if (opts.applicationId) metadata.applicationid = String(opts.applicationId);
  if (opts.editionId) metadata.editionid = String(opts.editionId);

  console.log(`[R2 UPLOAD START] Bucket: "${config.bucketName}" | Key: "${key}" | Size: ${size} bytes | Folder: "${folder}"`);
  const startTime = Date.now();

  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: mimeType,
    ContentLength: size,
    CacheControl: cacheControl,
    Metadata: metadata,
  });

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      await client.send(command);
      const duration = Date.now() - startTime;
      const uploadedAt = new Date();

      const publicUrl = config.publicUrl;
      const url = publicUrl
        ? `${publicUrl}/${key}`
        : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;

      console.log(`[R2 UPLOAD SUCCESS] Key: "${key}" | Duration: ${duration}ms | Public URL: "${url}"`);

      return {
        key,
        url,
        originalName: cleanOriginalName,
        fileName,
        mimeType,
        size,
        uploadedAt,
      };
    } catch (error: any) {
      const isLastAttempt = attempts >= maxAttempts;
      const duration = Date.now() - startTime;
      const safeError = error.name || error.message || 'Unknown R2 Error';

      console.error(`[R2 UPLOAD FAILURE] Attempt ${attempts}/${maxAttempts} failed for Key: "${key}" after ${duration}ms. Error: ${safeError}`);

      if (isLastAttempt) {
        throw new Error(`Failed to upload file "${cleanOriginalName}" to Cloudflare R2: ${safeError}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Failed to upload file "${cleanOriginalName}" to Cloudflare R2 after ${maxAttempts} attempts.`);
};
