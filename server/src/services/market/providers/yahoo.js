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

async function quoteFromChart(sym) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || meta.regularMarketPrice == null) return null;
    const { price, currency } = normalizeCurrency(meta.regularMarketPrice, meta.currency);
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice;
    const scale = price / meta.regularMarketPrice;
    const change = (meta.regularMarketPrice - prevClose) * scale;
    const changePct = prevClose ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100 : 0;
    return {
      symbol: meta.symbol || sym,
      name: meta.shortName || meta.longName || sym,
      price,
      change,
      changePct,
      prevClose: prevClose * scale,
      currency,
      exchange: meta.fullExchangeName || meta.exchangeName || '',
      assetClass: classify({
        symbol: meta.symbol || sym,
        quoteType: meta.instrumentType,
        exchange: meta.exchangeName,
        fullExchangeName: meta.fullExchangeName,
        currency,
      }),
      marketState: meta.currentTradingPeriod?.regular ? 'REGULAR' : 'CLOSED',
      asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function quotes(symbols) {
  let list = [];
  try {
    const raw = await yf.quote(symbols, {}, { validateResult: false });
    const arr = Array.isArray(raw) ? raw : [raw];
    list = arr.map(toQuote).filter(Boolean);
  } catch (err) {
    // yf.quote may fail on cloud hosts due to crumb checks; we fall back below
  }

  const foundSymbols = new Set(list.map((q) => q.symbol.toUpperCase()));
  const missing = symbols.filter((s) => !foundSymbols.has(s.toUpperCase()));
  if (missing.length > 0) {
    const chartQuotes = await Promise.all(missing.map(quoteFromChart));
    list.push(...chartQuotes.filter(Boolean));
  }
  return list;
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
