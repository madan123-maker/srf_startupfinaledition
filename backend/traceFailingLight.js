const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("          DEEP-DIVE END-TO-END AUDIT FOR STORED PDF DOCUMENTS");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Query all storedfiles with slice projection for 32 bytes
  const pdfDocs = await storedFilesCol.find(
    { $or: [{ filename: { $regex: /\.pdf$/i } }, { contentType: 'application/pdf' }] },
    { projection: { filename: 1, contentType: 1, size: 1, data: { $slice: 32 } } }
  ).toArray();

  console.log(`Total PDF records in database: ${pdfDocs.length}\n`);

  let validCount = 0;
  let invalidCount = 0;
  const invalidList = [];

  for (const doc of pdfDocs) {
    let buf = Buffer.isBuffer(doc.data) ? doc.data : (doc.data && doc.data.buffer ? Buffer.from(doc.data.buffer) : (doc.data ? Buffer.from(doc.data) : null));
    const first32Hex = buf ? buf.subarray(0, 32).toString('hex') : 'NO_DATA';
    const first32Ascii = buf ? JSON.stringify(buf.subarray(0, 32).toString('utf-8')) : '';
    const isPdf = buf && buf.subarray(0, 4).toString('utf-8') === '%PDF';

    if (isPdf) {
      validCount++;
    } else {
      invalidCount++;
      invalidList.push({
        id: doc._id.toString(),
        filename: doc.filename,
        contentType: doc.contentType,
        size: doc.size,
        first32Hex,
        first32Ascii
      });
    }
  }

  console.log(`Valid Binary PDFs (%PDF): ${validCount}`);
  console.log(`Invalid / Non-%PDF Documents: ${invalidCount}\n`);

  if (invalidList.length > 0) {
    console.log("INVALID PDF RECORDS IN DATABASE:");
    for (const inv of invalidList) {
      console.log(`- ID: ${inv.id} | Filename: "${inv.filename}" | ContentType: "${inv.contentType}" | Size: ${inv.size}b | First 32 Hex: ${inv.first32Hex} | First 32 Ascii: ${inv.first32Ascii}`);
    }
  }

  // Pick a valid PDF document to test HTTP retrieval
  const sample = pdfDocs.find(d => {
    let b = Buffer.isBuffer(d.data) ? d.data : (d.data && d.data.buffer ? Buffer.from(d.data.buffer) : null);
    return b && b.subarray(0, 4).toString('utf-8') === '%PDF';
  }) || pdfDocs[0];

  if (sample) {
    const fileId = sample._id.toString();
    const reqUrl = `http://localhost:5001/uploads/${fileId}`;

    console.log("\n--- HTTP RESPONSE RETRIEVAL TRACE ---");
    console.log(`1. Requested URL: "${reqUrl}"`);
    console.log(`2. Backend Endpoint: GET /uploads/:fileId (app.ts)`);
    console.log(`3. MongoDB StoredFile _id: "${fileId}"`);
    console.log(`4. Filename: "${sample.filename}"`);
    console.log(`5. Stored contentType: "${sample.contentType}"`);
    console.log(`6. Stored size: ${sample.size} bytes`);

    http.get(reqUrl, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const httpBuf = Buffer.concat(chunks);
        console.log(`8. HTTP Response Content-Type: "${res.headers['content-type']}"`);
        console.log(`9. HTTP Response Content-Disposition: "${res.headers['content-disposition']}"`);
        console.log(`10. Content-Length Header: ${res.headers['content-length']}`);
        console.log(`11. Downloaded Buffer Length: ${httpBuf.length} bytes`);
        console.log(`12. Downloaded Buffer First 32 Bytes (hex): ${httpBuf.subarray(0, 32).toString('hex')}`);
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
