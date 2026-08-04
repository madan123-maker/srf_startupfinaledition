const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("=== REPAIRING MOCK PDF RECORDS WITH REAL BINARY PDF BUFFERS ===");
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Find a valid AP_Startup_Job_Portal.pdf binary record in DB
  const validRecord = await storedFilesCol.findOne({
    filename: { $regex: /AP_Startup_Job_Portal/i },
    size: { $gt: 1000 }
  });

  if (!validRecord) {
    console.log("No valid binary AP_Startup_Job_Portal.pdf record found in database.");
    process.exit(1);
  }

  const validBuffer = validRecord.data;
  const validSize = validRecord.size;
  console.log(`Found valid binary template: ID=${validRecord._id}, Size=${validSize} bytes.`);

  // Find all mock 51-byte AP_Startup_Job_Portal records
  const mockRecords = await storedFilesCol.find({
    filename: { $regex: /AP_Startup_Job_Portal/i },
    size: { $lt: 200 }
  }).toArray();

  console.log(`Found ${mockRecords.length} mock 51-byte placeholder records.`);

  for (const mock of mockRecords) {
    await storedFilesCol.updateOne(
      { _id: mock._id },
      {
        $set: {
          data: validBuffer,
          size: validSize,
          contentType: 'application/pdf'
        }
      }
    );
    console.log(`Updated mock record _id=${mock._id} with real PDF binary (${validSize} bytes).`);
  }

  console.log("\nAll mock PDF records successfully repaired!");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
