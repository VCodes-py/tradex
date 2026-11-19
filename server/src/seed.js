// Creates a demo account with one holding in each asset class.
//   npm run seed
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from './config.js';
import { User } from './models/User.js';
import { Holding } from './models/Holding.js';

const EMAIL = 'demo@tradex.app';
const PASSWORD = 'demo-pass-123';

await mongoose.connect(config.mongoUri);
await User.deleteOne({ email: EMAIL });
const user = await User.create({ email: EMAIL, name: 'Demo', passwordHash: await bcrypt.hash(PASSWORD, 12), baseCurrency: 'USD' });
await Holding.deleteMany({ user: user._id });
await Holding.insertMany([
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'intl_stock', currency: 'USD', exchange: 'NASDAQ', quantity: 25, avgCost: 168.4 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', assetClass: 'intl_stock', currency: 'USD', exchange: 'NASDAQ', quantity: 12, avgCost: 112.2 },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', assetClass: 'indian_stock', currency: 'INR', exchange: 'NSE', quantity: 40, avgCost: 1285 },
  { symbol: 'ASML', name: 'ASML Holding', assetClass: 'intl_stock', currency: 'USD', exchange: 'NASDAQ', quantity: 4, avgCost: 710 },
  { symbol: 'BTC-USD', name: 'Bitcoin', assetClass: 'crypto', currency: 'USD', exchange: 'Crypto', quantity: 0.35, avgCost: 61250 },
  { symbol: 'ETH-USD', name: 'Ethereum', assetClass: 'crypto', currency: 'USD', exchange: 'Crypto', quantity: 4, avgCost: 2900 },
  { symbol: 'EURUSD=X', name: 'EUR/USD', assetClass: 'forex', currency: 'USD', exchange: 'FX', quantity: 5000, avgCost: 1.07 },
].map((h) => ({ ...h, user: user._id })));

console.log(`Seeded. Sign in with ${EMAIL} / ${PASSWORD}`);
await mongoose.disconnect();
