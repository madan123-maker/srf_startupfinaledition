require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://nithish:Nithish$07@srf.dxasjd0.mongodb.net/srf_db?appName=srf');
  
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
