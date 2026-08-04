const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL)
  .then(async () => {
    console.log("=== PIPELINE INVESTIGATION REPORT ===\n");
    const storedFilesCol = mongoose.connection.collection('storedfiles');
    const targetId = '6a685e3dac1024c619cd40ee';

    // 1. Inspect target file 6a685e3dac1024c619cd40ee in MongoDB
    const doc = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
    if (!doc) {
      console.log(`Document with _id=${targetId} NOT FOUND in storedfiles.`);
    } else {
      console.log(`1. DATABASE RECORD METADATA (_id: ${doc._id}):`);
      console.log(`   - filename: "${doc.filename}"`);
      console.log(`   - contentType: "${doc.contentType}"`);
      console.log(`   - size field: ${doc.size} bytes`);
      console.log(`   - uploadedBy: ${doc.uploadedBy}`);
      console.log(`   - createdAt: ${doc.createdAt}`);

      let rawBuf = null;
      if (doc.data) {
        if (Buffer.isBuffer(doc.data)) {
          rawBuf = doc.data;
        } else if (doc.data.buffer && Buffer.isBuffer(doc.data.buffer)) {
          rawBuf = doc.data.buffer;
        } else if (doc.data.value && typeof doc.data.value === 'function') {
          rawBuf = doc.data.value();
        } else if (doc.data.buffer) {
          rawBuf = Buffer.from(doc.data.buffer);
        } else {
          rawBuf = Buffer.from(doc.data);
        }
      }

      if (rawBuf) {
        console.log(`   - Buffer length: ${rawBuf.length} bytes`);
        console.log(`   - First 16 bytes (HEX): ${rawBuf.subarray(0, 16).toString('hex')}`);
        const strHeader = rawBuf.subarray(0, 60).toString('utf-8');
        console.log(`   - First 60 bytes (ASCII/UTF8): ${JSON.stringify(strHeader)}`);
        console.log(`   - Starts with %PDF? ${strHeader.startsWith('%PDF') ? "YES (VALID PDF)" : "NO (CORRUPTED / ASCII MOCK DATA)"}`);
      }
    }

    // 2. Check if local file exists on disk
    const uploadsDir = path.join(__dirname, 'uploads');
    console.log(`\n2. LOCAL DISK STORAGE CHECK (${uploadsDir}):`);
    if (doc && doc.filename) {
      const diskPath = path.join(uploadsDir, doc.filename);
      const exists = fs.existsSync(diskPath);
      console.log(`   - File path: ${diskPath}`);
      console.log(`   - Exists on disk? ${exists}`);
      if (exists) {
        const stat = fs.statSync(diskPath);
        const bufDisk = fs.readFileSync(diskPath);
        console.log(`   - Disk file size: ${stat.size} bytes`);
        console.log(`   - Disk file HEX header: ${bufDisk.subarray(0, 16).toString('hex')}`);
        console.log(`   - Disk file ASCII header: ${JSON.stringify(bufDisk.subarray(0, 50).toString('utf-8'))}`);
      }
    }

    // 3. Inspect ALL files in storedfiles collection for PDF binary headers
    console.log("\n3. ALL STORED PDF DOCUMENTS ANALYSIS:");
    const allFiles = await storedFilesCol.find({}).toArray();
    let pdfCount = 0;
    let validPdfCount = 0;
    let corruptedPdfCount = 0;

    for (const f of allFiles) {
      if (f.filename && f.filename.toLowerCase().endsWith('.pdf')) {
        pdfCount++;
        let b = null;
        if (Buffer.isBuffer(f.data)) b = f.data;
        else if (f.data && f.data.buffer) b = Buffer.from(f.data.buffer);
        else if (f.data) b = Buffer.from(f.data);

        const strHeader = b ? b.subarray(0, 10).toString('utf-8') : '';
        const isValid = strHeader.startsWith('%PDF');
        if (isValid) validPdfCount++; else corruptedPdfCount++;
        console.log(`   - Record ID: ${f._id} | Filename: "${f.filename}" | Size: ${f.size} bytes | Starts with %PDF: ${isValid ? "YES ✅" : "NO ❌"} | Content: ${JSON.stringify(b ? b.subarray(0, 45).toString('utf-8') : '')}`);
      }
    }

    console.log(`\nPDF Summary: Total = ${pdfCount} | Valid Binary PDFs (%PDF) = ${validPdfCount} | Mock/Corrupted Text PDFs = ${corruptedPdfCount}`);

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
