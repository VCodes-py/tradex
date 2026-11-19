import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
import { ensureDemoUser } from './seed.js';

try {
  await mongoose.connect(config.mongoUri);
  console.log('[db] connected');
  await ensureDemoUser();
} catch (err) {
  console.error(`[db] could not connect to ${config.mongoUri}: ${err.message}`);
  process.exit(1);
}

// Only start accepting requests once the database is ready.
createApp().listen(config.port, () => console.log(`[api] listening on http://localhost:${config.port}`));
