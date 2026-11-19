// Free ECB reference rates, no API key. Daily rates, ~30 major currencies.
export const name = 'Frankfurter (ECB)';
const BASE = 'https://api.frankfurter.dev/v1';

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  return res.json();
}

const PAIR = /^([A-Z]{3})([A-Z]{3})=X$/;

function previousBusinessDay(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  do d.setUTCDate(d.getUTCDate() - 1);
  while ([0, 6].includes(d.getUTCDay()));
  return d.toISOString().slice(0, 10);
}

export async function fxRate(from, to) {
  if (from === to) return 1;
  const data = await getJson(`${BASE}/latest?base=${from}&symbols=${to}`);
  const rate = data?.rates?.[to];
  if (!rate) throw new Error(`No ${from}/${to} rate`);
  return rate;
}

/** Forex pair quotes from Yahoo-style symbols like EURUSD=X. */
export async function quotes(symbols) {
  const out = [];
  for (const symbol of symbols) {
    const m = PAIR.exec(symbol);
    if (!m) continue;
    const [, from, to] = m;
    const latest = await getJson(`${BASE}/latest?base=${from}&symbols=${to}`);
    const prev = await getJson(`${BASE}/${previousBusinessDay(latest.date)}?base=${from}&symbols=${to}`).catch(() => null);
    const price = latest.rates[to];
    const prevClose = prev?.rates?.[to] ?? price;
    out.push({
      symbol, name: `${from}/${to}`, price, change: price - prevClose,
      changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0, prevClose,
      currency: to, exchange: 'ECB reference rate', assetClass: 'forex',
      marketState: 'CLOSED', asOf: new Date(latest.date).toISOString(),
    });
  }
  return out;
}

export async function history(symbol, { days }) {
  const m = PAIR.exec(symbol);
  if (!m) throw new Error('Not a forex pair');
  const [, from, to] = m;
  const start = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const data = await getJson(`${BASE}/${start}..?base=${from}&symbols=${to}`);
  return Object.entries(data.rates).map(([date, r]) => ({
    time: Math.floor(new Date(date).getTime() / 1000), open: r[to], high: r[to], low: r[to], close: r[to],
  }));
}
