const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("    NON-DESTRUCTIVE REPAIR OF SUBMISSION FILE MAPPING REFERENCES");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Step 1: Load all StoredFile metadata into memory
  const allStored = await storedFilesCol.find(
    { size: { $gt: 0 } },
    { projection: { filename: 1, contentType: 1, size: 1, createdAt: 1 } }
  ).toArray();

  const storedById = new Map();
  const storedByName = new Map();

  for (const sf of allStored) {
    const info = {
      _id: sf._id.toString(),
      filename: sf.filename || '',
      contentType: sf.contentType || '',
      size: sf.size || 0,
      createdAt: sf.createdAt || new Date(0)
    };
    storedById.set(sf._id.toString(), info);

    if (sf.filename) {
      const lowerName = sf.filename.trim().toLowerCase();
      if (!storedByName.has(lowerName)) {
        storedByName.set(lowerName, []);
      }
      storedByName.get(lowerName).push(info);
    }
  }

  console.log(`Loaded ${allStored.length} valid StoredFile records from MongoDB.\n`);

  // Step 2: Iterate through all Submissions
  const submissions = await submissionsCol.find({}).toArray();

  let totalChecked = 0;
  let alreadyCorrect = 0;
  let repairedCount = 0;
  let unresolvableCount = 0;

  const report = [];

  for (const sub of submissions) {
    let subModified = false;
    const responses = sub.responses || [];

    for (const qResp of responses) {
      const qId = qResp.questionId || 'Unknown';

      const checkAndUpdate = (fileObj) => {
        if (!fileObj || (!fileObj.fileName && !fileObj.filename && !fileObj.fileId && !fileObj.fileUrl)) return;

        totalChecked++;

        const expectedName = (fileObj.fileName || fileObj.filename || '').trim();
        let oldFileId = fileObj.fileId || '';
        if (!oldFileId && fileObj.fileUrl) {
          const m = fileObj.fileUrl.match(/\/uploads\/([^\/]+)/i);
          if (m) oldFileId = m[1];
        }

        let isCorrect = false;
        let currentStored = storedById.get(oldFileId);

        if (currentStored && expectedName) {
          const actLower = currentStored.filename.trim().toLowerCase();
          const expLower = expectedName.toLowerCase();
          if (actLower === expLower || actLower.includes(expLower) || expLower.includes(actLower)) {
            isCorrect = true;
          }
        }

        if (isCorrect) {
          alreadyCorrect++;
          report.push({
            qId,
            expectedFileName: expectedName,
            oldFileId,
            newFileId: oldFileId,
            storedFileId: currentStored._id,
            status: 'PASS (Already Correct)'
          });
          return;
        }

        // Search for matching StoredFile by expected filename
        const candidates = storedByName.get(expectedName.toLowerCase()) || [];
        // Filter candidates: prefer ones that aren't sample timestamps unless exact match
        let bestCandidate = candidates[0];

        if (candidates.length > 1) {
          const nonSample = candidates.find(c => !c.filename.startsWith('1784359') && !c.filename.startsWith('1784305'));
          if (nonSample) bestCandidate = nonSample;
        }

        if (bestCandidate) {
          const newId = bestCandidate._id;
          fileObj.fileId = newId;
          fileObj.fileUrl = `/uploads/${newId}`;

          subModified = true;
          repairedCount++;

          report.push({
            qId,
            expectedFileName: expectedName,
            oldFileId,
            newFileId: newId,
            storedFileId: bestCandidate._id,
            status: 'REPAIRED ✅'
          });
        } else {
          unresolvableCount++;
          report.push({
            qId,
            expectedFileName: expectedName,
            oldFileId,
            newFileId: 'N/A',
            storedFileId: 'N/A',
            status: 'UNRESOLVED ❌'
          });
        }
      };

      if (qResp.fieldResponses) {
        for (const fr of qResp.fieldResponses) checkAndUpdate(fr);
      }

      if (qResp.supportingDocumentResponses) {
        for (const sdr of qResp.supportingDocumentResponses) {
          if (sdr.files) {
            for (const sf of sdr.files) checkAndUpdate(sf);
          }
        }
      }
    }

    if (subModified) {
      await submissionsCol.updateOne(
        { _id: sub._id },
        { $set: { responses: sub.responses, updatedAt: new Date() } }
      );
    }
  }

  console.log("==========================================================================");
  console.log("                 REPAIR RESULTS & VERIFICATION METRICS");
  console.log("==========================================================================");
  console.log(`Total Document References Checked : ${totalChecked}`);
  console.log(`Already Correct References       : ${alreadyCorrect}`);
  console.log(`Successfully Repaired References : ${repairedCount}`);
  console.log(`Unresolvable References          : ${unresolvableCount}`);
  console.log("==========================================================================\n");

  console.log("--- REPAIR LOG TABLE ---");
  for (const row of report) {
    console.log(`${row.qId.padEnd(8)} | Exp: "${row.expectedFileName.padEnd(28)}" | Old ID: ${row.oldFileId.padEnd(24)} | New ID: ${row.newFileId.padEnd(24)} | ${row.status}`);
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
