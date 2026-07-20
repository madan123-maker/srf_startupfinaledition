import mongoose from 'mongoose';
import 'dotenv/config';
import { connectDB } from '../config/db';
import { Submission } from '../models/Submission';
import { FormSchemaModel } from '../models/FormSchema';
import { Evaluation } from '../models/Evaluation';
import { User, Role } from '../models/User';

const migrateScores = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    // Get a default admin user to act as the evaluator
    const adminUser = await User.findOne({ role: Role.SUPER_ADMIN });
    if (!adminUser) {
      console.log('No SUPER_ADMIN found to act as evaluator.');
      return;
    }

    const submissions = await Submission.find({});
    console.log(`Found ${submissions.length} submissions to migrate.`);

    for (const sub of submissions) {
      const formSchema = await FormSchemaModel.findOne({ editionId: sub.editionId });
      if (!formSchema) {
        console.log(`FormSchema not found for edition ${sub.editionId}`);
        continue;
      }

      let evaluation = await Evaluation.findOne({ submissionId: sub._id, evaluatorId: adminUser._id });
      if (!evaluation) {
        evaluation = new Evaluation({
          submissionId: sub._id,
          evaluatorId: adminUser._id,
          round: 'Round 1',
          status: 'Evaluating',
          answers: []
        });
      }

      let submissionTotalScore = 0;

      for (const response of sub.responses) {
        // Find question in schema to get weightage/maxScore
        let questionNode = null;
        for (const area of formSchema.areas) {
          for (const ap of area.actionPoints) {
            const q = ap.questions.find(q => q.id === response.questionId);
            if (q) {
              questionNode = q;
              break;
            }
          }
          if (questionNode) break;
        }

        if (!questionNode) continue;

        // Check if ANY field in this question's response is APPROVED
        const hasApprovedField = response.fieldResponses?.some(f => f.evaluationStatus === 'APPROVED');
        const hasApprovedAdditional = response.additionalFiles?.some(f => f.evaluationStatus === 'APPROVED');

        if (hasApprovedField || hasApprovedAdditional) {
          const scoreToAward = questionNode.maxScore || questionNode.weightage || 0;
          
          // Add to evaluation
          const existingAnswerIndex = evaluation.answers.findIndex(a => a.questionId === response.questionId);
          if (existingAnswerIndex >= 0) {
            evaluation.answers[existingAnswerIndex].awardedScore = scoreToAward;
            evaluation.answers[existingAnswerIndex].evaluatorRemarks = 'Auto-migrated from approved documents';
          } else {
            evaluation.answers.push({
              questionId: response.questionId,
              awardedScore: scoreToAward,
              evaluatorRemarks: 'Auto-migrated from approved documents',
              evaluatorAction: 'Awarded'
            });
          }

          submissionTotalScore += scoreToAward;
          console.log(`Awarded ${scoreToAward} points to Sub ${sub._id} Question ${response.questionId}`);
        }
      }

      await evaluation.save();
      
      // Update the main submission object for immediate dashboard reflection
      sub.totalScore = submissionTotalScore;
      await sub.save();
      
      console.log(`Updated Submission ${sub._id} - Total Score: ${submissionTotalScore}`);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateScores();
