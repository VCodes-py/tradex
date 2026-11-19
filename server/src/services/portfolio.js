/**
 * Pure valuation logic. No I/O, so it is easy to test.
 *
 * Cost basis is converted at today's FX rate (we don't store the FX rate at purchase),
 * so P&L in the base currency includes currency movement only from today onward.
 */
export function computeSummary({ holdings, quotes, rates, baseCurrency }) {
  const positions = holdings.map((h) => {
    const q = quotes[h.symbol];
    const fx = h.currency === baseCurrency ? 1 : rates[h.currency];
    const priced = Boolean(q) && Number.isFinite(fx);
    const assetClass = h.assetClass === 'us_stock' ? 'intl_stock' : h.assetClass;

    const base = {
      id: String(h._id),
      symbol: h.symbol,
      name: h.name || q?.name || h.symbol,
      assetClass,
      currency: h.currency,
      baseCurrency,
      fxRate: Number.isFinite(fx) ? fx : null,
      exchange: h.exchange,
      quantity: h.quantity,
      avgCost: h.avgCost,
      price: q?.price ?? null,
      changePct: q?.changePct ?? null,
      stale: Boolean(q?.stale),
      source: q?.source ?? null,
      priced,
    };
    if (!priced) {
      return {
        ...base,
        basePrice: null,
        baseAvgCost: null,
        value: null,
        cost: null,
        pnl: null,
        pnlPct: null,
        dayChange: null,
        weight: null,
      };
    }

    const value = h.quantity * q.price * fx;
    const cost = h.quantity * h.avgCost * fx;
    const pnl = value - cost;
    return {
      ...base,
      basePrice: q.price * fx,
      baseAvgCost: h.avgCost * fx,
      value,
      cost,
      pnl,
      pnlPct: cost > 0 ? (pnl / cost) * 100 : null,
      dayChange: h.quantity * q.change * fx,
      weight: 0,
    };
  });

  const priced = positions.filter((p) => p.priced);
  const value = sum(priced.map((p) => p.value));
  const cost = sum(priced.map((p) => p.cost));
  const dayChange = sum(priced.map((p) => p.dayChange));
  const prevValue = value - dayChange;

  for (const p of priced) p.weight = value > 0 ? (p.value / value) * 100 : 0;

  const byClass = new Map();
  for (const p of priced) byClass.set(p.assetClass, (byClass.get(p.assetClass) || 0) + p.value);
  const allocation = [...byClass.entries()]
    .map(([assetClass, v]) => ({ assetClass, value: v, weight: value > 0 ? (v / value) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  return {
    baseCurrency,
    totals: {
      value,
      cost,
      pnl: value - cost,
      pnlPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      dayChange,
      dayChangePct: prevValue > 0 ? (dayChange / prevValue) * 100 : 0,
      unpriced: positions.length - priced.length,
    },
    allocation,
    positions: positions.sort((a, b) => (b.value ?? -1) - (a.value ?? -1)),
  };
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
