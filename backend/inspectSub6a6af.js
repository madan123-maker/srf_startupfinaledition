const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("   FULL RESPONSES DUMP FOR SUBMISSION 6a6af8be62c99f5280d092c1");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const subId = '6a6af8be62c99f5280d092c1';
  const sub = await submissionsCol.findOne({ _id: new mongoose.Types.ObjectId(subId) });

  console.log(`Submission ID: ${sub._id}`);

  for (const qResp of (sub.responses || [])) {
    const hasFieldFiles = qResp.fieldResponses?.some(f => f.fileUrl);
    const hasSuppDocs = qResp.supportingDocumentResponses?.some(d => d.files?.length > 0);
    const hasAddFiles = qResp.additionalFiles?.length > 0;

    if (hasFieldFiles || hasSuppDocs || hasAddFiles) {
      console.log(`\nQuestion ID in Submission: "${qResp.questionId}"`);
      if (hasFieldFiles) {
        for (const fr of qResp.fieldResponses) {
          if (fr.fileUrl) {
            console.log(`   Field file: fieldId="${fr.fieldId}", fileName="${fr.fileName}", fileId="${fr.fileId}", fileUrl="${fr.fileUrl}"`);
            let cleanId = fr.fileId || (fr.fileUrl.match(/\/uploads\/([^\/]+)/i)?.[1]);
            let sf = cleanId && mongoose.Types.ObjectId.isValid(cleanId) ? await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(cleanId) }, { projection: { filename: 1, contentType: 1, size: 1, data: { $slice: 16 } } }) : null;
            console.log(`      --> DB StoredFile: _id="${sf?._id}", filename="${sf?.filename}", size=${sf?.size}b, hex="${sf?.data?.buffer?.toString('hex')}"`);
          }
        }
      }
      if (hasSuppDocs) {
        for (const sdr of qResp.supportingDocumentResponses) {
          for (const file of (sdr.files || [])) {
            console.log(`   Supp doc: docId="${sdr.documentId}", fileName="${file.fileName}", fileId="${file.fileId}", fileUrl="${file.fileUrl}"`);
            let cleanId = file.fileId || (file.fileUrl?.match(/\/uploads\/([^\/]+)/i)?.[1]);
            let sf = cleanId && mongoose.Types.ObjectId.isValid(cleanId) ? await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(cleanId) }, { projection: { filename: 1, contentType: 1, size: 1, data: { $slice: 16 } } }) : null;
            console.log(`      --> DB StoredFile: _id="${sf?._id}", filename="${sf?.filename}", size=${sf?.size}b, hex="${sf?.data?.buffer?.toString('hex')}"`);
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
