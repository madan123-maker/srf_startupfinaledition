const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("   INSPECTING BINARY CONTENT OF STOREDFILE 6a718004d9d3632a2b84fb7c");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const id = '6a718004d9d3632a2b84fb7c';
  const sf = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(id) });

  console.log(`StoredFile ID: ${sf._id}`);
  console.log(`Filename: ${sf.filename}`);
  console.log(`Content-Type: ${sf.contentType}`);
  console.log(`Size: ${sf.size} bytes`);
  
  if (sf.data) {
    const buf = Buffer.isBuffer(sf.data) ? sf.data : Buffer.from(sf.data.buffer || sf.data);
    const text = buf.toString('utf-8', 0, Math.min(buf.length, 50000));
    console.log(`Contains 'Aadhaar'? : ${text.toLowerCase().includes('aadhaar')}`);
    console.log(`Contains 'Nithish'? : ${text.toLowerCase().includes('nithish')}`);
    console.log(`Contains '%PDF'?    : ${text.includes('%PDF')}`);
    console.log(`First 64 Bytes ASCII: ${JSON.stringify(buf.toString('utf-8', 0, 64))}`);
  }

  // Also check all other storedfiles for Aadhaar or Nithish
  const allFiles = await storedFilesCol.find({}, { projection: { filename: 1, contentType: 1, size: 1, data: { $slice: 1000 } } }).toArray();
  console.log(`\nSearching ALL ${allFiles.length} StoredFiles for 'Aadhaar' or 'Nithish':`);
  for (const f of allFiles) {
    if (f.data) {
      const buf = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data.buffer || f.data);
      const txt = buf.toString('utf-8');
      if (txt.toLowerCase().includes('aadhaar') || txt.toLowerCase().includes('nithish')) {
        console.log(`   Found match: _id="${f._id}", filename="${f.filename}", contentType="${f.contentType}", size=${f.size}b`);
      }
    }
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
