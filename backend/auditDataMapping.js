const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("             COMPREHENSIVE SUBMISSION DATA MAPPING AUDIT");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Load all stored files into memory
  const allStored = await storedFilesCol.find({}, { projection: { filename: 1, contentType: 1, size: 1, data: 1 } }).toArray();
  const storedMapById = new Map();
  const storedMapByName = new Map();

  for (const sf of allStored) {
    let buf = Buffer.isBuffer(sf.data) ? sf.data : (sf.data && sf.data.buffer ? Buffer.from(sf.data.buffer) : Buffer.from(sf.data || ''));
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const info = {
      _id: sf._id.toString(),
      filename: sf.filename,
      contentType: sf.contentType,
      size: buf.length,
      hash,
      first16Hex: buf.subarray(0, 16).toString('hex')
    };
    storedMapById.set(sf._id.toString(), info);
    if (sf.filename) {
      if (!storedMapByName.has(sf.filename.toLowerCase())) {
        storedMapByName.set(sf.filename.toLowerCase(), []);
      }
      storedMapByName.get(sf.filename.toLowerCase()).push(info);
    }
  }

  console.log(`Loaded ${allStored.length} total StoredFiles from MongoDB.\n`);

  const submissions = await submissionsCol.find({}).toArray();

  let totalReferences = 0;
  let passCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;

  const mappingReport = [];

  for (const sub of submissions) {
    const stateName = sub.stateName || 'State';
    const subId = sub._id.toString();

    for (const qResp of (sub.responses || [])) {
      const qId = qResp.questionId || 'Unknown';

      const processRef = (expectedFileName, fileIdOrUrl, sourceField) => {
        totalReferences++;
        let fileId = '';
        if (fileIdOrUrl) {
          if (mongoose.Types.ObjectId.isValid(fileIdOrUrl)) {
            fileId = fileIdOrUrl;
          } else {
            const match = fileIdOrUrl.match(/\/uploads\/([^\/]+)/i);
            if (match) fileId = match[1];
            else fileId = fileIdOrUrl;
          }
        }

        const cleanExpected = (expectedFileName || 'Document').trim();
        const storedDoc = storedMapById.get(fileId);

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

          // Check if filenames match or if storedDoc is a substituted template
          const nameMatches = expLower === actLower || actLower.includes(expLower) || expLower.includes(actLower);

          if (!nameMatches) {
            status = 'MISMATCH';
            reason = `Submission expects "${cleanExpected}", but StoredFile ID points to "${actualFileName}" (${storedDoc.contentType}, ${storedDoc.size} bytes).`;
            mismatchCount++;
          } else {
            passCount++;
          }
        }

        // Search if original file with expected name exists in DB elsewhere
        const matchingOriginals = storedMapByName.get(cleanExpected.toLowerCase()) || [];
        const originalCandidates = matchingOriginals.map(m => `${m._id} (${m.filename}, ${m.size}b)`).join('; ');

        mappingReport.push({
          stateName,
          subId,
          qId,
          sourceField,
          expectedFileName: cleanExpected,
          expectedFileId: fileId,
          actualFileId: storedDoc ? storedDoc._id : 'N/A',
          actualFileName: storedDoc ? storedDoc.filename : 'N/A',
          actualContentType: storedDoc ? storedDoc.contentType : 'N/A',
          actualSize: storedDoc ? `${storedDoc.size}b` : 'N/A',
          sha256: storedDoc ? storedDoc.hash.substring(0, 16) + '...' : 'N/A',
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

  console.log("--- DETAILED MAPPING TABLE (FIRST 30 ITEMS) ---");
  for (const item of mappingReport.slice(0, 35)) {
    const symbol = item.status === 'PASS' ? '✅ PASS' : (item.status === 'MISMATCH' ? '⚠️ MISMATCH' : '❌ MISSING');
    console.log(`${item.qId.padEnd(8)} | Exp: "${item.expectedFileName.padEnd(25)}" | Act: "${item.actualFileName.padEnd(25)}" | ID: ${item.expectedFileId.padEnd(24)} | ${symbol}`);
    if (item.status !== 'PASS') {
      console.log(`   -> Reason: ${item.reason}`);
      console.log(`   -> Candidates in DB: ${item.originalCandidates}`);
    }
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
