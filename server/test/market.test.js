import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithFallback, chainKeyFor } from '../src/services/market/index.js';
import { classify, normalizeCurrency } from '../src/services/market/classify.js';

const ok = (name, symbols) => ({ name, quotes: async (req) => req.filter((s) => symbols.includes(s)).map((symbol) => ({ symbol, price: 1 })) });
const broken = (name) => ({ name, quotes: async () => { throw new Error('boom'); } });

test('falls back to the next provider when the first throws', async () => {
  const rows = await fetchWithFallback([broken('A'), ok('B', ['X'])], ['X']);
  assert.deepEqual(rows.map((r) => [r.symbol, r.source]), [['X', 'B']]);
});

test('symbols the first provider misses are requested from the next', async () => {
  const rows = await fetchWithFallback([ok('A', ['X']), ok('B', ['Y'])], ['X', 'Y']);
  const bySymbol = Object.fromEntries(rows.map((r) => [r.symbol, r.source]));
  assert.deepEqual(bySymbol, { X: 'A', Y: 'B' });
});

test('skips providers that are not enabled', async () => {
  const disabled = { ...ok('D', ['X']), enabled: () => false };
  const rows = await fetchWithFallback([disabled, ok('B', ['X'])], ['X']);
  assert.equal(rows[0].source, 'B');
});

test('returns nothing (not an error) when every provider fails', async () => {
  assert.deepEqual(await fetchWithFallback([broken('A'), broken('B')], ['X']), []);
});

test('routes symbols to the right provider chain', () => {
  assert.equal(chainKeyFor('BTC-USD'), 'crypto');
  assert.equal(chainKeyFor('EURUSD=X'), 'forex');
  assert.equal(chainKeyFor('AAPL'), 'stock');
  assert.equal(chainKeyFor('BRK-B'), 'stock');
  assert.equal(chainKeyFor('RELIANCE.NS'), 'stock');
});

test('classifies instruments into asset classes', () => {
  assert.equal(classify({ quoteType: 'CRYPTOCURRENCY' }), 'crypto');
  assert.equal(classify({ quoteType: 'CURRENCY' }), 'forex');
  assert.equal(classify({ quoteType: 'EQUITY', exchange: 'NMS' }), 'intl_stock');
  assert.equal(classify({ quoteType: 'EQUITY', exchange: 'NSI', fullExchangeName: 'NSE' }), 'indian_stock');
  assert.equal(classify({ symbol: 'RELIANCE.NS', quoteType: 'EQUITY' }), 'indian_stock');
  assert.equal(classify({ symbol: 'AAPL', quoteType: 'EQUITY', exchange: 'NAS' }), 'intl_stock');
});

test('converts pence to pounds', () => {
  assert.deepEqual(normalizeCurrency(250, 'GBp'), { price: 2.5, currency: 'GBP' });
  assert.deepEqual(normalizeCurrency(10, 'usd'), { price: 10, currency: 'USD' });
});
