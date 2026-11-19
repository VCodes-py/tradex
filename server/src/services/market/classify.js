const INDIAN_EXCHANGE_CODES = new Set(['NSE', 'BSE', 'NSI', 'BOM']);
const INDIAN_EXCHANGE_NAME = /\b(nse|bse|bombay stock|national stock|india)\b/i;
const INDIAN_SYMBOL_PATTERN = /(\.NS|\.BO|\^NSEI|\^BSESN)$/i;

/** Map an instrument to one of our asset classes: indian_stock, intl_stock, crypto, forex. */
export function classify({ symbol = '', quoteType, exchange = '', fullExchangeName = '', currency = '' } = {}) {
  const t = String(quoteType || '').toUpperCase();
  if (t === 'CRYPTOCURRENCY') return 'crypto';
  if (t === 'CURRENCY') return 'forex';

  const sym = String(symbol || '').toUpperCase();
  const ex = String(exchange || '').toUpperCase();
  const fullEx = String(fullExchangeName || '').toUpperCase();
  const cur = String(currency || '').toUpperCase();

  // Indian stocks: matched by symbol suffix (.NS, .BO, etc.), Indian exchange codes/names, or INR currency
  if (
    INDIAN_SYMBOL_PATTERN.test(sym) ||
    INDIAN_EXCHANGE_CODES.has(ex) ||
    INDIAN_EXCHANGE_CODES.has(fullEx) ||
    INDIAN_EXCHANGE_NAME.test(fullExchangeName) ||
    INDIAN_EXCHANGE_NAME.test(exchange) ||
    (cur === 'INR' && !sym.startsWith('^') && !sym.includes('=X'))
  ) {
    return 'indian_stock';
  }

  // All other stocks (US stocks and other international stocks) belong together in intl_stock
  return 'intl_stock';
}

/** Yahoo prices some stocks in minor units (e.g. London pence "GBp"). Normalise to the major unit. */
export function normalizeCurrency(price, currency) {
  if (currency === 'GBp' || currency === 'GBX') return { price: price / 100, currency: 'GBP' };
  if (currency === 'ZAc') return { price: price / 100, currency: 'ZAR' };
  if (currency === 'ILA') return { price: price / 100, currency: 'ILS' };
  return { price, currency: String(currency || 'USD').toUpperCase() };
}
