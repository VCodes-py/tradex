const cache = new Map();
const nf = (key, opts) => {
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat('en-US', opts));
  return cache.get(key);
};

export function money(value, currency = 'USD', { compact = false } = {}) {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs !== 0 && abs < 1 ? 4 : 2;
  const opts = compact && abs >= 1e6
    ? { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 2 }
    : { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: digits };
  try {
    return nf(`m:${currency}:${compact && abs >= 1e6}:${digits}`, opts).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** Prices keep more precision for small values (e.g. forex at 1.0734). */
export function price(value, currency = 'USD') {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const max = abs < 1 ? 6 : abs < 10 ? 4 : 2;
  try {
    return nf(`p:${currency}:${max}`, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: max }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

export const qty = (v) => (v == null ? '—' : nf('q', { maximumFractionDigits: 8 }).format(v));
export const num = (v, d = 2) => (v == null || !Number.isFinite(v) ? '—' : nf(`n${d}`, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v));

export function pct(v, { sign = true } = {}) {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${sign && v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export function signed(value, currency) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${money(Math.abs(value), currency)}`;
}

export const tone = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : '');
export const clock = (d) => (d ? d.toLocaleTimeString('en-GB', { hour12: false }) : '');

export const CLASS_LABEL = {
  indian_stock: 'Indian stocks',
  intl_stock: 'International',
  crypto: 'Crypto',
  forex: 'Forex',
  us_stock: 'International',
};
export const CLASS_COLOR = {
  indian_stock: '#ff7849',
  intl_stock: '#4f9dff',
  crypto: '#f2b84b',
  forex: '#7fc4cf',
  us_stock: '#4f9dff',
};
export const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'AED', 'HKD', 'CNY'];
