import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FormSchemaModel } from '../models/FormSchema';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/srf_database';

const runMigration = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB. Starting migration...');

    const schemas = await FormSchemaModel.find({});

    for (const schema of schemas) {
      let schemaUpdated = false;

      schema.areas.forEach(area => {
        area.actionPoints.forEach(ap => {
          ap.questions.forEach(q => {
            if (!q.supportingDocuments) {
              q.supportingDocuments = [];
            }

            // Force update for specific questions
            if (['Q 1.1', 'Q 2.1', 'Q 2.2', 'Q 2.3'].includes(q.questionNumber) || ['q_1_1', 'q_2_1', 'q_2_2', 'q_2_3'].includes(q.id)) {
              q.supportingDocuments = [];
            }

            if (q.supportingDocuments.length === 0) {

              if (q.questionNumber === 'Q 1.1' || q.id === 'q_1_1') {
                q.supportingDocuments.push({
                  id: `doc_${q.id}_1`,
                  title: 'Government Order / Notification',
                  description: 'Official State/UT notification or Government Order outling Priority Sectors.',
                  mandatory: true,
                  acceptedFileTypes: ['.pdf', '.doc', '.docx'],
                  maxFiles: 5,
                  maxFileSize: 10
                });
                q.supportingDocuments.push({
                  id: `doc_${q.id}_2`,
                  title: 'Startup Policy Document',
                  description: 'State Startup Policy mentioning Priority Sectors.',
                  mandatory: true,
                  acceptedFileTypes: ['.pdf', '.doc', '.docx'],
                  maxFiles: 5,
                  maxFileSize: 10
                });
                schemaUpdated = true;
              }

              if (q.questionNumber === 'Q 2.1' || q.id === 'q_2_1') {
                q.supportingDocuments.push(
                  {
                    id: `doc_${q.id}_1`,
                    title: 'List of Priority Sectors',
                    description: 'List of identified Priority Sectors within the State / Union Territory.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.doc', '.docx', '.xlsx'],
                    maxFiles: 5,
                    maxFileSize: 10
                  },
                  {
                    id: `doc_${q.id}_2`,
                    title: 'State Notification / Government Order',
                    description: 'Details of state notification/government order/approval order in public domain outlining possible Priority Sectors.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.doc', '.docx'],
                    maxFiles: 5,
                    maxFileSize: 10
                  }
                );
                schemaUpdated = true;
              }

              if (q.questionNumber === 'Q 2.2' || q.id === 'q_2_2') {
                q.supportingDocuments.push(
                  {
                    id: `doc_${q.id}_1`,
                    title: 'Scheme Documents',
                    description: 'Scheme documents detailing each initiative or policy launched for priority sectors.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.doc', '.docx'],
                    maxFiles: 5,
                    maxFileSize: 10
                  },
                  {
                    id: `doc_${q.id}_2`,
                    title: 'Government Orders',
                    description: 'Government orders detailing each initiative.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.doc', '.docx'],
                    maxFiles: 5,
                    maxFileSize: 10
                  },
                  {
                    id: `doc_${q.id}_3`,
                    title: 'Official Notifications',
                    description: 'Official notifications.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.doc', '.docx'],
                    maxFiles: 5,
                    maxFileSize: 10
                  },
                  {
                    id: `doc_${q.id}_4`,
                    title: 'Press Releases',
                    description: 'Press releases, official website screenshots, or annual reports highlighting these initiatives.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
                    maxFiles: 5,
                    maxFileSize: 10
                  },
                  {
                    id: `doc_${q.id}_5`,
                    title: 'Beneficiary Startup List',
                    description: 'List of beneficiary Startups within the identified Priority Sectors.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.doc', '.docx', '.xlsx', '.csv'],
                    maxFiles: 5,
                    maxFileSize: 10
                  }
                );
                schemaUpdated = true;
              }

              if (q.questionNumber === 'Q 2.3' || q.id === 'q_2_3') {
                q.supportingDocuments.push(
                  {
                    id: `doc_${q.id}_1`,
                    title: 'Scheme Documents / G.O. / Circulars',
                    description: 'Detailing the Deep Tech and AI-focused initiatives or programs.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.doc', '.docx'],
                    maxFiles: 5,
                    maxFileSize: 10
                  },
                  {
                    id: `doc_${q.id}_2`,
                    title: 'Agendas, Brochures, Reports',
                    description: 'From knowledge-sharing seminars, workshops, hackathons, or conferences conducted.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
                    maxFiles: 5,
                    maxFileSize: 10
                  },
                  {
                    id: `doc_${q.id}_3`,
                    title: 'Participant / Beneficiary Lists',
                    description: 'Mentioning startup names supported under each initiative.',
                    mandatory: true,
                    acceptedFileTypes: ['.pdf', '.xlsx', '.csv'],
                    maxFiles: 5,
                    maxFileSize: 10
                  }
                );
                schemaUpdated = true;
              }

              // Generic fallback for other questions that have File Upload fields
              // We'll migrate the existing File Upload fields into Supporting Documents
              if (q.supportingDocuments && q.supportingDocuments.length === 0) {
                const fileFields = q.fields.filter((f: any) => f.type === 'File Upload' || f.type === 'PDF Upload');
                if (fileFields.length > 0) {
                  fileFields.forEach((ff: any) => {
                    q.supportingDocuments!.push({
                      id: `doc_${ff.id}`, // mapped to original field ID to keep data consistent if needed
                      title: ff.label,
                      description: 'Auto-migrated from legacy upload field.',
                      mandatory: ff.required,
                      acceptedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png', '.xlsx'],
                      maxFiles: 5,
                      maxFileSize: 10
                    });
                  });
                  schemaUpdated = true;
                }
              }
            }
          });
        });
      });

      if (schemaUpdated) {
        // Mongoose markModified is needed for nested mixed array updates if they are deeply nested
        schema.markModified('areas');
        await schema.save();
        console.log(`Schema updated successfully for edition: ${schema.editionId}`);
      } else {
        console.log(`No schema updates needed for edition: ${schema.editionId}`);
      }
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

runMigration();
