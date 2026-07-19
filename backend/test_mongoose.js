const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect('mongodb+srv://nithish:Nithish$07@srf.dxasjd0.mongodb.net/srf_db?appName=srf').then(async () => {
  const TestModel = mongoose.model('Test', new Schema({ name: String }));
  try {
    const res = await TestModel.findById('undefined');
    console.log('Result:', res);
  } catch (e) {
    console.log('Error:', e.message);
  }
  process.exit();
});
