const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL)
  .then(async () => {
    const submissions = await mongoose.connection.collection('submissions').find({}).toArray();
    console.log("=== SUBMISSIONS DETAILED FILES ===");
    for (const sub of submissions) {
      console.log(`\nSub ID: ${sub._id} | State: ${sub.stateName}`);
      if (!sub.responses) continue;
      for (const resp of sub.responses) {
        if (resp.fieldResponses) {
          for (const fr of resp.fieldResponses) {
            if (fr.fileUrl || fr.fileName) {
              console.log(`  [FR] q=${resp.questionId} f=${fr.fieldId} fileUrl=${fr.fileUrl} fileName=${fr.fileName}`);
            }
          }
        }
        if (resp.supportingDocumentResponses) {
          for (const sdr of resp.supportingDocumentResponses) {
            if (sdr.files) {
              for (const f of sdr.files) {
                console.log(`  [SDR] q=${resp.questionId} docId=${sdr.documentId} fileId=${f.fileId} fileUrl=${f.fileUrl} fileName=${f.fileName}`);
              }
            }
          }
        }
        if (resp.additionalFiles) {
          for (const af of resp.additionalFiles) {
            console.log(`  [AF] q=${resp.questionId} fileId=${af.fileId} fileUrl=${af.fileUrl} fileName=${af.fileName}`);
          }
        }
      }
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
