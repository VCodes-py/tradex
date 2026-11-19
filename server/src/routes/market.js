import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, validate, HttpError } from '../middleware/http.js';
import { getQuotes, getHistory, searchSymbols, getFxRates, DEFAULT_TICKER, RANGE_KEYS } from '../services/market/index.js';

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
    base: z.string().trim().toUpperCase().length(3).optional(),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const rawQuotes = await getQuotes(req.query.symbols);
    const base = req.query.base;
    if (base) {
      const currencies = Object.values(rawQuotes).map((q) => q.currency).filter(Boolean);
      const rates = await getFxRates(currencies, base);
      const enriched = {};
      for (const [sym, q] of Object.entries(rawQuotes)) {
        const fx = q.currency === base ? 1 : rates[q.currency];
        const hasFx = Number.isFinite(fx);
        enriched[sym] = {
          ...q,
          baseCurrency: base,
          fxRate: hasFx ? fx : null,
          basePrice: hasFx ? q.price * fx : null,
          baseChange: hasFx ? q.change * fx : null,
        };
      }
      return res.json(enriched);
    }
    res.json(rawQuotes);
  })
);

router.get(
  '/convert',
  validate(z.object({
    from: z.string().trim().toUpperCase().length(3),
    to: z.string().trim().toUpperCase().length(3),
    amount: z.coerce.number().default(1),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { from, to, amount } = req.query;
    if (from === to) return res.json({ from, to, amount, rate: 1, result: amount });
    const rates = await getFxRates([from], to);
    const rate = rates[from];
    if (!Number.isFinite(rate)) throw new HttpError(422, `Unable to convert from ${from} to ${to}`);
    res.json({ from, to, amount, rate, result: amount * rate });
  })
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
