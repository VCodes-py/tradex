import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/http.js';
import { User } from '../models/User.js';
import { Holding } from '../models/Holding.js';
import { getQuotes, getFxRates } from '../services/market/index.js';
import { computeSummary } from '../services/portfolio.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, 'Account not found. Sign in again.');
  const holdings = await Holding.find({ user: req.userId }).lean();
  const baseCurrency = String(req.query.base || user.baseCurrency || 'USD').trim().toUpperCase();

  const currencies = [...new Set(holdings.map((h) => h.currency))];
  const [quotes, rates] = await Promise.all([
    getQuotes(holdings.map((h) => h.symbol)),
    getFxRates(currencies, baseCurrency),
  ]);

  const summary = computeSummary({ holdings, quotes, rates, baseCurrency });
  const sources = [...new Set(summary.positions.map((p) => p.source).filter(Boolean))];
  res.json({ ...summary, rates, sources, asOf: new Date().toISOString() });
}));

export default router;
