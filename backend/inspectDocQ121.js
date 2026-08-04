const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("      INSPECTING DOC_Q_1_2_1 & DOC_Q_1_2_2 IN ALL SUBMISSIONS");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const submissions = await submissionsCol.find({}).toArray();

  for (const sub of submissions) {
    const subId = sub._id.toString();
    const stateName = sub.stateName || 'State';

    for (const qResp of (sub.responses || [])) {
      if (qResp.supportingDocumentResponses) {
        for (const sdr of qResp.supportingDocumentResponses) {
          if (sdr.documentId === 'DOC_Q_1_2_1' || sdr.documentId === 'DOC_Q_1_2_2' || (sdr.files && sdr.files.some(f => f.fileName && f.fileName.includes('AP_Startup_Ecosystem')))) {
            console.log(`State: "${stateName}" | Submission _id: "${subId}" | Question: "${qResp.questionId}" | Doc ID: "${sdr.documentId}"`);
            for (const file of (sdr.files || [])) {
              console.log(`   - fileName : "${file.fileName}"`);
              console.log(`   - fileId   : "${file.fileId}"`);
              console.log(`   - fileUrl  : "${file.fileUrl}"`);

              let cleanId = file.fileId || '';
              if (!cleanId && file.fileUrl) {
                const m = file.fileUrl.match(/\/uploads\/([^\/]+)/i);
                if (m) cleanId = m[1];
              }

              let sf = null;
              if (cleanId && mongoose.Types.ObjectId.isValid(cleanId)) {
                sf = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(cleanId) });
              } else if (cleanId) {
                sf = await storedFilesCol.findOne({ filename: cleanId });
              }

              console.log(`   - StoredFile in DB : ${sf ? `FOUND (_id: ${sf._id}, size: ${sf.size}b, filename: "${sf.filename}")` : '❌ NOT FOUND IN STOREDFILES'}`);
            }
            console.log('');
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
