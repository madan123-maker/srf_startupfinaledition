require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;
const dbUrl = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/srf_db';

mongoose.connect(dbUrl).then(async () => {
  const TestModel = mongoose.model('Test', new Schema({ name: String }));
  try {
    const res = await TestModel.findById('undefined');
    console.log('Result:', res);
  } catch (e) {
    console.log('Error:', e.message);
  }
  process.exit();
});
