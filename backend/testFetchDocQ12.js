const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("     TESTING HTTP FETCH FOR DOC_Q_1_2_1 AND DOC_Q_1_2_2");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const id1 = '6a718004d9d3632a2b84fb7c';
  const id2 = '6a718004d9d3632a2b84fb7d';

  const doc1 = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(id1) });
  const doc2 = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(id2) });

  console.log(`Doc 1 (_id: ${id1}):`);
  console.log(`  - filename: "${doc1?.filename}"`);
  console.log(`  - contentType: "${doc1?.contentType}"`);
  console.log(`  - size: ${doc1?.size} bytes`);
  console.log(`  - data exists? ${!!doc1?.data}`);

  console.log(`\nDoc 2 (_id: ${id2}):`);
  console.log(`  - filename: "${doc2?.filename}"`);
  console.log(`  - contentType: "${doc2?.contentType}"`);
  console.log(`  - size: ${doc2?.size} bytes`);
  console.log(`  - data exists? ${!!doc2?.data}`);

  const testHttp = (url, label) => {
    return new Promise((resolve) => {
      http.get(url, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          console.log(`\nHTTP TEST ${label} (${url}):`);
          console.log(`  - Status: ${res.statusCode}`);
          console.log(`  - Content-Type: ${res.headers['content-type']}`);
          console.log(`  - Content-Disposition: ${res.headers['content-disposition']}`);
          console.log(`  - Response Length: ${buf.length} bytes`);
          console.log(`  - First 16 Bytes (Hex): ${buf.subarray(0, 16).toString('hex')}`);
          console.log(`  - First 16 Bytes (ASCII): ${JSON.stringify(buf.subarray(0, 16).toString('utf-8'))}`);
          resolve();
        });
      });
    });
  };

  await testHttp(`http://localhost:5001/uploads/${id1}`, 'DOC_Q_1_2_1');
  await testHttp(`http://localhost:5001/uploads/${id2}`, 'DOC_Q_1_2_2');

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
