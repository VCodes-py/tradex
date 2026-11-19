import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Holding, ASSET_CLASSES } from '../models/Holding.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, validate, HttpError } from '../middleware/http.js';
import { getQuotes } from '../services/market/index.js';

const router = Router();
router.use(requireAuth);

const symbol = z.string().trim().toUpperCase().min(1).max(24).regex(/^[A-Z0-9.\-=^]+$/, 'Use a valid ticker symbol.');
const positive = z.coerce.number().positive('Enter a number greater than 0.').finite();

const findOwned = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Holding not found.');
  const holding = await Holding.findOne({ _id: req.params.id, user: req.userId });
  if (!holding) throw new HttpError(404, 'Holding not found.');
  return holding;
};

router.get('/', asyncHandler(async (req, res) => {
  res.json(await Holding.find({ user: req.userId }).sort({ createdAt: 1 }));
}));

// Buy: creates the holding, or adds to it and re-averages the cost.
router.post(
  '/',
  validate(z.object({
    symbol,
    quantity: positive,
    price: positive,
    // Only used if no provider can identify the symbol.
    name: z.string().trim().max(120).optional(),
    assetClass: z.enum(ASSET_CLASSES).optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
  })),
  asyncHandler(async (req, res) => {
    const { quantity, price } = req.body;
    let sym = req.body.symbol.trim().toUpperCase();
    const isIndian = sym.endsWith('.NS') || sym.endsWith('.BO') || req.body.assetClass === 'indian_stock';

    let quote = (await getQuotes([sym]))[sym];
    // If not found and user entered an Indian stock name/ticker without suffix, try .NS
    if (!quote && isIndian && !sym.includes('.')) {
      const nseSym = `${sym}.NS`;
      const nseQuote = (await getQuotes([nseSym]))[nseSym];
      if (nseQuote) {
        quote = nseQuote;
        sym = nseSym;
      }
    }

    const existing = await Holding.findOne({ user: req.userId, symbol: sym });
    if (existing) {
      const total = existing.quantity + quantity;
      existing.avgCost = (existing.quantity * existing.avgCost + quantity * price) / total;
      existing.quantity = total;
      await existing.save();
      return res.json(existing);
    }

    const assetClass = quote?.assetClass ?? req.body.assetClass ?? (isIndian ? 'indian_stock' : 'intl_stock');
    const currency = quote?.currency ?? req.body.currency ?? (isIndian ? 'INR' : 'USD');
    const exchange = quote?.exchange ?? (isIndian ? (sym.endsWith('.BO') ? 'BSE' : 'NSE') : '');

    const holding = await Holding.create({
      user: req.userId,
      symbol: sym,
      name: quote?.name ?? req.body.name ?? sym,
      assetClass,
      currency,
      exchange,
      quantity,
      avgCost: price,
    });
    res.status(201).json(holding);
  })
);

// Sell part or all of a holding. Selling everything removes it.
router.post(
  '/:id/sell',
  validate(z.object({ quantity: positive })),
  asyncHandler(async (req, res) => {
    const holding = await findOwned(req);
    if (req.body.quantity > holding.quantity) {
      throw new HttpError(400, `You only hold ${holding.quantity} of ${holding.symbol}.`);
    }
    if (req.body.quantity === holding.quantity) {
      await holding.deleteOne();
      return res.json({ removed: true });
    }
    holding.quantity -= req.body.quantity;
    await holding.save();
    res.json(holding);
  })
);

// Correct quantity or average cost directly.
router.put(
  '/:id',
  validate(z.object({ quantity: positive.optional(), avgCost: z.coerce.number().min(0).finite().optional() })),
  asyncHandler(async (req, res) => {
    const holding = await findOwned(req);
    Object.assign(holding, req.body);
    await holding.save();
    res.json(holding);
  })
);

router.delete('/:id', asyncHandler(async (req, res) => {
  const holding = await findOwned(req);
  await holding.deleteOne();
  res.status(204).end();
}));

export default router;
