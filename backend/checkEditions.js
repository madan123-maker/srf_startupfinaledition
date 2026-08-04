const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.DATABASE_URL)
  .then(async () => {
    const editions = await mongoose.connection.collection('editions').find({}).toArray();
    console.log(JSON.stringify(editions, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
