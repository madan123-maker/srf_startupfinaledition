const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("     FAST TESTING HTTP FETCH FOR DOC_Q_1_2_1 AND DOC_Q_1_2_2");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');

  const id1 = '6a718004d9d3632a2b84fb7c';
  const id2 = '6a718004d9d3632a2b84fb7d';

  const doc1 = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(id1) }, { projection: { filename: 1, contentType: 1, size: 1, data: { $slice: 32 } } });
  const doc2 = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(id2) }, { projection: { filename: 1, contentType: 1, size: 1, data: { $slice: 32 } } });

  console.log(`Doc 1 (_id: ${id1}): filename: "${doc1?.filename}", contentType: "${doc1?.contentType}", size: ${doc1?.size}b`);
  console.log(`Doc 2 (_id: ${id2}): filename: "${doc2?.filename}", contentType: "${doc2?.contentType}", size: ${doc2?.size}b`);

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
          console.log(`  - First 32 Bytes (Hex): ${buf.subarray(0, 32).toString('hex')}`);
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
