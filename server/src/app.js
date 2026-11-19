import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { errorHandler } from './middleware/http.js';
import { providerStatus } from './services/market/index.js';
import authRoutes from './routes/auth.js';
import holdingRoutes from './routes/holdings.js';
import marketRoutes from './routes/market.js';
import portfolioRoutes from './routes/portfolio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-7', legacyHeaders: false }));

  app.get('/api/health', (req, res) => res.json({ ok: true, providers: providerStatus() }));
  app.use('/api/auth', authRoutes);
  app.use('/api/holdings', holdingRoutes);
  app.use('/api/market', marketRoutes);
  app.use('/api/portfolio', portfolioRoutes);

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

  // Serve production client build if available
  const distPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
