import { config } from '../../config.js';
import { cached } from '../cache.js';
import * as yahoo from './providers/yahoo.js';
import * as coingecko from './providers/coingecko.js';
import * as twelvedata from './providers/twelvedata.js';
import * as frankfurter from './providers/frankfurter.js';

// Yahoo is the default for everything. Official/free-tier APIs are the fallback.
const CHAINS = {
  crypto: [yahoo, coingecko],
  forex: [yahoo, frankfurter],
  stock: [yahoo, twelvedata],
};

export const isCryptoSymbol = (s) => /^[A-Z0-9]{2,10}-[A-Z]{3,4}$/.test(s);
export const isForexSymbol = (s) => /=X$/.test(s);
export const chainKeyFor = (s) => (isForexSymbol(s) ? 'forex' : isCryptoSymbol(s) ? 'crypto' : 'stock');
const usable = (p) => !p.enabled || p.enabled();

export function providerStatus() {
  return { yahoo: true, coingecko: true, frankfurter: true, twelvedata: twelvedata.enabled() };
}

/**
 * Try each provider in order. Symbols a provider doesn't return are passed to the next one.
 * Errors are logged and swallowed so a single outage never takes the dashboard down.
 */
export async function fetchWithFallback(chain, symbols, call = 'quotes') {
  let remaining = [...symbols];
  const found = [];
  for (const provider of chain) {
    if (!remaining.length) break;
    if (!usable(provider)) continue;
    try {
      const rows = await provider[call](remaining);
      for (const row of rows) found.push({ ...row, source: provider.name });
      const got = new Set(rows.map((r) => r.symbol.toUpperCase()));
      remaining = remaining.filter((s) => !got.has(s));
    } catch (err) {
      console.warn(`[market] ${provider.name} ${call} failed: ${err.message}`);
    }
  }
  return found;
}

const quoteStore = new Map(); // symbol -> { quote, fetchedAt }

/** @returns {Promise<Record<string, object>>} quotes keyed by upper-case symbol */
export async function getQuotes(symbols) {
  const wanted = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const out = {};
  const stale = [];
  for (const s of wanted) {
    const hit = quoteStore.get(s);
    if (hit && Date.now() - hit.fetchedAt < config.quoteTtlMs) out[s] = hit.quote;
    else stale.push(s);
  }

  const groups = { crypto: [], forex: [], stock: [] };
  for (const s of stale) groups[chainKeyFor(s)].push(s);

  await Promise.all(
    Object.entries(groups).map(async ([key, list]) => {
      if (!list.length) return;
      const rows = await fetchWithFallback(CHAINS[key], list);
      for (const q of rows) {
        const sym = q.symbol.toUpperCase();
        quoteStore.set(sym, { quote: q, fetchedAt: Date.now() });
        out[sym] = q;
      }
    })
  );

  // If every provider failed for a symbol, serve the last known quote (flagged) instead of nothing.
  for (const s of stale) {
    if (!out[s] && quoteStore.has(s)) out[s] = { ...quoteStore.get(s).quote, stale: true };
  }
  return out;
}

const RANGES = {
  '1D': { days: 1, interval: '5m' },
  '5D': { days: 5, interval: '15m' },
  '1M': { days: 30, interval: '1d' },
  '6M': { days: 182, interval: '1d' },
  '1Y': { days: 365, interval: '1d' },
  '5Y': { days: 1825, interval: '1wk' },
};
export const RANGE_KEYS = Object.keys(RANGES);

export async function getHistory(symbol, range = '1M') {
  const sym = symbol.toUpperCase();
  const opts = RANGES[range] || RANGES['1M'];
  const ttl = opts.days <= 5 ? 60_000 : 10 * 60_000;
  return cached(`hist:${sym}:${range}`, ttl, async () => {
    for (const provider of CHAINS[chainKeyFor(sym)]) {
      if (!usable(provider)) continue;
      try {
        const candles = await provider.history(sym, opts);
        if (candles.length) return { symbol: sym, range, candles, source: provider.name };
      } catch (err) {
        console.warn(`[market] ${provider.name} history failed: ${err.message}`);
      }
    }
    return { symbol: sym, range, candles: [], source: null };
  });
}

export async function searchSymbols(query) {
  const q = query.trim();
  return cached(`search:${q.toLowerCase()}`, 5 * 60_000, async () => {
    for (const provider of [yahoo, twelvedata, coingecko]) {
      if (!usable(provider)) continue;
      try {
        const rows = await provider.search(q);
        if (rows.length) return rows;
      } catch (err) {
        console.warn(`[market] ${provider.name} search failed: ${err.message}`);
      }
    }
    return [];
  });
}

/**
 * Multipliers that convert 1 unit of each currency into `base`.
 * A currency whose rate can't be found is left out; callers must handle that.
 */
export async function getFxRates(currencies, base) {
  const rates = { [base]: 1 };
  await Promise.all(
    [...new Set(currencies)].filter((c) => c !== base).map(async (cur) => {
      try {
        rates[cur] = await cached(`fx:${cur}${base}`, 5 * 60_000, async () => {
          for (const provider of [yahoo, frankfurter]) {
            try {
              return await provider.fxRate(cur, base);
            } catch (err) {
              console.warn(`[market] ${provider.name} fx ${cur}/${base} failed: ${err.message}`);
            }
          }
          throw new Error('No FX source available');
        });
      } catch {
        /* leave unset */
      }
    })
  );
  return rates;
}

export const DEFAULT_TICKER = ['^GSPC', '^IXIC', '^NSEI', '^FTSE', 'BTC-USD', 'ETH-USD', 'EURUSD=X', 'USDINR=X', 'GC=F'];
