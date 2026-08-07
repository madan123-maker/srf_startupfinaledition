export interface UploadFileOptions {
  folder: string;
  applicationId?: string;
  questionId?: string;
  documentId?: string;
  editionId?: string;
  userId?: string;
  uploadedBy?: string;
  customKey?: string;
}

export interface StorageUploadResult {
  key: string;
  url: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  storageProvider: 'r2' | 'mongo' | 'local';
}

export interface StorageProvider {
  upload(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    key: string,
    options?: UploadFileOptions
  ): Promise<StorageUploadResult>;
  getPublicUrl(key: string): string;
  checkHealth(): Promise<{ status: string; details?: string }>;
}
