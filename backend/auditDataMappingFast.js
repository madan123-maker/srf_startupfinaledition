const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("             FAST DATA MAPPING AUDIT ACROSS ALL SUBMISSIONS");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Fast load storedfiles metadata
  const allStored = await storedFilesCol.find({}, { projection: { filename: 1, contentType: 1, size: 1 } }).toArray();
  const storedMapById = new Map();
  const storedMapByName = new Map();

  for (const sf of allStored) {
    const info = {
      _id: sf._id.toString(),
      filename: sf.filename || '',
      contentType: sf.contentType || '',
      size: sf.size || 0
    };
    storedMapById.set(sf._id.toString(), info);
    if (sf.filename) {
      const lower = sf.filename.toLowerCase();
      if (!storedMapByName.has(lower)) storedMapByName.set(lower, []);
      storedMapByName.get(lower).push(info);
    }
  }

  const submissions = await submissionsCol.find({}, { projection: { stateName: 1, responses: 1 } }).toArray();

  let totalReferences = 0;
  let passCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;

  const mappingReport = [];

  for (const sub of submissions) {
    const stateName = sub.stateName || 'State';

    for (const qResp of (sub.responses || [])) {
      const qId = qResp.questionId || 'Unknown';

      const processRef = (expectedFileName, fileIdOrUrl, sourceField) => {
        totalReferences++;
        let fileId = '';
        if (fileIdOrUrl) {
          if (mongoose.Types.ObjectId.isValid(fileIdOrUrl)) {
            fileId = fileIdOrUrl;
          } else {
            const match = String(fileIdOrUrl).match(/\/uploads\/([^\/]+)/i);
            if (match) fileId = match[1];
            else fileId = String(fileIdOrUrl);
          }
        }

        const cleanExpected = (expectedFileName || 'Document').trim();
        const storedDoc = storedMapById.get(fileId) || (cleanExpected ? (storedMapByName.get(cleanExpected.toLowerCase()) || [])[0] : null);

        let status = 'PASS';
        let reason = 'Filename and StoredFile match correctly.';

        if (!storedDoc) {
          status = 'MISSING';
          reason = `No StoredFile record found in database for ID "${fileId}".`;
          missingCount++;
        } else {
          const actualFileName = storedDoc.filename || '';
          const expLower = cleanExpected.toLowerCase();
          const actLower = actualFileName.toLowerCase();

          const nameMatches = expLower === actLower || actLower.includes(expLower) || expLower.includes(actLower);

          if (!nameMatches) {
            status = 'MISMATCH';
            reason = `Submission expects "${cleanExpected}", but StoredFile points to "${actualFileName}" (${storedDoc.contentType}, ${storedDoc.size}b).`;
            mismatchCount++;
          } else {
            passCount++;
          }
        }

        const matchingOriginals = storedMapByName.get(cleanExpected.toLowerCase()) || [];
        const originalCandidates = matchingOriginals.map(m => `${m._id} (${m.filename})`).join('; ');

        mappingReport.push({
          stateName,
          qId,
          sourceField,
          expectedFileName: cleanExpected,
          expectedFileId: fileId,
          actualFileId: storedDoc ? storedDoc._id : 'N/A',
          actualFileName: storedDoc ? storedDoc.filename : 'N/A',
          actualContentType: storedDoc ? storedDoc.contentType : 'N/A',
          actualSize: storedDoc ? `${storedDoc.size}b` : 'N/A',
          status,
          reason,
          originalCandidates: originalCandidates || 'None found by name'
        });
      };

      if (qResp.fieldResponses) {
        for (const fr of qResp.fieldResponses) {
          if (fr.fileUrl || fr.fileId || fr.fileName) {
            processRef(fr.fileName || fr.filename, fr.fileId || fr.fileUrl, 'fieldResponse');
          }
        }
      }

      if (qResp.supportingDocumentResponses) {
        for (const sdr of qResp.supportingDocumentResponses) {
          if (sdr.files) {
            for (const sf of sdr.files) {
              if (sf.fileUrl || sf.fileId || sf.fileName) {
                processRef(sf.fileName || sf.filename, sf.fileId || sf.fileUrl, 'supportingDocument');
              }
            }
          }
        }
      }
    }
  }

  console.log("==========================================================================");
  console.log("                   DATA MAPPING AUDIT SUMMARY METRICS");
  console.log("==========================================================================");
  console.log(`Total Document References Checked : ${totalReferences}`);
  console.log(`PASS (Original Matching StoredFile): ${passCount}`);
  console.log(`MISMATCH (Substituted File ID)    : ${mismatchCount}`);
  console.log(`MISSING (No StoredFile in DB)     : ${missingCount}`);
  console.log("==========================================================================\n");

  console.log("--- MAPPING ANALYSIS FOR SUBMISSION DOCUMENTS ---");
  for (const item of mappingReport) {
    const symbol = item.status === 'PASS' ? '✅ PASS' : (item.status === 'MISMATCH' ? '⚠️ MISMATCH' : '❌ MISSING');
    console.log(`${item.qId.padEnd(8)} | Exp: "${item.expectedFileName.padEnd(30)}" | Act: "${item.actualFileName.padEnd(30)}" | FileId: ${item.expectedFileId.padEnd(24)} | ${symbol}`);
    if (item.status !== 'PASS') {
      console.log(`   └─ Reason: ${item.reason}`);
      console.log(`   └─ Matching Originals in DB: ${item.originalCandidates}\n`);
    }
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
