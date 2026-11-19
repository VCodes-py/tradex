import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { money, price as fmtPrice, qty as fmtQty, signed } from '../format.js';
import SymbolSearch from './SymbolSearch.jsx';

/**
 * position: an existing holding (from the portfolio summary), or null when adding a new one.
 * picked:   a search result to pre-select when opened from Markets.
 */
export default function TradeDialog({ position, picked, initialMode, onClose, onDone }) {
  const { user } = useAuth();
  const baseCurrency = user?.baseCurrency || 'USD';
  const [asset, setAsset] = useState(position || picked || null);
  const [mode, setMode] = useState(initialMode || 'buy');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const held = Boolean(position);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fetch a live price whenever the asset changes so the form starts from the market price.
  useEffect(() => {
    if (!asset) return;
    api.quotes([asset.symbol], baseCurrency).then((q) => {
      const symUpper = asset.symbol.toUpperCase();
      const hit = q[symUpper] || q[`${symUpper}.NS`] || (symUpper.includes('.') ? q[symUpper.replace(/\.(NS|BO)$/, '')] : null);
      setQuote(hit || null);
      if (mode === 'buy' && hit?.price != null) {
        setUnit(String(Number(hit.price.toPrecision(8))));
      }
    }).catch(() => setQuote(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.symbol, baseCurrency]);

  useEffect(() => {
    setError('');
    if (mode === 'edit' && position) { setQuantity(String(position.quantity)); setUnit(String(position.avgCost)); }
    if (mode === 'sell') { setQuantity(''); }
    if (mode === 'buy') {
      setQuantity('');
      if (quote?.price != null) setUnit(String(Number(quote.price.toPrecision(8))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const sym = asset?.symbol || '';
  const isIndian = sym.endsWith('.NS') || sym.endsWith('.BO') || asset?.assetClass === 'indian_stock';
  const currency = position?.currency || quote?.currency || (isIndian ? 'INR' : 'USD');
  const q = Number(quantity); const p = Number(unit);
  const m = quote?.price ?? null;

  // Comparison between user entered price (cost) and current market price
  const hasPriceComparison = mode !== 'sell' && p > 0 && m != null && m > 0;
  const isLoss = hasPriceComparison && p > m;
  const isProfit = hasPriceComparison && p < m;
  const isEven = hasPriceComparison && Math.abs(p - m) < 0.000001;
  const priceDiff = hasPriceComparison ? Math.abs(p - m) : 0;
  const priceDiffPct = hasPriceComparison ? (priceDiff / m) * 100 : 0;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!asset) return setError('Choose an asset first.');
    if (mode !== 'edit' && !(q > 0)) return setError('Enter a quantity greater than 0.');
    setBusy(true);
    try {
      if (mode === 'buy') {
        await api.buy({
          symbol: asset.symbol,
          quantity: q,
          price: p,
          name: asset.name,
          assetClass: asset.assetClass || (isIndian ? 'indian_stock' : 'intl_stock'),
          currency,
        });
      }
      if (mode === 'sell') await api.sell(position.id, q);
      if (mode === 'edit') await api.edit(position.id, { quantity: q, avgCost: p });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function removeAll() {
    if (!window.confirm(`Remove ${position.symbol} from your portfolio? This doesn't sell it, it just stops tracking it.`)) return;
    setBusy(true);
    try { await api.remove(position.id); onDone(); } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" onSubmit={submit}>
        <div className="dialog-head">
          <h2 id="dlg-title">{asset ? `${asset.symbol}` : 'Add position'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {!asset ? (
          <div className="dialog-body">
            <SymbolSearch autoFocus onPick={setAsset} />
            <p className="hint">Works with Indian stocks (RELIANCE.NS, TCS.NS), US/global stocks, crypto and forex pairs.</p>
          </div>
        ) : (
          <div className="dialog-body">
            <div className="asset-line">
              <span>{asset.name}</span>
              {quote && (
                <span className="num">
                  {fmtPrice(quote.price, quote.currency)}
                  {quote.basePrice && quote.currency !== baseCurrency && (
                    <span className="muted small"> (≈ {fmtPrice(quote.basePrice, baseCurrency)})</span>
                  )}
                  <span className="muted small"> last</span>
                </span>
              )}
            </div>

            {held && <div className="seg wide" role="group" aria-label="Action">
              <button type="button" className={mode === 'buy' ? 'on' : ''} onClick={() => setMode('buy')}>Buy</button>
              {held && <button type="button" className={mode === 'sell' ? 'on' : ''} onClick={() => setMode('sell')}>Sell</button>}
              {held && <button type="button" className={mode === 'edit' ? 'on' : ''} onClick={() => setMode('edit')}>Correct</button>}
            </div>}

            {held && <p className="hint">You hold {fmtQty(position.quantity)} at an average of {fmtPrice(position.avgCost, position.currency)}.</p>}

            <label className="field">
              <span>Quantity</span>
              <input type="number" inputMode="decimal" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
            </label>

            {mode !== 'sell' && (
              <div style={{ marginBottom: 12 }}>
                <label className="field" style={{ marginBottom: 4 }}>
                  <span>{mode === 'edit' ? 'Average cost' : 'Price per unit'} ({currency})</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={m ? String(m) : '0.00'}
                  />
                </label>

                {/* Dynamic red/green indicator bar and variance vs current market price */}
                {hasPriceComparison && (
                  <div className="price-diff-wrap">
                    <div className={`price-diff-bar ${isLoss ? 'loss' : isProfit ? 'profit' : 'even'}`} />
                    <div className={`price-diff-text ${isLoss ? 'loss' : isProfit ? 'profit' : 'even'}`}>
                      {isLoss && (
                        <span>
                          🔻 <strong>Position in Loss:</strong> +{fmtPrice(priceDiff, currency)} (+{priceDiffPct.toFixed(2)}%) above current market ({fmtPrice(m, currency)})
                        </span>
                      )}
                      {isProfit && (
                        <span>
                          🟢 <strong>Position in Profit:</strong> −{fmtPrice(priceDiff, currency)} (−{priceDiffPct.toFixed(2)}%) below current market ({fmtPrice(m, currency)})
                        </span>
                      )}
                      {isEven && (
                        <span>
                          ⚖️ Matches current market price ({fmtPrice(m, currency)})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Position Valuation & Profit/Loss Tracking */}
            {q > 0 && p > 0 && mode !== 'sell' && (
              <div className="trade-calc-card">
                <div className="calc-row">
                  <span className="muted">Total Cost Basis ({q} × {fmtPrice(p, currency)})</span>
                  <span className="num">{money(q * p, currency)}</span>
                </div>
                {m != null && m > 0 && (
                  <>
                    <div className="calc-row">
                      <span className="muted">Current Market Value ({q} × {fmtPrice(m, currency)})</span>
                      <span className="num">{money(q * m, currency)}</span>
                    </div>
                    <div className="calc-row pnl-row">
                      <span className="muted">Expected Profit / Loss</span>
                      <div className="pnl-val">
                        <span className={`num ${q * (m - p) >= 0 ? 'up' : 'down'}`}>
                          {signed(q * (m - p), currency)}
                          <span className="pnl-pct">
                            ({q * (m - p) >= 0 ? '+' : ''}{(((m - p) / p) * 100).toFixed(2)}%)
                          </span>
                        </span>
                        <span className={`pnl-tag ${q * (m - p) >= 0 ? 'tag-profit' : 'tag-loss'}`}>
                          {q * (m - p) >= 0 ? 'PROFIT' : 'LOSS'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                {quote?.fxRate && currency !== baseCurrency && (
                  <div className="calc-row fx-row">
                    <span className="muted small">Converted in {baseCurrency}</span>
                    <span className="muted small num">
                      Cost: {money(q * p * quote.fxRate, baseCurrency)} · Value: {money(q * (m || p) * quote.fxRate, baseCurrency)}
                      {m > 0 && (
                        <span className={`small ${q * (m - p) >= 0 ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>
                          ({signed(q * (m - p) * quote.fxRate, baseCurrency)})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {mode === 'sell' && q > 0 && quote && (
              <div className="trade-calc-card">
                <div className="calc-row">
                  <span className="muted">Sale proceeds (at market)</span>
                  <span className="num">{money(q * quote.price, currency)}</span>
                </div>
                {position?.avgCost && (
                  <div className="calc-row pnl-row">
                    <span className="muted">Realized P&amp;L on sale</span>
                    <div className="pnl-val">
                      <span className={`num ${q * (quote.price - position.avgCost) >= 0 ? 'up' : 'down'}`}>
                        {signed(q * (quote.price - position.avgCost), currency)}
                      </span>
                      <span className={`pnl-tag ${q * (quote.price - position.avgCost) >= 0 ? 'tag-profit' : 'tag-loss'}`}>
                        {q * (quote.price - position.avgCost) >= 0 ? 'PROFIT' : 'LOSS'}
                      </span>
                    </div>
                  </div>
                )}
                {quote.fxRate && currency !== baseCurrency && (
                  <div className="calc-row fx-row">
                    <span className="muted small">Proceeds in {baseCurrency}</span>
                    <span className="muted small num">{money(q * quote.price * quote.fxRate, baseCurrency)}</span>
                  </div>
                )}
              </div>
            )}

            {error && <div className="error" role="alert">{error}</div>}
          </div>
        )}

        {asset && (
          <div className="dialog-foot">
            {mode === 'edit' && <button type="button" className="btn btn-danger" onClick={removeAll} disabled={busy}>Remove position</button>}
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className={`btn ${mode === 'sell' ? 'btn-sell' : 'btn-buy'}`} disabled={busy}>
              {busy ? 'Saving…' : mode === 'buy' ? 'Add buy' : mode === 'sell' ? 'Record sale' : 'Save changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
