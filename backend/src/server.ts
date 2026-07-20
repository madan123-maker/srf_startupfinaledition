import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';
import { seedSuperAdmin } from './utils/seed';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();
  await seedSuperAdmin();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
