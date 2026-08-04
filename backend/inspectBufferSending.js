const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("=== INSPECTING STORED FILE BINARY RETRIEVAL ===");
  const StoredFile = mongoose.model('StoredFile', new mongoose.Schema({
    filename: String,
    contentType: String,
    size: Number,
    data: Buffer
  }), 'storedfiles');

  const files = await StoredFile.find({}).limit(10);
  console.log(`Found ${files.length} records in storedfiles.`);

  for (const f of files) {
    console.log(`\n--- Record ID: ${f._id} (${f.filename}) ---`);
    console.log(`- Stored size field: ${f.size}`);
    console.log(`- Is dbFile.data a Buffer? ${Buffer.isBuffer(f.data)}`);

    let rawBuffer = null;
    if (Buffer.isBuffer(f.data)) {
      rawBuffer = f.data;
    } else if (f.data && f.data.buffer && Buffer.isBuffer(f.data.buffer)) {
      rawBuffer = Buffer.from(f.data.buffer);
    } else if (f.data) {
      rawBuffer = Buffer.from(f.data);
    }

    if (rawBuffer) {
      console.log(`- Extracted Buffer length: ${rawBuffer.length} bytes`);
      console.log(`- SHA-256 Hash: ${crypto.createHash('sha256').update(rawBuffer).digest('hex')}`);
      console.log(`- First 16 bytes (HEX): ${rawBuffer.subarray(0, 16).toString('hex')}`);
      console.log(`- First 16 bytes (ASCII): ${JSON.stringify(rawBuffer.subarray(0, 16).toString('utf-8'))}`);
      console.log(`- Last 16 bytes (HEX): ${rawBuffer.subarray(-16).toString('hex')}`);
      console.log(`- Last 16 bytes (ASCII): ${JSON.stringify(rawBuffer.subarray(-16).toString('utf-8'))}`);
    }
  }

  process.exit(0);
});
