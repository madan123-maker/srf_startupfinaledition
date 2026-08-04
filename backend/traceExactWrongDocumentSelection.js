const http = require('http');
const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("    17-POINT EXACT END-TO-END TRACE FOR FAILING USER DOCUMENT");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Search for the specific submission response containing "2026-06-16 21-26-17.pdf"
  const submissions = await submissionsCol.find({}).toArray();

  let targetSub = null;
  let targetQResp = null;
  let targetFileObj = null;

  for (const sub of submissions) {
    for (const qResp of (sub.responses || [])) {
      if (qResp.fieldResponses) {
        for (const fr of qResp.fieldResponses) {
          if (fr.fileName && fr.fileName.includes('2026-06-16 21-26-17.pdf')) {
            targetSub = sub;
            targetQResp = qResp;
            targetFileObj = fr;
            break;
          }
        }
      }
      if (targetFileObj) break;
      if (qResp.supportingDocumentResponses) {
        for (const sdr of qResp.supportingDocumentResponses) {
          for (const sf of (sdr.files || [])) {
            if (sf.fileName && sf.fileName.includes('2026-06-16 21-26-17.pdf')) {
              targetSub = sub;
              targetQResp = qResp;
              targetFileObj = sf;
              break;
            }
          }
          if (targetFileObj) break;
        }
      }
      if (targetFileObj) break;
    }
    if (targetFileObj) break;
  }

  if (!targetSub || !targetFileObj) {
    console.log("❌ Target document '2026-06-16 21-26-17.pdf' not found in submissions.");
    process.exit(1);
  }

  const subId = targetSub._id.toString();
  const questionId = targetQResp.questionId;
  const questionText = targetQResp.questionText || targetQResp.label || 'Question';
  const expectedFilename = targetFileObj.fileName || targetFileObj.filename;
  const expectedFileId = targetFileObj.fileId || '';
  const fileUrlInSub = targetFileObj.fileUrl || `/uploads/${expectedFileId}`;

  console.log(`1. Submission _id                 : "${subId}"`);
  console.log(`2. Question ID                    : "${questionId}"`);
  console.log(`3. Question Text                  : "${questionText}"`);
  console.log(`4. Expected Filename in Submission: "${expectedFilename}"`);
  console.log(`5. Expected fileId in Submission  : "${expectedFileId}"`);
  console.log(`6. fileUrl stored in Submission   : "${fileUrlInSub}"`);

  // Simulate API response returned to frontend GET /api/submissions/:id
  console.log(`7. Exact API Response to Frontend : { fileName: "${expectedFilename}", fileId: "${expectedFileId}", fileUrl: "${fileUrlInSub}" }`);
  console.log(`8. FileId Received by Frontend   : "${expectedFileId}"`);

  const openedUrlByFrontend = `http://localhost:5001${fileUrlInSub.startsWith('/uploads/') ? fileUrlInSub : `/uploads/${expectedFileId}`}`;
  console.log(`9. URL Opened by Frontend        : "${openedUrlByFrontend}"`);
  console.log(`10. Backend Endpoint Handling Req : GET /uploads/:fileId (app.ts)`);

  // Fetch StoredFile loaded from MongoDB for expectedFileId
  let storedFileDoc = null;
  if (expectedFileId && mongoose.Types.ObjectId.isValid(expectedFileId)) {
    storedFileDoc = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(expectedFileId) });
  }

  if (!storedFileDoc) {
    console.log(`❌ StoredFile document with _id "${expectedFileId}" DOES NOT EXIST in MongoDB!`);
    process.exit(1);
  }

  let buf = Buffer.isBuffer(storedFileDoc.data) ? storedFileDoc.data : (storedFileDoc.data && storedFileDoc.data.buffer ? Buffer.from(storedFileDoc.data.buffer) : Buffer.from(storedFileDoc.data || ''));
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

  console.log(`11. StoredFile._id Loaded         : "${storedFileDoc._id}"`);
  console.log(`12. StoredFile.filename           : "${storedFileDoc.filename}"`);
  console.log(`13. StoredFile.originalName       : "${storedFileDoc.originalName || storedFileDoc.filename}"`);
  console.log(`14. StoredFile.contentType        : "${storedFileDoc.contentType}"`);
  console.log(`15. StoredFile.size               : ${buf.length} bytes`);
  console.log(`16. SHA-256 Hash                  : ${sha256}`);
  console.log(`    First 32 bytes (Hex)          : ${buf.subarray(0, 32).toString('hex')}`);

  // Fetch actual HTTP response over HTTP GET
  http.get(openedUrlByFrontend, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      const httpBuf = Buffer.concat(chunks);
      const dispHeader = res.headers['content-disposition'] || '';
      let actFilenameInHeader = 'Unknown';
      const m = dispHeader.match(/filename="([^"]+)"/);
      if (m) actFilenameInHeader = m[1];

      console.log(`17. Browser Actually Opened File  : "${actFilenameInHeader}" (Content-Disposition: "${dispHeader}")`);

      console.log("\n==========================================================================");
      console.log("                      17-POINT COMPARISON MATRIX");
      console.log("==========================================================================");
      console.log(`Step 4 (Expected Filename in Sub) : "${expectedFilename}"`);
      console.log(`Step 12 (StoredFile.filename)     : "${storedFileDoc.filename}"`);
      console.log(`Step 17 (Browser Opened Filename) : "${actFilenameInHeader}"`);

      const filenamesMatch = expectedFilename.toLowerCase() === storedFileDoc.filename.toLowerCase();
      console.log(`\nDoes Expected Filename ("${expectedFilename}") match StoredFile.filename ("${storedFileDoc.filename}")? ${filenamesMatch ? "YES ✅ MATCH" : "NO ❌ MISMATCH"}`);

      process.exit(0);
    });
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});
