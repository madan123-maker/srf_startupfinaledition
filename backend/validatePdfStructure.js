const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("             PDF BINARY STRUCTURE & PARSER VALIDATION REPORT");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const targetId1 = '6a684f5e12bf91abbc777022'; // Working PDF
  const targetId2 = '6a685e3dac1024c619cd40ee'; // Target PDF

  const doc1 = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(targetId1) });
  const doc2 = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(targetId2) });

  const validateDocument = async (doc, label) => {
    console.log(`--------------------------------------------------------------------------`);
    console.log(`VALIDATING: ${label}`);
    console.log(`--------------------------------------------------------------------------`);

    if (!doc) {
      console.log(`❌ Document NOT FOUND in database.`);
      return;
    }

    let buf = Buffer.isBuffer(doc.data) ? doc.data : (doc.data && doc.data.buffer ? Buffer.from(doc.data.buffer) : Buffer.from(doc.data || ''));

    // Step 1: Save exact binary to disk
    const filename = doc.filename || 'debug.pdf';
    const filePath = path.join(__dirname, `${label.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    fs.writeFileSync(filePath, buf);

    // Step 5: Compute SHA256
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    console.log(`1. Saved exact MongoDB binary to disk : "${filePath}"`);
    console.log(`2. Database Record _id               : "${doc._id}"`);
    console.log(`3. Stored Filename                    : "${doc.filename}"`);
    console.log(`4. File Size                          : ${buf.length} bytes`);
    console.log(`5. SHA256 Hash                        : ${hash}`);

    // Step 3 & 4: Deep Structure Inspection
    const strContent = buf.toString('utf-8');
    const headerMatch = strContent.match(/%PDF-\d+\.\d+/);
    const pdfVersion = headerMatch ? headerMatch[0] : 'INVALID/MISSING';
    const hasXref = strContent.includes('xref') || strContent.includes('/XRef');
    const hasTrailer = strContent.includes('trailer') || strContent.includes('/Root');
    const hasEof = strContent.includes('%%EOF');
    const objMatches = strContent.match(/\d+\s+\d+\s+obj/g) || [];
    const endobjMatches = strContent.match(/endobj/g) || [];
    const streamMatches = strContent.match(/stream/g) || [];
    const endstreamMatches = strContent.match(/endstream/g) || [];

    console.log(`\n6. LOW-LEVEL PDF STRUCTURE ANALYSIS:`);
    console.log(`   - PDF Version Header          : ${pdfVersion}`);
    console.log(`   - Starts with %PDF-           : ${buf.subarray(0, 5).toString('utf-8') === '%PDF-' ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Cross-Reference (xref)      : ${hasXref ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Trailer Section             : ${hasTrailer ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - End-of-File (%%EOF) Marker : ${hasEof ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - PDF Objects Count           : ${objMatches.length} 'obj', ${endobjMatches.length} 'endobj'`);
    console.log(`   - PDF Streams Count           : ${streamMatches.length} 'stream', ${endstreamMatches.length} 'endstream'`);

    // Step 2 & 4: Parser Validation via pdf-parse
    console.log(`\n7. HIGH-LEVEL PDF PARSER RESULTS (pdf-parse library):`);
    try {
      const parsed = await pdfParse(buf);
      console.log(`   - Parser Status               : SUCCESS ✅ VALID PDF`);
      console.log(`   - Number of Pages             : ${parsed.numpages}`);
      console.log(`   - Extracted Text Length       : ${parsed.text ? parsed.text.trim().length : 0} characters`);
      console.log(`   - PDF Info Metadata           : ${JSON.stringify(parsed.info)}`);
    } catch (parseErr) {
      console.log(`   - Parser Status               : REJECTED / INVALID ❌`);
      console.log(`   - Exact Parser Error          : ${parseErr.message}`);
    }

    console.log(`\n8. FIRST 32 BYTES (HEX) : ${buf.subarray(0, 32).toString('hex')}`);
    console.log(`9. LAST 32 BYTES (HEX)  : ${buf.subarray(-32).toString('hex')}\n`);

    return {
      id: doc._id.toString(),
      filename: doc.filename,
      size: buf.length,
      version: pdfVersion,
      hash,
      hasEof
    };
  };

  const res1 = await validateDocument(doc1, "PDF_1_Working_6a684f5e12bf91abbc777022");
  const res2 = await validateDocument(doc2, "PDF_2_Target_6a685e3dac1024c619cd40ee");

  // Comparison Summary
  console.log("==========================================================================");
  console.log("                   WORKING VS TARGET PDF COMPARISON");
  console.log("==========================================================================");
  if (res1 && res2) {
    console.log(`Metric                   | Working PDF (${res1.id.substring(0,8)}...) | Target PDF (${res2.id.substring(0,8)}...)`);
    console.log(`-------------------------|--------------------------------|--------------------------------`);
    console.log(`Filename                 | ${res1.filename.padEnd(30)} | ${res2.filename.padEnd(30)}`);
    console.log(`Size (Bytes)             | ${res1.size.toString().padEnd(30)} | ${res2.size.toString().padEnd(30)}`);
    console.log(`PDF Version              | ${res1.version.padEnd(30)} | ${res2.version.padEnd(30)}`);
    console.log(`Valid %%EOF Marker        | ${res1.hasEof ? 'YES ✅' : 'NO ❌'}                             | ${res2.hasEof ? 'YES ✅' : 'NO ❌'}`);
    console.log(`SHA256 Hash              | ${res1.hash.substring(0,16)}...         | ${res2.hash.substring(0,16)}...`);
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
