import { PutObjectCommand, GetObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2Config, getPublicR2Url } from '../../config/r2';
import { StorageProvider, StorageUploadResult, UploadFileOptions } from './StorageProvider';

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.vbs', '.php', '.js', '.py', '.pl',
  '.cgi', '.msi', '.dll', '.scr', '.pif', '.com', '.htm', '.html', '.jar', '.asp', '.aspx'
]);

import { validateUploadFile } from '../uploadValidation';

export class CloudflareR2StorageProvider implements StorageProvider {
  private sanitizeFilename(rawName: string): { safeBaseName: string; cleanExt: string; cleanOriginalName: string } {
    if (!rawName) {
      return { safeBaseName: 'unnamed', cleanExt: '.bin', cleanOriginalName: 'unnamed.bin' };
    }

    const validation = validateUploadFile({ originalname: rawName, mimetype: 'application/pdf', size: 100 });
    if (!validation.isValid) {
      throw new Error(validation.error || 'Upload validation failed.');
    }

    const path = require('path');
    let cleanName = rawName.replace(/[\x00-\x1F\x7F]/g, '').trim();
    cleanName = path.basename(cleanName);
    const ext = path.extname(cleanName).toLowerCase();
    const baseName = path.basename(cleanName, ext);
    let safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!safeBaseName) safeBaseName = 'file';

    const cleanExt = ext || '.bin';
    return { safeBaseName, cleanExt, cleanOriginalName: `${safeBaseName}${cleanExt}` };
  }

  private getCacheControlHeader(mimeType: string, ext: string): string {
    if (mimeType.startsWith('image/')) return 'public, max-age=31536000';
    if (mimeType === 'application/pdf' || ext === '.pdf') return 'public, max-age=86400';
    return 'no-cache';
  }

  public getPublicUrl(key: string): string {
    return getPublicR2Url(key);
  }

  public async getObject(key: string): Promise<{ buffer: Buffer; contentType?: string; contentLength?: number } | null> {
    if (!key) return null;
    const config = getR2Config();
    if (!config.bucketName || !config.accountId || !config.accessKeyId || !config.secretAccessKey) {
      return null;
    }

    try {
      const client = getR2Client();
      const cleanKey = key.replace(/^\//, '');
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: cleanKey,
      });

      const response = await client.send(command);
      if (!response.Body) return null;

      let buffer: Buffer;
      if (typeof (response.Body as any).transformToByteArray === 'function') {
        const byteArray = await (response.Body as any).transformToByteArray();
        buffer = Buffer.from(byteArray);
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body as any) {
          chunks.push(Buffer.from(chunk));
        }
        buffer = Buffer.concat(chunks);
      }

      return {
        buffer,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (err: any) {
      console.error(`[R2 GET OBJECT ERROR] Key: "${key}". Error: ${err.name || err.message}`);
      return null;
    }
  }

  public async upload(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    key: string,
    options?: UploadFileOptions
  ): Promise<StorageUploadResult> {
    // Validate file BEFORE executing R2 upload
    const validation = validateUploadFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Upload validation failed.');
    }

    const size = file.size || file.buffer.length;
    const { cleanExt, cleanOriginalName } = this.sanitizeFilename(file.originalname);
    const mimeType = file.mimetype || 'application/octet-stream';
    const cacheControl = this.getCacheControlHeader(mimeType, cleanExt);
    const config = getR2Config();

    if (!config.bucketName) {
      throw new Error('R2_BUCKET_NAME is not defined in environment variables.');
    }

    const metadata: Record<string, string> = {
      uploadedat: new Date().toISOString(),
      originalfilename: encodeURIComponent(cleanOriginalName),
    };
    if (options?.uploadedBy) metadata.uploadedby = String(options.uploadedBy);
    if (options?.applicationId) metadata.applicationid = String(options.applicationId);
    if (options?.editionId) metadata.editionid = String(options.editionId);

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

    console.log(`[R2 UPLOAD START] Key: "${key}" | Size: ${size} bytes`);
    const startTime = Date.now();

    await client.send(command);
    const duration = Date.now() - startTime;
    const url = this.getPublicUrl(key);

    console.log(`[R2 UPLOAD SUCCESS] Key: "${key}" | Duration: ${duration}ms`);

    return {
      key,
      url,
      originalName: cleanOriginalName,
      fileName: key.split('/').pop() || cleanOriginalName,
      mimeType,
      size,
      uploadedAt: new Date(),
      storageProvider: 'r2',
    };
  }

  public async checkHealth(): Promise<{ status: string; details?: string }> {
    const config = getR2Config();
    try {
      const client = getR2Client();
      await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
      return { status: 'ok' };
    } catch (error: any) {
      return { status: 'error', details: error.message };
    }
  }
}

