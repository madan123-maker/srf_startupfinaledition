const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("      INSPECTING SCHEMA QUESTION IDs IN MONGO DB");
  console.log("==========================================================================\n");

  const schemasCol = mongoose.connection.collection('formschemas');
  const schemas = await schemasCol.find({}).toArray();

  for (const s of schemas) {
    console.log(`Schema _id: ${s._id}, editionId: ${s.editionId}`);
    for (const area of (s.areas || [])) {
      for (const ap of (area.actionPoints || [])) {
        for (const q of (ap.questions || [])) {
          console.log(`   - q.id: "${q.id}" | q.questionNumber: "${q.questionNumber}" | q.title: "${(q.title || '').substring(0, 30)}..."`);
        }
      }
    }
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
