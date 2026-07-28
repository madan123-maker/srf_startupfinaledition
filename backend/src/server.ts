import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';
import { seedSuperAdmin } from './utils/seed';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();
  await seedSuperAdmin();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
};

startServer();
