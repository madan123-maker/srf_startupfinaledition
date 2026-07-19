import 'dotenv/config';
import mongoose from 'mongoose';
import { Edition } from '../src/models/Edition';
import { FormSchemaModel } from '../src/models/FormSchema';
import { SEED_SCHEMA } from '../src/utils/schemaData';

async function run() {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not found in env');
    await mongoose.connect(url);
    console.log('Connected to Atlas.');
    
    const editions = await Edition.find({ name: 'SRF 6.0' });
    console.log(`Found ${editions.length} editions named "SRF 6.0" in Atlas.`);
    
    for (const edition of editions) {
      console.log(`Seeding schema for edition: ${edition._id} (${edition.name})`);
      await FormSchemaModel.findOneAndUpdate(
        { editionId: edition._id },
        { areas: SEED_SCHEMA.areas },
        { upsert: true }
      );
    }
    console.log('Finished seeding Atlas.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
run();
