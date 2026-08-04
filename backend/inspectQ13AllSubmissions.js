const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("      DETAILED AUDIT OF QUESTION 1.3 (q_1_3) ACROSS ALL SUBMISSIONS");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const submissions = await submissionsCol.find({}).toArray();

  for (const sub of submissions) {
    const subId = sub._id.toString();
    const stateName = sub.stateName || 'State';

    for (const qResp of (sub.responses || [])) {
      if (qResp.questionId === 'q_1_3' || qResp.questionId === 'Q1.3' || (qResp.questionId && qResp.questionId.includes('1_3'))) {
        console.log(`State: "${stateName}" | Submission _id: "${subId}" | Question: "${qResp.questionId}"`);
        
        if (qResp.fieldResponses) {
          console.log(`  Field Responses:`);
          for (const fr of qResp.fieldResponses) {
            console.log(`     - fieldId: "${fr.fieldId}" | fileName: "${fr.fileName}" | fileId: "${fr.fileId}" | fileUrl: "${fr.fileUrl}"`);
            let cleanId = fr.fileId || '';
            if (!cleanId && fr.fileUrl) {
              const m = fr.fileUrl.match(/\/uploads\/([^\/]+)/i);
              if (m) cleanId = m[1];
            }
            if (cleanId && mongoose.Types.ObjectId.isValid(cleanId)) {
              const sf = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(cleanId) });
              console.log(`       StoredFile: ${sf ? `FOUND (_id: ${sf._id}, size: ${sf.size}b, filename: "${sf.filename}")` : '❌ NOT FOUND'}`);
            }
          }
        }

        if (qResp.supportingDocumentResponses) {
          console.log(`  Supporting Document Responses:`);
          for (const sdr of qResp.supportingDocumentResponses) {
            console.log(`     - docId: "${sdr.documentId}"`);
            for (const file of (sdr.files || [])) {
              console.log(`        - fileName: "${file.fileName}" | fileId: "${file.fileId}" | fileUrl: "${file.fileUrl}"`);
              let cleanId = file.fileId || '';
              if (!cleanId && file.fileUrl) {
                const m = file.fileUrl.match(/\/uploads\/([^\/]+)/i);
                if (m) cleanId = m[1];
              }
              if (cleanId && mongoose.Types.ObjectId.isValid(cleanId)) {
                const sf = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(cleanId) });
                console.log(`          StoredFile: ${sf ? `FOUND (_id: ${sf._id}, size: ${sf.size}b, filename: "${sf.filename}")` : '❌ NOT FOUND'}`);
              }
            }
          }
        }

        if (qResp.additionalFiles) {
          console.log(`  Additional Files:`);
          for (const af of qResp.additionalFiles) {
            console.log(`     - fileName: "${af.fileName}" | fileId: "${af.fileId}" | fileUrl: "${af.fileUrl}"`);
          }
        }
        console.log('');
      }
    }
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
