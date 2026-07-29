const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: DATABASE_URL is not defined in .env file.');
    process.exit(1);
  }
  await mongoose.connect(dbUrl);
  
  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    role: String,
    name: String,
    state: String
  }, { strict: false }));

  const users = await User.find({});
  console.log(users.map(u => ({ email: u.email, role: u.role, name: u.name, state: u.state })));
  process.exit();
}
run();
