const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("    SEARCHING ALL SUBMISSIONS FOR '2026-06-16 21-26-17.pdf'");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const submissions = await submissionsCol.find({}).toArray();

  for (const sub of submissions) {
    const subId = sub._id.toString();
    const stateName = sub.stateName || 'State';

    for (const qResp of (sub.responses || [])) {
      const qId = qResp.questionId || 'Unknown';

      const checkRef = async (fileName, fileId, fileUrl, fieldType) => {
        if (fileName && fileName.includes('2026-06-16 21-26-17.pdf')) {
          let cleanId = fileId || '';
          if (!cleanId && fileUrl) {
            const m = fileUrl.match(/\/uploads\/([^\/]+)/i);
            if (m) cleanId = m[1];
          }

          let sf = null;
          if (cleanId && mongoose.Types.ObjectId.isValid(cleanId)) {
            sf = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(cleanId) });
          }

          console.log(`State: "${stateName}" | SubId: "${subId}" | QId: "${qId}" | Field: "${fieldType}"`);
          console.log(`   - Submission fileName : "${fileName}"`);
          console.log(`   - Submission fileId   : "${fileId}"`);
          console.log(`   - Submission fileUrl  : "${fileUrl}"`);
          console.log(`   - StoredFile._id      : "${sf ? sf._id : 'NOT FOUND'}"`);
          console.log(`   - StoredFile.filename : "${sf ? sf.filename : 'NOT FOUND'}"`);
          console.log(`   - StoredFile.size     : ${sf ? sf.size : 0} bytes`);
          console.log(`   - MATCH STATUS        : ${sf && sf.filename === fileName ? 'PASS ✅' : 'MISMATCH ❌'}\n`);
        }
      };

      if (qResp.fieldResponses) {
        for (const fr of qResp.fieldResponses) {
          await checkRef(fr.fileName || fr.filename, fr.fileId, fr.fileUrl, 'fieldResponse');
        }
      }
      if (qResp.supportingDocumentResponses) {
        for (const sdr of qResp.supportingDocumentResponses) {
          for (const sf of (sdr.files || [])) {
            await checkRef(sf.fileName || sf.filename, sf.fileId, sf.fileUrl, 'supportingDocument');
          }
        }
      }
    }
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
