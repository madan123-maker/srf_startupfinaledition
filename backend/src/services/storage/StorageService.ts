import path from 'path';
import { STORAGE_FOLDERS } from '../../constants/storage.constants';
import { StoredFile } from '../../models/StoredFile';
import { CloudflareR2StorageProvider } from './CloudflareR2StorageProvider';
import { StorageProvider, StorageUploadResult, UploadFileOptions } from './StorageProvider';

export class StorageService {
  private static provider: StorageProvider = new CloudflareR2StorageProvider();

  public static setProvider(provider: StorageProvider): void {
    StorageService.provider = provider;
  }

  /**
   * Generates deterministic keys based on stable document identifiers.
   * R2 object keys NEVER depend on UI labels or question names.
   */
  public static resolveKey(options: UploadFileOptions, originalName: string): string {
    const cleanExt = (path.extname(originalName || '').toLowerCase()) || '.bin';
    const baseName = path.basename(originalName || 'file', cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_') || 'file';

    const folder = options.folder || STORAGE_FOLDERS.STORED_FILES;

    if (folder === STORAGE_FOLDERS.APPLICATIONS) {
      const appId = options.applicationId || options.userId || 'general';
      const qId = options.questionId || 'uploads';
      const docId = options.documentId || baseName;
      return `${STORAGE_FOLDERS.APPLICATIONS}/${appId}/${qId}/${docId}${cleanExt}`;
    }

    if (folder === STORAGE_FOLDERS.GUIDELINES) {
      const edId = options.editionId || 'default';
      return `${STORAGE_FOLDERS.GUIDELINES}/${edId}/guideline${cleanExt}`;
    }

    if (folder === STORAGE_FOLDERS.PROFILE) {
      const uId = options.userId || 'user';
      return `${STORAGE_FOLDERS.PROFILE}/${uId}/avatar${cleanExt}`;
    }

    if (folder === STORAGE_FOLDERS.REPORTS) {
      const edId = options.editionId || 'general';
      return `${STORAGE_FOLDERS.REPORTS}/${edId}/${baseName}${cleanExt}`;
    }

    // Default: stored-files
    const ctxId = options.documentId || options.userId || baseName;
    return `${STORAGE_FOLDERS.STORED_FILES}/${ctxId}${cleanExt}`;
  }

  /**
   * Atomic Upload Process:
   * 1. Resolves deterministic key.
   * 2. Uploads payload to R2 (overwriting existing file at key if same extension).
   * 3. Atomically saves / updates MongoDB StoredFile record.
   */
  public static async upload(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    options: UploadFileOptions
  ): Promise<StorageUploadResult> {
    const key = options.customKey || StorageService.resolveKey(options, file.originalname);

    // Step 1: Upload to Cloudflare R2
    const uploadResult = await StorageService.provider.upload(file, key, options);

    // Step 2: Verify upload result exists
    if (!uploadResult || !uploadResult.url) {
      throw new Error(`Upload verification failed for file "${file.originalname}"`);
    }

    // Step 3: Atomic MongoDB metadata recording
    try {
      const existingFilter = options.customKey
        ? { key: options.customKey }
        : {
            originalName: uploadResult.originalName,
            uploadedBy: options.uploadedBy ? options.uploadedBy : { $exists: true },
          };

      await StoredFile.findOneAndUpdate(
        existingFilter,
        {
          originalName: uploadResult.originalName,
          fileName: uploadResult.fileName,
          url: uploadResult.url,
          key: uploadResult.key,
          mimeType: uploadResult.mimeType,
          size: uploadResult.size,
          uploadedAt: uploadResult.uploadedAt,
          storageProvider: 'r2',
          filename: uploadResult.originalName,
          contentType: uploadResult.mimeType,
          uploadedBy: options.uploadedBy,
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (dbError: any) {
      console.error(`[STORAGE SERVICE] MongoDB metadata recording failed for Key: "${key}". Error: ${dbError.message}`);
      // R2 object remains safely archived; throw clean error to client
      throw new Error(`Failed to record database metadata for uploaded file: ${dbError.message}`);
    }

    return uploadResult;
  }

  public static getPublicUrl(key: string): string {
    return StorageService.provider.getPublicUrl(key);
  }

  /**
   * Calculates storage statistics across Cloudflare R2 and legacy databases.
   */
  public static async getStorageStats(): Promise<{
    r2Files: number;
    r2TotalSizeBytes: number;
    legacyMongoFiles: number;
    legacyLocalFiles: number;
  }> {
    const r2Files = await StoredFile.countDocuments({ storageProvider: 'r2' });
    const mongoFiles = await StoredFile.countDocuments({ data: { $exists: true, $ne: null } });

    const r2Agg = await StoredFile.aggregate([
      { $match: { storageProvider: 'r2' } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } },
    ]);

    const r2TotalSizeBytes = r2Agg.length > 0 ? r2Agg[0].totalSize : 0;

    return {
      r2Files,
      r2TotalSizeBytes,
      legacyMongoFiles: mongoFiles,
      legacyLocalFiles: 0,
    };
  }
}
