import { CLASS_LABEL, money, num, pct, price, qty, signed, tone } from '../format.js';

export default function PositionsTable({ positions, baseCurrency, selected, onSelect, onTrade }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Asset</th>
            <th className="r">Quantity</th>
            <th className="r">Avg cost</th>
            <th className="r">Last</th>
            <th className="r">Day</th>
            <th className="r">Value ({baseCurrency})</th>
            <th className="r">P&amp;L</th>
            <th className="r">Weight</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.id} className={p.symbol === selected ? 'sel' : ''} onClick={() => onSelect(p.symbol)}>
              <td>
                <div className="asset">
                  <span className="sym">{p.symbol}</span>
                  <span className="muted small ellip">{p.name} · {CLASS_LABEL[p.assetClass]}</span>
                </div>
              </td>
              <td className="r num">{qty(p.quantity)}</td>
              <td className="r num">
                {p.currency !== baseCurrency && p.baseAvgCost ? (
                  <>
                    <span>{price(p.baseAvgCost, baseCurrency)}</span>
                    <span className="muted small block">{price(p.avgCost, p.currency)}</span>
                  </>
                ) : (
                  price(p.avgCost, p.currency)
                )}
              </td>
              <td className="r num">
                {p.priced ? (
                  p.currency !== baseCurrency && p.basePrice ? (
                    <>
                      <span>{price(p.basePrice, baseCurrency)}</span>
                      <span className="muted small block">{price(p.price, p.currency)}</span>
                    </>
                  ) : (
                    price(p.price, p.currency)
                  )
                ) : (
                  <span className="tag" title="No provider returned a price or exchange rate for this asset.">No price</span>
                )}
                {p.stale && <span className="tag" title="Live providers are unreachable. Showing the last known price.">Stale</span>}
              </td>
              <td className={`r num ${tone(p.changePct)}`}>{pct(p.changePct)}</td>
              <td className="r num">{p.priced ? money(p.value, baseCurrency) : '—'}</td>
              <td className={`r num ${tone(p.pnl)}`}>
                {p.priced ? <>{signed(p.pnl, baseCurrency)}<span className="small block">{pct(p.pnlPct)}</span></> : '—'}
              </td>
              <td className="r num">{p.priced ? `${num(p.weight, 1)}%` : '—'}</td>
              <td className="r"><button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onTrade(p); }}>Trade</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
