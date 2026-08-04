const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("    TEXT & METADATA INSPECTION FOR '2026-06-16 21-26-17.pdf'");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');
  const targetId = '6a685e24ac1024c619cd3dd5';

  const doc = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(targetId) });

  if (!doc) {
    console.log("❌ Document NOT FOUND");
    process.exit(1);
  }

  let buf = Buffer.isBuffer(doc.data) ? doc.data : (doc.data && doc.data.buffer ? Buffer.from(doc.data.buffer) : Buffer.from(doc.data));

  console.log(`StoredFile Record _id : "${doc._id}"`);
  console.log(`StoredFile filename   : "${doc.filename}"`);
  console.log(`StoredFile size       : ${buf.length} bytes`);
  console.log(`StoredFile contentType: "${doc.contentType}"`);

  try {
    const parsed = await pdfParse(buf);
    console.log(`\nPDF METADATA & PARSED CONTENT:`);
    console.log(`   - Number of Pages  : ${parsed.numpages}`);
    console.log(`   - PDF Info Metadata: ${JSON.stringify(parsed.info, null, 2)}`);
    console.log(`   - First 500 chars of extracted text:\n`);
    console.log(parsed.text.substring(0, 500));
  } catch (err) {
    console.log(`❌ PDF parse error: ${err.message}`);
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
