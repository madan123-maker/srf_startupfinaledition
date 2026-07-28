import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { StoredFile } from '../models/StoredFile';
import { Submission } from '../models/Submission';

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
};

async function migrateFilesToDB() {
  console.log('--- Starting Migration of Local Host Files to MongoDB Database ---');
  await mongoose.connect(process.env.DATABASE_URL as string);
  console.log('Connected to MongoDB database.');

  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads directory does not exist.');
    process.exit(0);
  }

  const files = fs.readdirSync(uploadsDir);
  const fileToIdMap = new Map<string, string>();

  let migratedCount = 0;

  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) continue;

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(filePath);

    // Check if already migrated
    let storedFile = await StoredFile.findOne({ filename });
    if (!storedFile) {
      storedFile = await StoredFile.create({
        filename,
        contentType,
        size: stat.size,
        data: buffer,
      });
      migratedCount++;
      console.log(`[SAVED TO DB] ${filename} -> ID: ${storedFile._id}`);
    } else {
      console.log(`[ALREADY IN DB] ${filename} -> ID: ${storedFile._id}`);
    }

    fileToIdMap.set(filename, storedFile._id.toString());
  }

  console.log(`\nSuccessfully stored ${migratedCount} new files into MongoDB 'storedfiles' table.`);
  console.log('Now updating file URLs in Submission records...');

  const submissions = await Submission.find();
  let updatedSubmissionsCount = 0;

  for (const sub of submissions) {
    let modified = false;

    if (sub.responses && sub.responses.length > 0) {
      for (const q of sub.responses) {
        // Field responses
        if (q.fieldResponses) {
          for (const f of q.fieldResponses) {
            if (f.fileUrl) {
              for (const [filename, newId] of fileToIdMap.entries()) {
                if (f.fileUrl.endsWith(filename) || f.fileUrl.includes(`/uploads/${filename}`)) {
                  f.fileUrl = `/uploads/${newId}`;
                  modified = true;
                }
              }
            }
            if (f.history) {
              for (const hist of f.history) {
                if (hist.fileUrl) {
                  for (const [filename, newId] of fileToIdMap.entries()) {
                    if (hist.fileUrl.endsWith(filename) || hist.fileUrl.includes(`/uploads/${filename}`)) {
                      hist.fileUrl = `/uploads/${newId}`;
                      modified = true;
                    }
                  }
                }
              }
            }
          }
        }

        // Additional files
        if (q.additionalFiles) {
          for (const af of q.additionalFiles) {
            if (af.fileUrl) {
              for (const [filename, newId] of fileToIdMap.entries()) {
                if (af.fileUrl.endsWith(filename) || af.fileUrl.includes(`/uploads/${filename}`)) {
                  af.fileUrl = `/uploads/${newId}`;
                  modified = true;
                }
              }
            }
            if (af.history) {
              for (const hist of af.history) {
                if (hist.fileUrl) {
                  for (const [filename, newId] of fileToIdMap.entries()) {
                    if (hist.fileUrl.endsWith(filename) || hist.fileUrl.includes(`/uploads/${filename}`)) {
                      hist.fileUrl = `/uploads/${newId}`;
                      modified = true;
                    }
                  }
                }
              }
            }
          }
        }

        // Supporting document responses
        if (q.supportingDocumentResponses) {
          for (const doc of q.supportingDocumentResponses) {
            if (doc.files) {
              for (const fileItem of doc.files) {
                if (fileItem.fileUrl) {
                  for (const [filename, newId] of fileToIdMap.entries()) {
                    if (fileItem.fileUrl.endsWith(filename) || fileItem.fileUrl.includes(`/uploads/${filename}`)) {
                      fileItem.fileUrl = `/uploads/${newId}`;
                      modified = true;
                    }
                  }
                }
                if (fileItem.history) {
                  for (const hist of fileItem.history) {
                    if (hist.fileUrl) {
                      for (const [filename, newId] of fileToIdMap.entries()) {
                        if (hist.fileUrl.endsWith(filename) || hist.fileUrl.includes(`/uploads/${filename}`)) {
                          hist.fileUrl = `/uploads/${newId}`;
                          modified = true;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (modified) {
      sub.markModified('responses');
      await sub.save();
      updatedSubmissionsCount++;
    }
  }

  console.log(`\nUpdated ${updatedSubmissionsCount} submission records with new MongoDB database file URLs.`);
  console.log('--- Migration Completed Successfully ---');
  await mongoose.disconnect();
}

migrateFilesToDB().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
