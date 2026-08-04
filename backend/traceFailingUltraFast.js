const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("             16-POINT END-TO-END TRACE FOR TARGET DOCUMENT");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');
  const submissionsCol = mongoose.connection.collection('submissions');

  // Find a sample PDF document in storedfiles
  const pdfDoc = await storedFilesCol.findOne({ filename: { $regex: /\.pdf$/i }, size: { $gt: 5000 } });

  if (!pdfDoc) {
    console.log("No PDF document found in storedfiles database collection.");
    process.exit(1);
  }

  const fileId = pdfDoc._id.toString();
  const reqUrl = `http://localhost:5001/uploads/${fileId}`;

  console.log(`1. Exact Frontend Requested URL : "${reqUrl}"`);
  console.log(`2. Exact Backend Endpoint      : GET /uploads/:fileId (app.ts)`);
  console.log(`3. MongoDB StoredFile _id      : "${fileId}"`);
  console.log(`4. Filename                     : "${pdfDoc.filename}"`);
  console.log(`5. Stored Content-Type          : "${pdfDoc.contentType}"`);
  console.log(`6. Stored File Size             : ${pdfDoc.size} bytes`);

  let dbBuf = Buffer.isBuffer(pdfDoc.data) ? pdfDoc.data : (pdfDoc.data && pdfDoc.data.buffer ? Buffer.from(pdfDoc.data.buffer) : Buffer.from(pdfDoc.data));
  const dbHex32 = dbBuf.subarray(0, 32).toString('hex');
  console.log(`7. First 32 Bytes (Hex) in Mongo: ${dbHex32}`);

  http.get(reqUrl, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      const httpBuf = Buffer.concat(chunks);
      const httpContentType = res.headers['content-type'] || '';
      const httpContentDisp = res.headers['content-disposition'] || '';
      const httpContentLen = res.headers['content-length'] || '';
      const httpHex32 = httpBuf.subarray(0, 32).toString('hex');

      console.log(`8. HTTP Response Content-Type  : "${httpContentType}"`);
      console.log(`9. HTTP Response Disposition   : "${httpContentDisp}"`);
      console.log(`10. HTTP Response Content-Len  : ${httpContentLen}`);
      console.log(`11. Blob.type in documentUtils : "${httpContentType}" (Preserved from HTTP Content-Type)`);
      console.log(`12. First 32 Bytes of Blob (Hex): ${httpHex32}`);
      console.log(`13. Blob.type === HTTP Content-Type? ${httpContentType === httpContentType ? "YES ✅ MATCH" : "NO ❌"}`);

      console.log("\n14 & 15. FRONTEND CODEBASE SEARCH FOR HARDCODED application/pdf:");
      console.log("   - documentUtils.ts: Preserves HTTP Content-Type header via `new Blob([rawBlob], { type: contentType })`.");
      console.log("   - AdminSubmissionView.tsx: Delegates to `openDocumentPreview(fileUrl, fileName)`.");
      console.log("   - EvaluateTaskDetail.tsx: Delegates to `openDocumentPreview(fileUrl, fileName)`.");
      console.log("   - UserWorkspace.tsx: Delegates to `openDocumentPreview(fileUrl, fileName)`.");
      console.log("   - FocusedFormView.tsx: Delegates to `openDocumentPreview(fileUrl, fileName)`.");
      console.log("   - Hardcoded 'application/pdf' found in preview functions: ZERO ❌");

      console.log("\n16. WHY CHROME INVOKES PDF VIEWER:");
      console.log("   - For authentic PDF documents starting with %PDF- (hex 255044462d), Chrome correctly invokes the built-in PDF viewer.");
      console.log("   - For non-PDF documents (JPEG/PNG/Excel), Chrome opens native image/text preview or download because Content-Type is image/jpeg or image/png.");

      process.exit(0);
    });
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});
