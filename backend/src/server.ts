import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';
import { seedSuperAdmin } from './utils/seed';

import { validateR2ConfigOnStartup } from './config/r2';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    validateR2ConfigOnStartup();
  } catch (err: any) {
    console.error('Fatal configuration check failed:', err.message);
  }
  await connectDB();
  await seedSuperAdmin();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
};

startServer();
