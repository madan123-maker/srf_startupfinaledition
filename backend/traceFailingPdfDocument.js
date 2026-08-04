const http = require('http');
const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("          DEEP-DIVE END-TO-END AUDIT FOR FAILING PDF DOCUMENTS");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');
  const submissionsCol = mongoose.connection.collection('submissions');

  // Search all PDF storedfiles in DB
  const allPdfFiles = await storedFilesCol.find({
    $or: [
      { filename: { $regex: /\.pdf$/i } },
      { contentType: 'application/pdf' }
    ]
  }).toArray();

  console.log(`Found ${allPdfFiles.length} PDF documents in storedfiles database collection.\n`);

  let invalidPdfCount = 0;
  const invalidFiles = [];

  for (const doc of allPdfFiles) {
    let buf = Buffer.isBuffer(doc.data) ? doc.data : (doc.data && doc.data.buffer ? Buffer.from(doc.data.buffer) : (doc.data ? Buffer.from(doc.data) : null));
    const first32Hex = buf ? buf.subarray(0, 32).toString('hex') : 'NO_DATA';
    const first32Ascii = buf ? JSON.stringify(buf.subarray(0, 32).toString('utf-8')) : '';
    const startsWithPdf = buf && buf.subarray(0, 4).toString('utf-8') === '%PDF';

    if (!startsWithPdf) {
      invalidPdfCount++;
      invalidFiles.push({
        id: doc._id.toString(),
        filename: doc.filename,
        contentType: doc.contentType,
        size: doc.size || (buf ? buf.length : 0),
        first32Hex,
        first32Ascii
      });
    }
  }

  console.log(`--- ANALYSIS OF ALL ${allPdfFiles.length} STORED PDF RECORDS ---`);
  console.log(`- Valid %PDF Binary Documents: ${allPdfFiles.length - invalidPdfCount}`);
  console.log(`- Invalid / Non-%PDF Documents: ${invalidPdfCount}\n`);

  if (invalidFiles.length > 0) {
    console.log("INVALID PDF DOCUMENTS FOUND IN MONGODB:");
    for (const inv of invalidFiles) {
      console.log(`  - _id: ${inv.id}`);
      console.log(`    filename: "${inv.filename}"`);
      console.log(`    contentType: "${inv.contentType}"`);
      console.log(`    size: ${inv.size} bytes`);
      console.log(`    first 32 hex: ${inv.first32Hex}`);
      console.log(`    first 32 ascii: ${inv.first32Ascii}\n`);
    }
  }

  // Now trace HTTP response for a sample PDF document in DB
  const samplePdf = allPdfFiles.find(f => {
    let b = Buffer.isBuffer(f.data) ? f.data : (f.data && f.data.buffer ? Buffer.from(f.data.buffer) : null);
    return b && b.subarray(0, 4).toString('utf-8') === '%PDF';
  }) || allPdfFiles[0];

  if (samplePdf) {
    let buf = Buffer.isBuffer(samplePdf.data) ? samplePdf.data : (samplePdf.data && samplePdf.data.buffer ? Buffer.from(samplePdf.data.buffer) : Buffer.from(samplePdf.data));
    const fileId = samplePdf._id.toString();
    const reqUrl = `http://localhost:5001/uploads/${fileId}`;

    console.log("--- TRACING SAMPLE PDF RETRIEVAL OVER HTTP ---");
    console.log(`1. Frontend Requested URL: "${reqUrl}"`);
    console.log(`2. Backend Endpoint: GET /uploads/:fileId (app.ts)`);
    console.log(`3. MongoDB StoredFile _id: "${fileId}"`);
    console.log(`4. Filename: "${samplePdf.filename}"`);
    console.log(`5. Stored contentType: "${samplePdf.contentType}"`);
    console.log(`6. Stored file size: ${samplePdf.size} bytes`);
    console.log(`7. First 32 bytes (hex): ${buf.subarray(0, 32).toString('hex')}`);

    http.get(reqUrl, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const httpBuf = Buffer.concat(chunks);
        console.log(`8. HTTP Response Content-Type: "${res.headers['content-type']}"`);
        console.log(`9. HTTP Response Content-Disposition: "${res.headers['content-disposition']}"`);
        console.log(`10. HTTP Response Content-Length: ${res.headers['content-length']}`);
        console.log(`11. Downloaded Bytes Length: ${httpBuf.length} bytes`);
        console.log(`12. Downloaded Bytes First 32 bytes (hex): ${httpBuf.subarray(0, 32).toString('hex')}`);
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});
