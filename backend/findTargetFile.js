const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL)
  .then(async () => {
    console.log("Connected to DB");
    const targetId = '6a6afa7e62c99f5280d092c3';
    
    // Check StoredFile
    const sf = await mongoose.connection.collection('storedfiles').findOne({ _id: new mongoose.Types.ObjectId(targetId) });
    console.log("Found in storedfiles by ObjectId?", sf ? sf.filename : "NO");
    
    const sfStr = await mongoose.connection.collection('storedfiles').findOne({ _id: targetId });
    console.log("Found in storedfiles by String _id?", sfStr ? sfStr.filename : "NO");

    // Search all collections for this ID string
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const colInfo of collections) {
      const colName = colInfo.name;
      const countStr = await mongoose.connection.collection(colName).countDocuments({
        $or: [
          { _id: targetId },
          { _id: new mongoose.Types.ObjectId(targetId) }
        ]
      });
      if (countStr > 0) {
        console.log(`Found _id=${targetId} in collection: ${colName}`);
      }
    }

    // List ALL storedfile IDs and filenames
    const allStoredFiles = await mongoose.connection.collection('storedfiles').find({}, { projection: { _id: 1, filename: 1 } }).toArray();
    console.log("\nALL StoredFiles in DB:");
    for (const f of allStoredFiles) {
      console.log(`  ID: ${f._id} | Filename: ${f.filename}`);
    }

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
