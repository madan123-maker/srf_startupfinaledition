export const MAX_FILE_SIZE_MB = 3;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

export interface ClientValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateClientFile = (file: File): ClientValidationResult => {
  if (!file) {
    return { isValid: false, error: 'No file selected.' };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'Empty files (0 bytes) are not allowed.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: `Maximum allowed file size is ${MAX_FILE_SIZE_MB} MB.` };
  }

  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      error: 'Unsupported file type. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG.',
    };
  }

  return { isValid: true };
};
