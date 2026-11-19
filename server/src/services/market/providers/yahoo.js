import YahooFinance from 'yahoo-finance2';
import { classify, normalizeCurrency } from '../classify.js';

const yf = new YahooFinance();
export const name = 'Yahoo Finance';

function toQuote(q) {
  if (q?.regularMarketPrice == null) return null;
  const { price, currency } = normalizeCurrency(q.regularMarketPrice, q.currency);
  const scale = price / q.regularMarketPrice; // 0.01 for pence, otherwise 1
  return {
    symbol: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    price,
    change: (q.regularMarketChange ?? 0) * scale,
    changePct: q.regularMarketChangePercent ?? 0,
    prevClose: (q.regularMarketPreviousClose ?? q.regularMarketPrice) * scale,
    currency,
    exchange: q.fullExchangeName || q.exchange || '',
    assetClass: classify({ symbol: q.symbol, quoteType: q.quoteType, exchange: q.exchange, fullExchangeName: q.fullExchangeName, currency }),
    marketState: q.marketState || 'UNKNOWN',
    asOf: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : new Date().toISOString(),
  };
}

export async function quotes(symbols) {
  const raw = await yf.quote(symbols, {}, { validateResult: false });
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(toQuote).filter(Boolean);
}

export async function search(query) {
  const res = await yf.search(query, { quotesCount: 10, newsCount: 0 }, { validateResult: false });
  return (res.quotes || [])
    .filter((r) => r.symbol && ['EQUITY', 'ETF', 'CRYPTOCURRENCY', 'CURRENCY', 'INDEX', 'MUTUALFUND'].includes(r.quoteType))
    .map((r) => ({
      symbol: r.symbol,
      name: r.shortname || r.longname || r.symbol,
      exchange: r.exchDisp || r.exchange || '',
      assetClass: classify({ symbol: r.symbol, quoteType: r.quoteType, exchange: r.exchange, fullExchangeName: r.exchDisp }),
    }));
}

/** @returns {Promise<{time:number, open:number, high:number, low:number, close:number}[]>} time = unix seconds */
export async function history(symbol, { days, interval }) {
  const period1 = new Date(Date.now() - days * 86400_000);
  const res = await yf.chart(symbol, { period1, interval }, { validateResult: false });
  const scale = res.meta?.currency === 'GBp' ? 0.01 : 1;
  return (res.quotes || [])
    .filter((c) => c.close != null && c.open != null)
    .map((c) => ({
      time: Math.floor(new Date(c.date).getTime() / 1000),
      open: c.open * scale,
      high: (c.high ?? c.close) * scale,
      low: (c.low ?? c.close) * scale,
      close: c.close * scale,
    }));
}

/** Direct FX rate, e.g. fxRate('USD','INR'). */
export async function fxRate(from, to) {
  if (from === to) return 1;
  const [q] = await quotes([`${from}${to}=X`]);
  if (q?.price) return q.price;
  const [inv] = await quotes([`${to}${from}=X`]);
  if (inv?.price) return 1 / inv.price;
  throw new Error('No FX quote');
}
