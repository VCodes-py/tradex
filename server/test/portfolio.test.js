import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSummary } from '../src/services/portfolio.js';

const holdings = [
  { _id: 'a', symbol: 'AAPL', assetClass: 'intl_stock', currency: 'USD', quantity: 10, avgCost: 100 },
  { _id: 'b', symbol: 'RELIANCE.NS', assetClass: 'indian_stock', currency: 'INR', quantity: 100, avgCost: 1000 },
  { _id: 'c', symbol: 'BTC-USD', assetClass: 'crypto', currency: 'USD', quantity: 1, avgCost: 50000 },
];
const quotes = {
  AAPL: { price: 150, change: 3, changePct: 2 },
  'RELIANCE.NS': { price: 1200, change: -12, changePct: -1 },
  // BTC-USD has no quote: it must be reported as unpriced, not silently valued at 0.
};
const rates = { INR: 0.012, USD: 1 };

test('values positions in the base currency using FX rates', () => {
  const s = computeSummary({ holdings, quotes, rates, baseCurrency: 'USD' });
  const aapl = s.positions.find((p) => p.symbol === 'AAPL');
  const rel = s.positions.find((p) => p.symbol === 'RELIANCE.NS');
  assert.equal(aapl.value, 1500);
  assert.equal(aapl.pnl, 500);
  assert.ok(Math.abs(rel.value - 100 * 1200 * 0.012) < 1e-9);
  assert.ok(Math.abs(rel.cost - 100 * 1000 * 0.012) < 1e-9);
});

test('unpriced holdings are excluded from totals and counted', () => {
  const s = computeSummary({ holdings, quotes, rates, baseCurrency: 'USD' });
  assert.equal(s.totals.unpriced, 1);
  assert.equal(s.positions.find((p) => p.symbol === 'BTC-USD').priced, false);
  assert.equal(s.totals.value, 1500 + 1440);
});

test('a missing FX rate marks the holding unpriced', () => {
  const s = computeSummary({ holdings, quotes, rates: { USD: 1 }, baseCurrency: 'USD' });
  assert.equal(s.positions.find((p) => p.symbol === 'RELIANCE.NS').priced, false);
});

test('allocation weights sum to 100 and day change is aggregated', () => {
  const s = computeSummary({ holdings, quotes, rates, baseCurrency: 'USD' });
  const total = s.allocation.reduce((a, b) => a + b.weight, 0);
  assert.ok(Math.abs(total - 100) < 1e-9);
  assert.ok(Math.abs(s.totals.dayChange - (30 + -12 * 100 * 0.012)) < 1e-9);
});

test('empty portfolio does not divide by zero', () => {
  const s = computeSummary({ holdings: [], quotes: {}, rates: {}, baseCurrency: 'USD' });
  assert.equal(s.totals.value, 0);
  assert.equal(s.totals.pnlPct, 0);
  assert.deepEqual(s.allocation, []);
});
