const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("      EXACT END-TO-END TRACE FLOW FOR SUBMISSION 6a6af8be62c99f5280d092c1");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const subId = '6a6af8be62c99f5280d092c1';
  const sub = await submissionsCol.findOne({ _id: new mongoose.Types.ObjectId(subId) });

  console.log(`Submission ID: ${sub._id}`);
  console.log(`State Name: ${sub.stateName}`);
  console.log(`Edition ID: ${sub.editionId}`);
  console.log(`Total Responses: ${sub.responses?.length}\n`);

  for (const qResp of (sub.responses || [])) {
    if (qResp.questionId === 'q_16_2' || qResp.questionId === 'q_16_1' || (qResp.supportingDocumentResponses && qResp.supportingDocumentResponses.some(s => s.documentId === 'doc_q_16_2_1'))) {
      console.log(`[QUESTION MATCHED] Question ID in Submission: "${qResp.questionId}"`);
      
      for (const sdr of (qResp.supportingDocumentResponses || [])) {
        console.log(`   Requirement ID: "${sdr.documentId}"`);
        for (const file of (sdr.files || [])) {
          console.log(`     - Rendered fileName : "${file.fileName}"`);
          console.log(`     - Stored fileId     : "${file.fileId}"`);
          console.log(`     - Stored fileUrl    : "${file.fileUrl}"`);

          let cleanId = file.fileId || '';
          if (!cleanId && file.fileUrl) {
            const m = file.fileUrl.match(/\/uploads\/([^\/]+)/i);
            if (m) cleanId = m[1];
          }

          console.log(`     - Backend GET /uploads/:fileId receives parameter: "${cleanId}"`);

          let sfByObjId = null;
          let sfByFilename = null;

          if (cleanId && mongoose.Types.ObjectId.isValid(cleanId)) {
            sfByObjId = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(cleanId) });
          }
          sfByFilename = await storedFilesCol.findOne({ filename: file.fileName });

          console.log(`     - Mongo Query executed (by _id): StoredFile.findOne({ _id: ObjectId("${cleanId}") })`);
          console.log(`       --> Returned StoredFile._id     : "${sfByObjId?._id}"`);
          console.log(`       --> Returned StoredFile.filename: "${sfByObjId?.filename}"`);
          console.log(`       --> Returned StoredFile.contentType: "${sfByObjId?.contentType}"`);
          console.log(`       --> Returned StoredFile size    : ${sfByObjId?.size} bytes`);
          console.log(`       --> First 16 bytes (Hex)        : ${sfByObjId?.data ? sfByObjId.data.buffer.slice(0, 16).toString('hex') : 'N/A'}`);

          console.log(`     - Mongo Query executed (by filename fallback): StoredFile.findOne({ filename: "${file.fileName}" })`);
          console.log(`       --> Returned StoredFile._id     : "${sfByFilename?._id}"`);
          console.log(`       --> Returned StoredFile.filename: "${sfByFilename?.filename}"`);
          console.log(`       --> Returned StoredFile.contentType: "${sfByFilename?.contentType}"`);
          console.log(`       --> Returned StoredFile size    : ${sfByFilename?.size} bytes`);
        }
      }
    }
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
