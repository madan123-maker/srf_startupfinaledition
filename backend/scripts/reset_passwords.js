const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: DATABASE_URL is not defined in .env file.');
    process.exit(1);
  }
  await mongoose.connect(dbUrl);
  
  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    passwordHash: String,
  }, { strict: false }));

  const users = await User.find({});
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);

  for (let user of users) {
    user.passwordHash = hash;
    await user.save();
    console.log(`Reset password for ${user.email} to "password123"`);
  }
  
  console.log('All passwords have been reset successfully.');
  process.exit();
}
run();
