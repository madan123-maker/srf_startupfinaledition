require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function run() {
  await mongoose.connect('mongodb+srv://nithish:Nithish$07@srf.dxasjd0.mongodb.net/srf_db?appName=srf');
  
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
