import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Edition, EditionStatus } from '../models/Edition';
import { FormSchemaModel } from '../models/FormSchema';
import { Assignment } from '../models/Assignment';
import { Submission } from '../models/Submission';
import { GuidelinePdf } from '../models/GuidelinePdf';
import { SEED_SCHEMA } from '../utils/schemaData';

async function seedSrf6AndFixAssignments() {
  try {
    console.log('=== STARTING SRF 6.0 DATABASE MIGRATION & SEEDING ===');
    await mongoose.connect(process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/srf_database');
    console.log('Connected to MongoDB database.');

    // 1. Find or create SRF 6.0 Edition
    let srf6 = await Edition.findOne({ name: /SRF 6\.0|6th/i });
    if (!srf6) {
      console.log('SRF 6.0 Edition not found. Creating SRF 6.0 Edition...');
      srf6 = await Edition.create({
        name: 'SRF 6.0',
        version: '6.0',
        description: 'States Startup Ranking Framework 6th Edition (August 2025)',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-05-31'),
        status: EditionStatus.PUBLISHED,
        publishedAt: new Date()
      });
      console.log(`Created SRF 6.0 Edition with ID: ${srf6._id}`);
    } else {
      srf6.name = 'SRF 6.0';
      srf6.version = '6.0';
      srf6.description = 'States Startup Ranking Framework 6th Edition (August 2025)';
      srf6.status = EditionStatus.PUBLISHED;
      srf6.publishedAt = srf6.publishedAt || new Date();
      await srf6.save();
      console.log(`Updated SRF 6.0 Edition (${srf6._id}) to PUBLISHED.`);
    }

    // 2. Seed / Update Form Schema for SRF 6.0
    const schemaDoc = await FormSchemaModel.findOneAndUpdate(
      { editionId: srf6._id },
      { editionId: srf6._id, areas: SEED_SCHEMA.areas },
      { upsert: true, new: true }
    );
    console.log(`Successfully seeded/updated Form Schema for SRF 6.0! (Areas: ${schemaDoc.areas.length})`);

    // 3. Re-link ALL Assignments to SRF 6.0
    const updatedAssignments = await Assignment.updateMany(
      {},
      { editionId: srf6._id }
    );
    console.log(`Re-linked ${updatedAssignments.modifiedCount} assignment(s) to SRF 6.0 Edition.`);

    // 4. Re-link ALL Submissions to SRF 6.0
    const updatedSubmissions = await Submission.updateMany(
      {},
      { editionId: srf6._id }
    );
    console.log(`Re-linked ${updatedSubmissions.modifiedCount} submission(s) to SRF 6.0 Edition.`);

    // 5. Clean up any SRF 7.0 editions so SRF 6.0 is the active edition
    const deletedEditions = await Edition.deleteMany({
      _id: { $ne: srf6._id },
      name: /7\.0|7th/i
    });
    console.log(`Removed ${deletedEditions.deletedCount} SRF 7.0 edition(s) from database.`);

    // 6. Link Guideline PDF for SRF 6.0
    const pdfPath = path.join(__dirname, '../../../frontend/public/guidelines.pdf');
    if (fs.existsSync(pdfPath)) {
      const pdfBuffer = fs.readFileSync(pdfPath);
      await GuidelinePdf.deleteMany({ editionId: srf6._id });
      const pdfDoc = await GuidelinePdf.create({
        editionId: srf6._id,
        filename: 'guidelines.pdf',
        contentType: 'application/pdf',
        size: pdfBuffer.length,
        data: pdfBuffer,
      });

      await Edition.findByIdAndUpdate(srf6._id, {
        guidelineFileId: pdfDoc._id,
        guidelineFileName: 'guidelines.pdf',
      });
      console.log(`Seeded SRF 6.0 47-page Guideline PDF into database (${pdfBuffer.length} bytes).`);
    }

    console.log('\n=== SRF 6.0 SEEDING & MIGRATION COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

seedSrf6AndFixAssignments();
