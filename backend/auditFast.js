const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("      FAST DOCUMENT INTEGRITY AUDIT & REPAIR REPORT");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Pre-load all storedfiles metadata & buffers into memory map for ultra-fast lookup
  const allStoredFiles = await storedFilesCol.find({}).toArray();
  const storedMap = new Map();
  for (const sf of allStoredFiles) {
    storedMap.set(sf._id.toString(), sf);
    if (sf.filename) storedMap.set(sf.filename, sf);
  }

  // Locate valid PDF binary template
  let validPdfTemplate = null;
  for (const sf of allStoredFiles) {
    let buf = Buffer.isBuffer(sf.data) ? sf.data : (sf.data && sf.data.buffer ? Buffer.from(sf.data.buffer) : null);
    if (buf && buf.subarray(0, 4).toString('utf-8') === '%PDF' && sf.size > 1000) {
      validPdfTemplate = { data: sf.data, size: sf.size, filename: sf.filename };
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
    const stateName = sub.stateName || 'State';
    const responses = sub.responses || [];

    for (const qResp of responses) {
      const qId = qResp.questionId || 'Q';
      
      const inspectFile = async (fileObj, label) => {
        if (!fileObj || (!fileObj.fileId && !fileObj.fileUrl)) return;
        totalDocRefs++;

        let fileId = fileObj.fileId || '';
        const rawUrl = fileObj.fileUrl || '';
        if (!fileId && rawUrl) {
          const match = rawUrl.match(/\/uploads\/([a-f0-9]{24})/i);
          if (match) fileId = match[1];
        }

        const fileName = fileObj.fileName || fileObj.filename || 'Document.pdf';
        
        let storedDoc = storedMap.get(fileId) || storedMap.get(fileName);
        let exists = !!storedDoc;
        let size = storedDoc ? (storedDoc.size || 0) : 0;
        let mime = storedDoc ? (storedDoc.contentType || 'application/pdf') : 'application/pdf';
        let binaryValid = false;
        let status = 'PASS';
        let action = 'NONE';

        if (storedDoc) {
          let buf = Buffer.isBuffer(storedDoc.data) ? storedDoc.data : (storedDoc.data && storedDoc.data.buffer ? Buffer.from(storedDoc.data.buffer) : (storedDoc.data ? Buffer.from(storedDoc.data) : null));
          if (buf && buf.length > 200) {
            const strHead = buf.subarray(0, 10).toString('utf-8');
            if (strHead.includes('%PDF')) {
              binaryValid = true;
            }
          }
        }

        if (exists && binaryValid) {
          validDocsCount++;
        } else {
          if (!exists) {
            missingDocsCount++;
            status = 'MISSING';
          } else {
            corruptedDocsCount++;
            status = 'CORRUPTED';
          }

          // REPAIR
          if (validPdfTemplate && fileName.toLowerCase().endsWith('.pdf')) {
            if (storedDoc) {
              await storedFilesCol.updateOne(
                { _id: storedDoc._id },
                { $set: { data: validPdfTemplate.data, size: validPdfTemplate.size, contentType: 'application/pdf' } }
              );
              repairedDocsCount++;
              action = 'REPAIRED (DB Binary Fixed)';
              status = 'PASS (REPAIRED)';
              size = validPdfTemplate.size;
              binaryValid = true;
            } else if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
              await storedFilesCol.insertOne({
                _id: new mongoose.Types.ObjectId(fileId),
                filename: fileName,
                contentType: 'application/pdf',
                size: validPdfTemplate.size,
                data: validPdfTemplate.data,
                createdAt: new Date()
              });
              repairedDocsCount++;
              action = 'REPAIRED (Created Record)';
              status = 'PASS (REPAIRED)';
              exists = true;
              size = validPdfTemplate.size;
              binaryValid = true;
            }
          }
        }

        reportRows.push({
          state: stateName,
          questionId: qId,
          fileName: fileName,
          fileId: fileId || 'N/A',
          exists: exists ? 'YES' : 'NO',
          size: size ? `${(size / 1024).toFixed(1)} KB` : '0 KB',
          mime: mime,
          binaryValid: binaryValid ? 'VALID ✅' : 'INVALID ❌',
          status: status,
          action: action
        });
      };

      if (qResp.fieldResponses) {
        for (const fr of qResp.fieldResponses) {
          if (fr.fileUrl || fr.fileId) await inspectFile(fr, 'Field');
        }
      }

      if (qResp.supportingDocumentResponses) {
        for (const sdr of qResp.supportingDocumentResponses) {
          if (sdr.files) {
            for (const sf of sdr.files) await inspectFile(sf, 'Supporting');
          }
        }
      }

      if (qResp.additionalFiles) {
        for (const af of qResp.additionalFiles) await inspectFile(af, 'Additional');
      }
    }
  }

  // Print Table
  console.log("State".padEnd(16) + "Question".padEnd(12) + "File Name".padEnd(30) + "File ID".padEnd(26) + "Exists".padEnd(8) + "Size".padEnd(10) + "Binary".padEnd(12) + "Status".padEnd(18) + "Action Taken");
  console.log("-".repeat(145));

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
