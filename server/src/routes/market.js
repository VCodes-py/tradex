import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/http.js';
import { getQuotes, getHistory, searchSymbols, DEFAULT_TICKER, RANGE_KEYS } from '../services/market/index.js';

const router = Router();
router.use(requireAuth); // protects the free-tier API quotas from anonymous traffic

router.get(
  '/search',
  validate(z.object({ q: z.string().trim().min(1).max(40) }), 'query'),
  asyncHandler(async (req, res) => res.json(await searchSymbols(req.query.q)))
);

router.get(
  '/quotes',
  validate(z.object({
    symbols: z.string().trim().min(1).transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 40)),
  }), 'query'),
  asyncHandler(async (req, res) => res.json(await getQuotes(req.query.symbols)))
);

router.get('/ticker', asyncHandler(async (req, res) => {
  const quotes = await getQuotes(DEFAULT_TICKER);
  res.json(DEFAULT_TICKER.map((s) => quotes[s]).filter(Boolean));
}));

router.get(
  '/history',
  validate(z.object({
    symbol: z.string().trim().min(1).max(24),
    range: z.enum(RANGE_KEYS).default('1M'),
  }), 'query'),
  asyncHandler(async (req, res) => res.json(await getHistory(req.query.symbol, req.query.range)))
);

export default router;
