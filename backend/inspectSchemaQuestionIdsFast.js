const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("   FAST SCHEMA QUESTION IDs AUDIT");
  console.log("==========================================================================\n");

  const schemasCol = mongoose.connection.collection('formschemas');
  const schemas = await schemasCol.find({}, { projection: { "areas.actionPoints.questions.id": 1, "areas.actionPoints.questions.questionNumber": 1 } }).toArray();

  for (const s of schemas) {
    console.log(`Schema _id: ${s._id}`);
    for (const area of (s.areas || [])) {
      for (const ap of (area.actionPoints || [])) {
        for (const q of (ap.questions || [])) {
          console.log(`   - q.id: "${q.id}" (type: ${typeof q.id}) | q.questionNumber: "${q.questionNumber}"`);
        }
      }
    }
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
