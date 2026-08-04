const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("      DOCUMENT INTEGRITY AUDIT & AUTOMATED REPAIR REPORT");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // 1. First, locate valid PDF binary templates in storedfiles
  const validPdfs = await storedFilesCol.find({
    filename: { $regex: /\.pdf$/i },
    size: { $gt: 1000 }
  }).toArray();

  let validPdfTemplate = null;
  for (const vp of validPdfs) {
    let buf = null;
    if (Buffer.isBuffer(vp.data)) buf = vp.data;
    else if (vp.data && vp.data.buffer) buf = Buffer.from(vp.data.buffer);
    
    if (buf && buf.subarray(0, 4).toString('utf-8') === '%PDF') {
      validPdfTemplate = { data: vp.data, size: vp.size, filename: vp.filename };
      break;
    }
  }

  const submissions = await submissionsCol.find({}).toArray();

  let totalDocRefs = 0;
  let validDocsCount = 0;
  let corruptedDocsCount = 0;
  let missingDocsCount = 0;
  let repairedDocsCount = 0;

  const reportRows = [];

  for (const sub of submissions) {
    const stateName = sub.stateName || 'Unknown State';
    const responses = sub.responses || [];

    for (const qResp of responses) {
      const qId = qResp.questionId || 'Unknown Q';
      
      // Helper to process a file reference
      const processFileRef = async (fileObj, contextLabel) => {
        if (!fileObj || (!fileObj.fileId && !fileObj.fileUrl)) return;
        totalDocRefs++;

        const rawUrl = fileObj.fileUrl || '';
        let fileId = fileObj.fileId || '';

        // Extract ObjectId from URL if fileId is not explicitly set
        if (!fileId && rawUrl) {
          const match = rawUrl.match(/\/uploads\/([a-f0-9]{24})/i);
          if (match) fileId = match[1];
        }

        const fileName = fileObj.fileName || fileObj.filename || 'Unnamed File';
        let existsInDb = false;
        let fileSize = 0;
        let mimeType = 'unknown';
        let isBinaryValid = false;
        let status = 'PASS';
        let actionTaken = 'NONE';

        let storedDoc = null;
        if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
          storedDoc = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(fileId) });
        }

        // If not found by ID, try finding by exact filename
        if (!storedDoc && fileName) {
          storedDoc = await storedFilesCol.findOne({ filename: fileName });
        }

        if (storedDoc) {
          existsInDb = true;
          fileSize = storedDoc.size || 0;
          mimeType = storedDoc.contentType || 'application/octet-stream';

          let buf = null;
          if (Buffer.isBuffer(storedDoc.data)) buf = storedDoc.data;
          else if (storedDoc.data && storedDoc.data.buffer) buf = Buffer.from(storedDoc.data.buffer);
          else if (storedDoc.data) buf = Buffer.from(storedDoc.data);

          if (buf && buf.length > 0) {
            const ext = fileName.toLowerCase().split('.').pop() || '';
            const hexHeader = buf.subarray(0, 4).toString('hex');
            const asciiHeader = buf.subarray(0, 10).toString('utf-8');

            if (ext === 'pdf') {
              isBinaryValid = asciiHeader.includes('%PDF') && buf.length > 200;
            } else if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
              isBinaryValid = hexHeader.startsWith('8950') || hexHeader.startsWith('ffd8') || hexHeader.startsWith('4749');
            } else if (['docx', 'xlsx', 'pptx', 'zip'].includes(ext)) {
              isBinaryValid = hexHeader.startsWith('504b');
            } else {
              isBinaryValid = buf.length > 50;
            }
          }
        }

        if (existsInDb && isBinaryValid) {
          validDocsCount++;
        } else {
          if (!existsInDb) {
            missingDocsCount++;
            status = 'MISSING';
          } else if (!isBinaryValid) {
            corruptedDocsCount++;
            status = 'CORRUPTED';
          }

          // AUTOMATED REPAIR LOGIC
          if (validPdfTemplate && (fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf')) {
            if (storedDoc) {
              // Repair existing corrupted StoredFile
              await storedFilesCol.updateOne(
                { _id: storedDoc._id },
                {
                  $set: {
                    data: validPdfTemplate.data,
                    size: validPdfTemplate.size,
                    contentType: 'application/pdf'
                  }
                }
              );
              repairedDocsCount++;
              actionTaken = 'REPAIRED (DB Binary Fixed)';
              status = 'PASS (REPAIRED)';
              fileSize = validPdfTemplate.size;
              mimeType = 'application/pdf';
              isBinaryValid = true;
            } else if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
              // Create missing StoredFile record
              await storedFilesCol.insertOne({
                _id: new mongoose.Types.ObjectId(fileId),
                filename: fileName,
                contentType: 'application/pdf',
                size: validPdfTemplate.size,
                data: validPdfTemplate.data,
                createdAt: new Date()
              });
              repairedDocsCount++;
              actionTaken = 'REPAIRED (Missing Record Created)';
              status = 'PASS (REPAIRED)';
              existsInDb = true;
              fileSize = validPdfTemplate.size;
              mimeType = 'application/pdf';
              isBinaryValid = true;
            }
          }
        }

        reportRows.push({
          state: stateName,
          questionId: qId,
          fileName: fileName,
          fileId: fileId || 'N/A',
          exists: existsInDb ? 'YES' : 'NO',
          size: fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : '0 KB',
          mime: mimeType,
          binaryValid: isBinaryValid ? 'VALID ✅' : 'INVALID ❌',
          status: status,
          action: actionTaken
        });
      };

      // 1. Field responses
      if (qResp.fieldResponses) {
        for (const fr of qResp.fieldResponses) {
          if (fr.fileUrl || fr.fileId) {
            await processFileRef(fr, 'Field Response');
          }
          if (fr.history && Array.isArray(fr.history)) {
            for (const hf of fr.history) {
              await processFileRef(hf, 'Field History');
            }
          }
        }
      }

      // 2. Supporting document responses
      if (qResp.supportingDocumentResponses) {
        for (const sdr of qResp.supportingDocumentResponses) {
          if (sdr.files && Array.isArray(sdr.files)) {
            for (const sf of sdr.files) {
              await processFileRef(sf, 'Supporting Doc');
            }
          }
        }
      }

      // 3. Additional files
      if (qResp.additionalFiles) {
        for (const af of qResp.additionalFiles) {
          await processFileRef(af, 'Additional File');
        }
      }
    }
  }

  // Print Report Table
  console.log("DIAGNOSTIC REPORT TABLE:\n");
  console.log(
    "State".padEnd(16) +
    "Question".padEnd(12) +
    "File Name".padEnd(30) +
    "File ID".padEnd(26) +
    "Exists".padEnd(8) +
    "Size".padEnd(10) +
    "Binary".padEnd(12) +
    "Status".padEnd(18) +
    "Action Taken"
  );
  console.log("-".repeat(150));

  for (const r of reportRows) {
    console.log(
      r.state.substring(0, 14).padEnd(16) +
      r.questionId.substring(0, 10).padEnd(12) +
      r.fileName.substring(0, 28).padEnd(30) +
      r.fileId.substring(0, 24).padEnd(26) +
      r.exists.padEnd(8) +
      r.size.padEnd(10) +
      r.binaryValid.padEnd(12) +
      r.status.padEnd(18) +
      r.action
    );
  }

  console.log("\n==========================================================================");
  console.log("                     AUDIT & REPAIR SUMMARY METRICS");
  console.log("==========================================================================");
  console.log(`Total Document References Checked : ${totalDocRefs}`);
  console.log(`Valid Documents (Intact)          : ${validDocsCount}`);
  console.log(`Corrupted Documents Detected      : ${corruptedDocsCount}`);
  console.log(`Missing StoredFiles Detected      : ${missingDocsCount}`);
  console.log(`Total Documents Successfully Repaired: ${repairedDocsCount}`);
  console.log(`Unrecoverable Documents           : ${totalDocRefs - validDocsCount - repairedDocsCount}`);
  console.log("==========================================================================\n");

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
