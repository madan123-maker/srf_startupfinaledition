const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("    FAST HEADER & METADATA INSPECTION FOR '2026-06-16 21-26-17.pdf'");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');
  const targetId = '6a685e24ac1024c619cd3dd5';

  const doc = await storedFilesCol.findOne(
    { _id: new mongoose.Types.ObjectId(targetId) },
    { projection: { filename: 1, contentType: 1, size: 1, data: { $slice: 2000 } } }
  );

  if (!doc) {
    console.log("❌ Document NOT FOUND");
    process.exit(1);
  }

  let buf = Buffer.isBuffer(doc.data) ? doc.data : (doc.data && doc.data.buffer ? Buffer.from(doc.data.buffer) : Buffer.from(doc.data || ''));

  console.log(`1. StoredFile Record _id : "${doc._id}"`);
  console.log(`2. StoredFile filename   : "${doc.filename}"`);
  console.log(`3. StoredFile size       : ${doc.size} bytes`);
  console.log(`4. StoredFile contentType: "${doc.contentType}"`);

  const str = buf.toString('utf-8');
  console.log(`5. Header Slice ASCII   :\n${str.substring(0, 400)}`);

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
