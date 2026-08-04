const http = require('http');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("             EXACT STEP-BY-STEP DEBUGGING FOR Q1.3 DOCUMENT");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Step 1: Find Q1.3 document in Submissions
  const submissions = await submissionsCol.find({}).toArray();
  let q13FileObj = null;
  let q13State = '';
  let q13QuestionId = '';

  for (const sub of submissions) {
    const responses = sub.responses || [];
    for (const qResp of responses) {
      if (qResp.questionId === 'q_1_3' || qResp.questionId === 'Q1.3' || (qResp.questionId && qResp.questionId.includes('1.3'))) {
        q13QuestionId = qResp.questionId;
        q13State = sub.stateName || 'State';

        // Check field responses
        if (qResp.fieldResponses) {
          for (const fr of qResp.fieldResponses) {
            if (fr.fileUrl || fr.fileId) {
              q13FileObj = fr;
              break;
            }
          }
        }
        // Check supporting document responses
        if (!q13FileObj && qResp.supportingDocumentResponses) {
          for (const sdr of qResp.supportingDocumentResponses) {
            if (sdr.files && sdr.files.length > 0) {
              q13FileObj = sdr.files[0];
              break;
            }
          }
        }
      }
    }
  }

  if (!q13FileObj) {
    console.log("No file reference found under Q1.3 in any submission. Searching all submission responses for Q1.3 references...");
    for (const sub of submissions) {
      for (const qResp of (sub.responses || [])) {
        if (qResp.fieldResponses) {
          for (const fr of qResp.fieldResponses) {
            if (fr.fileUrl || fr.fileId) {
              q13FileObj = fr;
              q13QuestionId = qResp.questionId;
              q13State = sub.stateName;
              console.log(`Found sample file in state "${q13State}", Question "${q13QuestionId}"`);
              break;
            }
          }
        }
        if (q13FileObj) break;
      }
      if (q13FileObj) break;
    }
  }

  console.log(`Step 1 & 2: Submission Q1.3 Document Details:`);
  console.log(`   State: "${q13State}"`);
  console.log(`   Question ID: "${q13QuestionId}"`);
  console.log(`   File Name: "${q13FileObj?.fileName || q13FileObj?.filename}"`);
  console.log(`   Stored fileId: "${q13FileObj?.fileId}"`);
  console.log(`   Stored fileUrl: "${q13FileObj?.fileUrl}"`);

  // Step 3 & 4: Exact fileId & request URL
  let fileId = q13FileObj?.fileId || '';
  const rawUrl = q13FileObj?.fileUrl || '';
  if (!fileId && rawUrl) {
    const match = rawUrl.match(/\/uploads\/([^\/]+)/i);
    if (match) fileId = match[1];
  }

  const requestPath = rawUrl.startsWith('/uploads/') ? rawUrl : `/uploads/${fileId}`;
  const fullRequestUrl = `http://localhost:5001${requestPath}`;

  console.log(`\nStep 3: Exact fileId used by frontend: "${fileId}"`);
  console.log(`Step 4: Exact request URL: "${fullRequestUrl}"`);
  console.log(`Step 5: Backend route handling request: GET /uploads/:fileId in backend/src/app.ts`);

  // Step 6: Query StoredFile document loaded from MongoDB
  let storedDoc = null;
  if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
    storedDoc = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(fileId) });
  }
  if (!storedDoc && fileId) {
    storedDoc = await storedFilesCol.findOne({ filename: fileId });
  }
  if (!storedDoc && q13FileObj?.fileName) {
    storedDoc = await storedFilesCol.findOne({ filename: q13FileObj.fileName });
  }

  if (!storedDoc) {
    console.log(`\n❌ ERROR: StoredFile document NOT FOUND in MongoDB for ID "${fileId}" or filename "${q13FileObj?.fileName}"!`);
    process.exit(1);
  }

  let dbBuffer = Buffer.isBuffer(storedDoc.data) ? storedDoc.data : (storedDoc.data && storedDoc.data.buffer ? Buffer.from(storedDoc.data.buffer) : Buffer.from(storedDoc.data || ''));

  const dbHash = crypto.createHash('sha256').update(dbBuffer).digest('hex');

  console.log(`\nStep 6 & 7: MongoDB StoredFile Details (_id: ${storedDoc._id}):`);
  console.log(`   - filename: "${storedDoc.filename}"`);
  console.log(`   - contentType: "${storedDoc.contentType}"`);
  console.log(`   - data length: ${dbBuffer.length} bytes`);
  console.log(`   - first 16 bytes (hex): ${dbBuffer.subarray(0, 16).toString('hex')}`);
  console.log(`   - first 16 bytes (ASCII): ${JSON.stringify(dbBuffer.subarray(0, 16).toString('utf-8'))}`);
  console.log(`   - last 16 bytes (hex): ${dbBuffer.subarray(-16).toString('hex')}`);
  console.log(`   - last 16 bytes (ASCII): ${JSON.stringify(dbBuffer.subarray(-16).toString('utf-8'))}`);
  console.log(`Step 7: SHA-256 Hash of MongoDB Buffer: ${dbHash}`);

  // Step 8: Capture actual HTTP response
  console.log(`\nStep 8: Fetching HTTP response from ${fullRequestUrl}...`);

  http.get(fullRequestUrl, (res) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const httpBuffer = Buffer.concat(chunks);
      const httpHash = crypto.createHash('sha256').update(httpBuffer).digest('hex');

      console.log(`   - HTTP Status Code: ${res.statusCode}`);
      console.log(`   - HTTP Content-Type Header: ${res.headers['content-type']}`);
      console.log(`   - HTTP Content-Disposition Header: ${res.headers['content-disposition']}`);
      console.log(`   - HTTP Content-Length Header: ${res.headers['content-length']}`);
      console.log(`   - Downloaded Bytes Length: ${httpBuffer.length} bytes`);
      console.log(`   - Downloaded Bytes First 16 Bytes (hex): ${httpBuffer.subarray(0, 16).toString('hex')}`);
      console.log(`   - Downloaded Bytes Last 16 Bytes (hex): ${httpBuffer.subarray(-16).toString('hex')}`);
      console.log(`   - SHA-256 Hash of Downloaded Bytes: ${httpHash}`);

      console.log(`\nStep 9: Hash Comparison Result:`);
      const hashesMatch = dbHash === httpHash;
      console.log(`   MongoDB Hash (${dbHash}) === HTTP Response Hash (${httpHash})? ${hashesMatch ? "YES ✅ MATCH" : "NO ❌ MISMATCH"}`);

      if (!hashesMatch) {
        console.log(`   ❌ CORRUPTION DETECTED! The backend modified or truncated bytes during HTTP transmission!`);
      } else {
        // Step 10: Save downloaded response as debug.pdf and validate
        const debugPdfPath = path.join(__dirname, 'debug.pdf');
        fs.writeFileSync(debugPdfPath, httpBuffer);
        console.log(`\nStep 10: Saved downloaded response to "${debugPdfPath}" (${httpBuffer.length} bytes).`);

        const isPdfValid = httpBuffer.subarray(0, 4).toString('utf-8') === '%PDF';
        const hasEof = httpBuffer.toString('utf-8').includes('%%EOF');

        console.log(`   - Starts with %PDF? ${isPdfValid ? "YES ✅" : "NO ❌"}`);
        console.log(`   - Contains %%EOF? ${hasEof ? "YES ✅" : "NO ❌"}`);
      }

      process.exit(0);
    });
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});
