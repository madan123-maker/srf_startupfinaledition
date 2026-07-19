/**
 * Google Drive Service
 *
 * STATUS: DISABLED — credentials not yet configured.
 *
 * TODO: To enable Google Drive integration:
 *  1. Create a Google Cloud project and enable the Drive API.
 *  2. Create a Service Account and download the JSON key file.
 *  3. Place the key file at: backend/src/config/google-credentials.json
 *  4. Share your target Drive folder with the service account email.
 *  5. Set GOOGLE_DRIVE_ROOT_FOLDER_ID in your .env file.
 *  6. Set GOOGLE_DRIVE_ENABLED=true in your .env file.
 *  7. In submission.routes.ts, replace local-upload logic with uploadFileToDrive().
 */

import path from 'path';
import fs from 'fs';

const DRIVE_ENABLED = process.env.GOOGLE_DRIVE_ENABLED === 'true';
const KEYFILEPATH = path.join(__dirname, '../config/google-credentials.json');

// Lazy-load googleapis only when Drive is actually enabled & credentials exist
const getDrive = () => {
  if (!DRIVE_ENABLED) {
    throw new Error('Google Drive is not enabled. Set GOOGLE_DRIVE_ENABLED=true in .env to activate.');
  }
  if (!fs.existsSync(KEYFILEPATH)) {
    throw new Error(`Google credentials file not found at: ${KEYFILEPATH}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { google } = require('googleapis');
  const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive',
  ];
  const auth = new google.auth.GoogleAuth({ keyFile: KEYFILEPATH, scopes: SCOPES });
  return google.drive({ version: 'v3', auth });
};

/**
 * Gets a folder by name on Google Drive, or creates it if it doesn't exist.
 * @param folderName - Name of the folder
 * @param parentFolderId - Optional parent folder ID (defaults to GOOGLE_DRIVE_ROOT_FOLDER_ID)
 */
export const getOrCreateFolder = async (
  folderName: string,
  parentFolderId?: string
): Promise<string> => {
  const drive = getDrive();
  const rootParent = parentFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  let q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (rootParent) {
    q += ` and '${rootParent}' in parents`;
  }

  const res = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive' });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Folder not found — create it
  const fileMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (rootParent) {
    fileMetadata.parents = [rootParent];
  }

  const folderRes = await drive.files.create({ requestBody: fileMetadata, fields: 'id' });
  return folderRes.data.id!;
};

/**
 * Uploads a local file to Google Drive and returns its public view link.
 * @param localFilePath - Absolute path to the temp file on disk
 * @param folderId - Target Drive folder ID
 * @param originalName - Original filename (used as Drive file name)
 */
export const uploadFileToDrive = async (
  localFilePath: string,
  folderId: string,
  originalName: string
): Promise<{ fileId: string; webViewLink: string }> => {
  const drive = getDrive();

  const ext = path.extname(originalName).toLowerCase();
  let mimeType = 'application/octet-stream';
  if (ext === '.pdf') mimeType = 'application/pdf';
  else if (ext === '.doc' || ext === '.docx') mimeType = 'application/msword';
  else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.png') mimeType = 'image/png';

  const res = await drive.files.create({
    requestBody: { name: originalName, parents: [folderId] },
    media: { mimeType, body: fs.createReadStream(localFilePath) },
    fields: 'id, webViewLink',
  });

  // Make the file publicly readable
  await drive.permissions.create({
    fileId: res.data.id!,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  const fileRes = await drive.files.get({ fileId: res.data.id!, fields: 'webViewLink' });

  return {
    fileId: res.data.id!,
    webViewLink: fileRes.data.webViewLink || res.data.webViewLink!,
  };
};

/**
 * Returns whether Google Drive integration is currently active.
 * Use this as a guard before calling any Drive functions.
 */
export const isDriveEnabled = (): boolean => {
  return DRIVE_ENABLED && fs.existsSync(KEYFILEPATH);
};
