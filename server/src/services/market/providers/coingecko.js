import { config } from '../../../config.js';

export const name = 'CoinGecko';
const BASE = 'https://api.coingecko.com/api/v3';
const headers = config.coingeckoKey ? { 'x-cg-demo-api-key': config.coingeckoKey } : {};

// Common coins. Anything else is resolved through CoinGecko search.
const KNOWN = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', BNB: 'binancecoin', SOL: 'solana', XRP: 'ripple',
  USDC: 'usd-coin', ADA: 'cardano', DOGE: 'dogecoin', TRX: 'tron', AVAX: 'avalanche-2', DOT: 'polkadot',
  LINK: 'chainlink', LTC: 'litecoin', SHIB: 'shiba-inu', TON: 'the-open-network',
};

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

const parse = (symbol) => {
  const m = /^([A-Z0-9]+)-([A-Z]{3,4})$/.exec(symbol);
  return m ? { base: m[1], quote: m[2].toLowerCase() } : null;
};

async function coinId(base) {
  if (KNOWN[base]) return KNOWN[base];
  const res = await getJson(`/search?query=${encodeURIComponent(base)}`);
  const hit = res.coins?.find((c) => c.symbol.toUpperCase() === base);
  if (!hit) throw new Error(`Unknown coin ${base}`);
  return hit.id;
}

export async function quotes(symbols) {
  const out = [];
  for (const symbol of symbols) {
    const p = parse(symbol);
    if (!p) continue;
    const id = await coinId(p.base);
    const data = await getJson(`/simple/price?ids=${id}&vs_currencies=${p.quote}&include_24hr_change=true`);
    const row = data[id];
    if (!row || row[p.quote] == null) continue;
    const price = row[p.quote];
    const pct = row[`${p.quote}_24h_change`] ?? 0;
    const prevClose = price / (1 + pct / 100);
    out.push({
      symbol, name: p.base, price, change: price - prevClose, changePct: pct, prevClose,
      currency: p.quote.toUpperCase(), exchange: 'Crypto', assetClass: 'crypto',
      marketState: 'REGULAR', asOf: new Date().toISOString(),
    });
  }
  return out;
}

export async function history(symbol, { days }) {
  const p = parse(symbol);
  if (!p) throw new Error('Not a crypto pair');
  const id = await coinId(p.base);
  const d = [1, 7, 14, 30, 90, 180, 365].find((x) => days <= x) ?? 365;
  const rows = await getJson(`/coins/${id}/ohlc?vs_currency=${p.quote}&days=${d}`);
  return rows.map(([t, open, high, low, close]) => ({ time: Math.floor(t / 1000), open, high, low, close }));
}

export async function search(query) {
  const res = await getJson(`/search?query=${encodeURIComponent(query)}`);
  return (res.coins || []).slice(0, 6).map((c) => ({
    symbol: `${c.symbol.toUpperCase()}-USD`, name: c.name, exchange: 'Crypto', assetClass: 'crypto',
  }));
}
