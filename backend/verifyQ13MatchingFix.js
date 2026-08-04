const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("      VERIFYING QUESTION ID MATCHING LOGIC ACROSS ALL SUBMISSIONS");
  console.log("==========================================================================\n");

  const schemasCol = mongoose.connection.collection('formschemas');
  const submissionsCol = mongoose.connection.collection('submissions');

  const schema = await schemasCol.findOne({});
  const submissions = await submissionsCol.find({}).toArray();

  const allQuestions = [];
  for (const area of (schema?.areas || [])) {
    for (const ap of (area.actionPoints || [])) {
      for (const q of (ap.questions || [])) {
        allQuestions.push(q);
      }
    }
  }

  console.log(`Total Questions in Schema: ${allQuestions.length}`);

  for (const sub of submissions) {
    console.log(`\nState: "${sub.stateName}" | Submission _id: "${sub._id}"`);
    let exactMatches = 0;
    let normalizedMatches = 0;
    let failedMatches = 0;

    for (const q of allQuestions) {
      const qNumFormatted = `q_${String(q.questionNumber || '').replace(/\./g, '_')}`;
      
      // Strict matching (CURRENT BROKEN WAY IN UI)
      const strictResp = sub.responses?.find(r => String(r.questionId) === String(q.id));
      
      // Normalized matching (NEW REPAIR)
      const normResp = sub.responses?.find(r => 
        String(r.questionId) === String(q.id) || 
        String(r.questionId) === qNumFormatted || 
        String(r.questionId) === String(q.questionNumber) ||
        String(r.questionId).replace(/^q_/, '').replace(/_/g, '.') === String(q.questionNumber)
      );

      if (strictResp) {
        exactMatches++;
      } else if (normResp) {
        normalizedMatches++;
        console.log(`   ⚠️ QUESTION MATCH MISMATCH RECOVERED FOR Q${q.questionNumber}:`);
        console.log(`        Schema q.id          : "${q.id}"`);
        console.log(`        Schema q.num         : "${q.questionNumber}"`);
        console.log(`        Submission r.qId     : "${normResp.questionId}"`);
        console.log(`        Has Supporting Docs? : ${(normResp.supportingDocumentResponses || []).length > 0}`);
      } else {
        failedMatches++;
      }
    }

    console.log(`   --> Result: ${exactMatches} Exact Matches, ${normalizedMatches} Recovered Matches, ${failedMatches} Unanswered`);
  }

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
