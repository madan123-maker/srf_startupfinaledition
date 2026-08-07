import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// Ensure dotenv is loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export const getR2Config = (): R2Config => {
  const accountId = process.env.R2_ACCOUNT_ID || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  const bucketName = process.env.R2_BUCKET_NAME || '';
  const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  };
};

export const validateR2ConfigOnStartup = (): void => {
  const config = getR2Config();
  const missing: string[] = [];

  if (!config.accountId) missing.push('R2_ACCOUNT_ID');
  if (!config.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!config.bucketName) missing.push('R2_BUCKET_NAME');
  if (!config.publicUrl) missing.push('R2_PUBLIC_URL');

  if (missing.length > 0) {
    const errorMsg = `[R2 FATAL STARTUP ERROR] Missing Cloudflare R2 environment variables: ${missing.join(', ')}. Server startup failed due to incomplete storage configuration.`;
    console.error(errorMsg);
    // Print warning or throw if in strict production mode
    if (process.env.NODE_ENV === 'production' || process.env.STRICT_R2_CHECK === 'true') {
      throw new Error(errorMsg);
    }
  } else {
    console.log(`[R2 CONFIG SUCCESS] Cloudflare R2 environment variables validated for bucket "${config.bucketName}".`);
  }
};

let r2ClientInstance: S3Client | null = null;

export const getR2Client = (): S3Client => {
  if (r2ClientInstance) {
    return r2ClientInstance;
  }

  const config = getR2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Cloudflare R2 is not configured properly. Missing required environment variables.');
  }

  r2ClientInstance = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Set request timeout to prevent connection hangs
    requestHandler: {
      connectionTimeout: 5000,
      requestTimeout: 15000,
    } as any,
  });

  return r2ClientInstance;
};

export const checkR2Health = async (): Promise<{ status: string; bucket: string; storage: string; details?: string }> => {
  const config = getR2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    return {
      status: 'error',
      bucket: config.bucketName || 'unconfigured',
      storage: 'cloudflare-r2',
      details: 'Missing Cloudflare R2 environment credentials',
    };
  }

  try {
    const client = getR2Client();
    await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
    return {
      status: 'ok',
      bucket: config.bucketName,
      storage: 'cloudflare-r2',
    };
  } catch (error: any) {
    const safeError = error.name || error.message || 'Unknown S3 error';
    return {
      status: 'error',
      bucket: config.bucketName,
      storage: 'cloudflare-r2',
      details: `R2 Bucket Connectivity Failed: ${safeError}`,
    };
  }
};
