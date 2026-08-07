export const STORAGE_FOLDERS = {
  APPLICATIONS: 'applications',
  GUIDELINES: 'guidelines',
  PROFILE: 'profile',
  REPORTS: 'reports',
  STORED_FILES: 'stored-files',
} as const;

export type StorageFolder = typeof STORAGE_FOLDERS[keyof typeof STORAGE_FOLDERS];
