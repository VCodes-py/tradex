import 'dotenv/config';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) {
    throw new Error('JWT_SECRET is required in production. Generate one with: openssl rand -hex 32');
  }
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET not set. Using a random dev secret; logins reset on every restart.');
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tradex',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  // Optional fallback providers. Leave empty to disable.
  twelveDataKey: process.env.TWELVEDATA_API_KEY || '',
  coingeckoKey: process.env.COINGECKO_API_KEY || '',
  quoteTtlMs: Number(process.env.QUOTE_TTL_SECONDS || 30) * 1000,
};
