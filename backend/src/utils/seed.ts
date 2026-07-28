import { User, Role } from '../models/User';
import { Edition, EditionStatus } from '../models/Edition';
import { Submission, SubmissionStatus } from '../models/Submission';
import { FormSchemaModel } from '../models/FormSchema';
import { Department } from '../models/Department';
import { SEED_SCHEMA } from './schemaData';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export const seedSuperAdmin = async () => {
  try {
    const superAdminExists = await User.findOne({ role: Role.SUPER_ADMIN });
    
    let adminId;
    if (!superAdminExists) {
      console.log('No Super Admin found. Seeding default Super Admin...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@123', salt);
      
      const newAdmin = await User.create({
        email: 'srfpapis@gmail.com',
        passwordHash: hashedPassword,
        role: Role.SUPER_ADMIN,
        isActive: true,
      });
      adminId = newAdmin._id;
      console.log('Default Super Admin seeded successfully (email: srfpapis@gmail.com)');
    } else {
      adminId = superAdminExists._id;
      console.log('Super Admin already exists.');
    }

    // Seed Dummy Data for Dashboard Visualization
    const editionExists = await Edition.findOne({ name: 'SRF 6.0' });
    if (!editionExists && adminId) {
      console.log('Seeding SRF 6.0 Edition and dummy Submissions for dashboard...');
      const edition = await Edition.create({
        name: 'SRF 6.0',
        version: '6.0',
        description: 'States Startup Ranking Framework 6th Edition',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-05-31'),
        status: EditionStatus.PUBLISHED,
        publishedAt: new Date(),
        createdBy: adminId
      });

      // Create a dummy user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('User@123', salt);
      const dummyUser = await User.create({
        email: 'user@state.gov.in',
        passwordHash: hashedPassword,
        role: Role.USER,
        state: 'Karnataka',
        isActive: true
      });

      // Seed dummy submissions (1 Draft, 2 Submitted/Pending, 3 Approved, 1 Rejected)
      const submissions = [
        { status: SubmissionStatus.DRAFT, stateName: 'Maharashtra' },
        { status: SubmissionStatus.UNDER_REVIEW, stateName: 'Gujarat' },
        { status: SubmissionStatus.UNDER_REVIEW, stateName: 'Kerala' },
        { status: SubmissionStatus.APPROVED, stateName: 'Karnataka' },
        { status: SubmissionStatus.APPROVED, stateName: 'Tamil Nadu' },
        { status: SubmissionStatus.APPROVED, stateName: 'Telangana' },
        { status: SubmissionStatus.REJECTED, stateName: 'Bihar' },
      ];

      for (const sub of submissions) {
        await Submission.create({
          editionId: edition._id,
          userId: dummyUser._id,
          stateName: sub.stateName,
          status: sub.status,
          totalScore: sub.status === SubmissionStatus.APPROVED ? 50 : 0
        });
      }
      console.log('Dummy Submissions seeded successfully.');
      
      // Seed Form Schema
      console.log('Seeding SRF 6.0 Form Schema...');
      await FormSchemaModel.create({
        editionId: edition._id,
        areas: SEED_SCHEMA.areas
      });
      console.log('SRF 6.0 Form Schema seeded successfully!');
    } else if (editionExists) {
      // Check if schema exists for this edition
      const schemaExists = await FormSchemaModel.findOne({ editionId: editionExists._id });
      if (!schemaExists) {
        console.log('Edition exists but Form Schema is missing. Seeding schema now...');
        await FormSchemaModel.create({
          editionId: editionExists._id,
          areas: SEED_SCHEMA.areas
        });
        console.log('SRF 6.0 Form Schema seeded successfully!');
      }
    }

    // Seed Departments
    console.log('Seeding initial departments...');
    const defaultDepts = [
      { name: 'DPIIT', code: 'DPIIT', description: 'Department for Promotion of Industry and Internal Trade' },
      { name: 'Ministry of Commerce', code: 'MOC', description: 'Ministry of Commerce and Industry' },
      { name: 'SIDBI', code: 'SIDBI', description: 'Small Industries Development Bank of India' },
      { name: 'Startup India Cell', code: 'SIC', description: 'Startup India Cell' },
      { name: 'State Nodal Agency', code: 'SNA', description: 'State Nodal Agency' },
      { name: 'District Industries Centre', code: 'DIC', description: 'District Industries Centre' }
    ];

    for (const dept of defaultDepts) {
      const exists = await Department.findOne({ name: dept.name });
      if (!exists) {
        await Department.create(dept);
      }
    }
    console.log('Initial departments seeded successfully!');

    // Ensure Q1.1 is present across all form schemas
    await ensureQuestion11AllSchemas();

  } catch (error) {
    console.error('Error seeding Super Admin:', error);
  }
};

export const ensureQuestion11AllSchemas = async () => {
  try {
    const schemas = await FormSchemaModel.find({});

    for (const schema of schemas) {
      if (schema.areas && schema.areas.length > 0) {
        const ap1 = schema.areas[0]?.actionPoints?.[0];
        if (ap1 && ap1.questions) {
          const existingQ = ap1.questions.find((q: any) => q.id === 'q_1_1');
          let needsUpdate = false;

          if (!existingQ) {
            const newQ = {
              id: "q_1_1",
              questionNumber: "1.1",
              weightage: 1,
              title: "Does your State/UT have an active Startup Policy?",
              requiredDocuments: "Date of official implementation of the State/UT Startup Policy\nG.O. / Notification and Policy Document",
              guidelinesRef: "Page 10",
              scoringCriteria: "Yes: 1, No: 0",
              fields: []
            };
            ap1.questions.unshift(newQ as any);
            needsUpdate = true;
          } else if (existingQ.fields && existingQ.fields.length > 0) {
            existingQ.fields = [];
            needsUpdate = true;
          }

          if (needsUpdate) {
            // Use findByIdAndUpdate to avoid VersionError
            await FormSchemaModel.findByIdAndUpdate(
              schema._id,
              { $set: { areas: schema.areas } },
              { new: false }
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('Error updating Q1.1 fields across schemas:', err);
  }
};

