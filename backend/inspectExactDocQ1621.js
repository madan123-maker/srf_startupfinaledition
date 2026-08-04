const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("   INSPECTING DOC_Q_16_2_1 IN SUBMISSION 6a6af8be62c99f5280d092c1");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const subId = '6a6af8be62c99f5280d092c1';
  const sub = await submissionsCol.findOne({ _id: new mongoose.Types.ObjectId(subId) });

  console.log(`Submission ID: ${sub._id}`);

  for (const qResp of (sub.responses || [])) {
    if (qResp.supportingDocumentResponses) {
      for (const sdr of qResp.supportingDocumentResponses) {
        if (sdr.documentId === 'doc_q_16_2_1' || sdr.documentId === 'DOC_Q_16_2_1' || qResp.questionId === 'q_16_2') {
          console.log(`Question ID: "${qResp.questionId}" | Document ID: "${sdr.documentId}"`);
          for (const file of (sdr.files || [])) {
            console.log(`   - fileName: "${file.fileName}"`);
            console.log(`   - fileId  : "${file.fileId}"`);
            console.log(`   - fileUrl : "${file.fileUrl}"`);

            let cleanId = file.fileId || (file.fileUrl?.match(/\/uploads\/([^\/]+)/i)?.[1]);
            let sf = cleanId && mongoose.Types.ObjectId.isValid(cleanId) ? await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(cleanId) }, { projection: { filename: 1, contentType: 1, size: 1, data: { $slice: 32 } } }) : null;

            console.log(`   - DB StoredFile._id     : "${sf?._id}"`);
            console.log(`   - DB StoredFile.filename: "${sf?.filename}"`);
            console.log(`   - DB StoredFile.contentType: "${sf?.contentType}"`);
            console.log(`   - DB StoredFile.size    : ${sf?.size} bytes`);
            console.log(`   - DB StoredFile First 32 bytes Hex : ${sf?.data ? sf.data.buffer.toString('hex') : 'N/A'}`);
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
