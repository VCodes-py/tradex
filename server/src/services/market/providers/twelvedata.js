import { config } from '../../../config.js';
import { classify } from '../classify.js';

export const name = 'Twelve Data';
export const enabled = () => Boolean(config.twelveDataKey);
const BASE = 'https://api.twelvedata.com';

// Yahoo suffix -> Twelve Data exchange code. Best effort: other suffixes are skipped.
const SUFFIX = { NS: 'NSE', BO: 'BSE', L: 'LSE', TO: 'TSX', DE: 'XETR', AX: 'ASX', HK: 'HKEX' };

function toTd(symbol) {
  const dot = symbol.lastIndexOf('.');
  if (dot === -1) return { symbol };
  const exchange = SUFFIX[symbol.slice(dot + 1)];
  return exchange ? { symbol: symbol.slice(0, dot), exchange } : null;
}

async function getJson(path, params) {
  const qs = new URLSearchParams({ ...params, apikey: config.twelveDataKey });
  const res = await fetch(`${BASE}${path}?${qs}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Twelve Data ${res.status}`);
  const json = await res.json();
  if (json.status === 'error') throw new Error(`Twelve Data: ${json.message}`);
  return json;
}

export async function quotes(symbols) {
  if (!enabled()) throw new Error('Twelve Data key not set');
  const out = [];
  for (const symbol of symbols) {
    const td = toTd(symbol);
    if (!td) continue;
    const q = await getJson('/quote', td);
    const price = Number(q.close);
    if (!Number.isFinite(price)) continue;
    out.push({
      symbol, name: q.name || symbol, price, change: Number(q.change) || 0,
      changePct: Number(q.percent_change) || 0, prevClose: Number(q.previous_close) || price,
      currency: q.currency || 'USD', exchange: q.exchange || '',
      assetClass: classify({ symbol, quoteType: 'EQUITY', exchange: q.exchange, fullExchangeName: q.exchange, currency: q.currency }),
      marketState: q.is_market_open ? 'REGULAR' : 'CLOSED',
      asOf: q.datetime ? new Date(q.datetime).toISOString() : new Date().toISOString(),
    });
  }
  return out;
}

export async function history(symbol, { days, interval }) {
  if (!enabled()) throw new Error('Twelve Data key not set');
  const td = toTd(symbol);
  if (!td) throw new Error('Unsupported exchange');
  const tdInterval = { '1d': '1day', '1wk': '1week', '1h': '1h', '60m': '1h', '15m': '15min', '5m': '5min' }[interval] || '1day';
  const outputsize = Math.min(5000, Math.ceil(days * (tdInterval === '1day' ? 0.7 : 7)));
  const res = await getJson('/time_series', { ...td, interval: tdInterval, outputsize });
  return (res.values || []).reverse().map((v) => ({
    time: Math.floor(new Date(v.datetime).getTime() / 1000),
    open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close),
  }));
}

export async function search(query) {
  if (!enabled()) throw new Error('Twelve Data key not set');
  const res = await getJson('/symbol_search', { symbol: query, outputsize: 10 });
  return (res.data || []).map((r) => ({
    symbol: r.symbol, name: r.instrument_name, exchange: r.exchange,
    assetClass: classify({ symbol: r.symbol, quoteType: 'EQUITY', exchange: r.exchange, fullExchangeName: r.exchange }),
  }));
}
