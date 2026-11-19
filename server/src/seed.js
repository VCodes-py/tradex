// Demo account auto-seeder & standalone script.
//   npm run seed
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from './config.js';
import { User } from './models/User.js';
import { Holding } from './models/Holding.js';

export const DEMO_EMAIL = 'demo@tradex.app';
export const DEMO_PASSWORD = 'demo-pass-123';

export async function ensureDemoUser() {
  try {
    let user = await User.findOne({ email: DEMO_EMAIL });
    if (!user) {
      user = await User.create({
        email: DEMO_EMAIL,
        name: 'Demo',
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
        baseCurrency: 'USD',
      });
      console.log('[seed] Demo user auto-created');
    }
    const count = await Holding.countDocuments({ user: user._id });
    if (count === 0) {
      await Holding.insertMany([
        { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'intl_stock', currency: 'USD', exchange: 'NASDAQ', quantity: 25, avgCost: 168.4, user: user._id },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', assetClass: 'intl_stock', currency: 'USD', exchange: 'NASDAQ', quantity: 12, avgCost: 112.2, user: user._id },
        { symbol: 'RELIANCE.NS', name: 'Reliance Industries', assetClass: 'indian_stock', currency: 'INR', exchange: 'NSE', quantity: 40, avgCost: 1285, user: user._id },
        { symbol: 'ASML', name: 'ASML Holding', assetClass: 'intl_stock', currency: 'USD', exchange: 'NASDAQ', quantity: 4, avgCost: 710, user: user._id },
        { symbol: 'BTC-USD', name: 'Bitcoin', assetClass: 'crypto', currency: 'USD', exchange: 'Crypto', quantity: 0.35, avgCost: 61250, user: user._id },
        { symbol: 'ETH-USD', name: 'Ethereum', assetClass: 'crypto', currency: 'USD', exchange: 'Crypto', quantity: 4, avgCost: 2900, user: user._id },
        { symbol: 'EURUSD=X', name: 'EUR/USD', assetClass: 'forex', currency: 'USD', exchange: 'FX', quantity: 5000, avgCost: 1.07, user: user._id },
      ]);
      console.log('[seed] Demo holdings auto-seeded');
    }
  } catch (err) {
    console.warn('[seed] Could not auto-seed demo user:', err.message);
  }
}

if (process.argv[1]?.includes('seed.js')) {
  await mongoose.connect(config.mongoUri);
  await User.deleteOne({ email: DEMO_EMAIL });
  await ensureDemoUser();
  console.log(`Seeded. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
}
