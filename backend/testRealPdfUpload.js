const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config();

// Create a valid binary PDF buffer in memory
const validPdfBuffer = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 100 700 TD (Hello Real Binary PDF) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`);

async function testUploadPipeline() {
  console.log("=== TESTING REAL PDF UPLOAD & RETRIEVAL PIPELINE ===\n");
  console.log(`1. Generated Real Binary PDF Buffer (${validPdfBuffer.length} bytes):`);
  console.log(`   - First 16 bytes (HEX): ${validPdfBuffer.subarray(0, 16).toString('hex')}`);
  console.log(`   - Starts with %PDF: ${validPdfBuffer.subarray(0, 4).toString('utf-8') === '%PDF'}`);

  await mongoose.connect(process.env.DATABASE_URL);
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Insert into StoredFile as if uploaded via multer
  const testFileName = `Real_Test_Doc_${Date.now()}.pdf`;
  const insertRes = await storedFilesCol.insertOne({
    filename: testFileName,
    contentType: 'application/pdf',
    size: validPdfBuffer.length,
    data: validPdfBuffer,
    createdAt: new Date()
  });

  const fileId = insertRes.insertedId.toString();
  console.log(`\n2. STORED IN MONGODB (File ID: ${fileId}, Filename: "${testFileName}")`);

  // Verify DB record
  const dbDoc = await storedFilesCol.findOne({ _id: insertRes.insertedId });
  let dbBuf = dbDoc.data.buffer ? Buffer.from(dbDoc.data.buffer) : Buffer.from(dbDoc.data);
  console.log(`   - Retrieved DB Buffer Size: ${dbBuf.length} bytes`);
  console.log(`   - Retrieved DB First 16 Bytes (HEX): ${dbBuf.subarray(0, 16).toString('hex')}`);
  console.log(`   - DB Starts with %PDF: ${dbBuf.subarray(0, 4).toString('utf-8') === '%PDF'}`);

  // Fetch via HTTP GET /uploads/:fileId
  console.log(`\n3. FETCHING VIA HTTP ENDPOINT: http://localhost:5001/uploads/${fileId}`);
  http.get(`http://localhost:5001/uploads/${fileId}`, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', async () => {
      const respBuf = Buffer.concat(chunks);
      console.log(`   - HTTP Response Status Code: ${res.statusCode}`);
      console.log(`   - HTTP Response Content-Type: ${res.headers['content-type']}`);
      console.log(`   - HTTP Response Content-Disposition: ${res.headers['content-disposition']}`);
      console.log(`   - HTTP Response Size: ${respBuf.length} bytes`);
      console.log(`   - HTTP Response First 16 Bytes (HEX): ${respBuf.subarray(0, 16).toString('hex')}`);
      console.log(`   - HTTP Response Starts with %PDF: ${respBuf.subarray(0, 4).toString('utf-8') === '%PDF'}`);

      // Clean up test doc
      await storedFilesCol.deleteOne({ _id: insertRes.insertedId });
      console.log(`\n4. Test document cleaned up from DB.`);
      process.exit(0);
    });
  });
}

testUploadPipeline().catch(err => {
  console.error(err);
  process.exit(1);
});
