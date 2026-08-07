import { getR2Config } from '../config/r2';

/**
 * Returns a URL for accessing an object in Cloudflare R2.
 * Uses R2_PUBLIC_URL if set, or constructs standard Cloudflare R2 endpoint URL.
 */
export const getR2Url = async (key: string): Promise<string> => {
  if (!key) return '';

  const config = getR2Config();

  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`;
  }

  if (config.accountId && config.bucketName) {
    return `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;
  }

  return key;
};
