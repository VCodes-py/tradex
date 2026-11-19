import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { money, price as fmtPrice, qty as fmtQty } from '../format.js';
import SymbolSearch from './SymbolSearch.jsx';

/**
 * position: an existing holding (from the portfolio summary), or null when adding a new one.
 * picked:   a search result to pre-select when opened from Markets.
 */
export default function TradeDialog({ position, picked, initialMode, onClose, onDone }) {
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
    api.quotes([asset.symbol]).then((q) => {
      const hit = q[asset.symbol.toUpperCase()];
      setQuote(hit || null);
      if (mode === 'buy' && hit) setUnit(String(Number(hit.price.toPrecision(8))));
    }).catch(() => setQuote(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.symbol]);

  useEffect(() => {
    setError('');
    if (mode === 'edit' && position) { setQuantity(String(position.quantity)); setUnit(String(position.avgCost)); }
    if (mode === 'sell') { setQuantity(''); }
    if (mode === 'buy') { setQuantity(''); if (quote) setUnit(String(Number(quote.price.toPrecision(8)))); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const currency = position?.currency || quote?.currency || 'USD';
  const q = Number(quantity); const p = Number(unit);
  const total = q > 0 && p > 0 ? q * p : null;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!asset) return setError('Choose an asset first.');
    if (mode !== 'edit' && !(q > 0)) return setError('Enter a quantity greater than 0.');
    setBusy(true);
    try {
      if (mode === 'buy') await api.buy({ symbol: asset.symbol, quantity: q, price: p, name: asset.name, assetClass: asset.assetClass, currency: quote?.currency });
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
            <p className="hint">Works with US and international stocks, crypto (BTC-USD) and forex pairs (EURUSD=X).</p>
          </div>
        ) : (
          <div className="dialog-body">
            <div className="asset-line">
              <span>{asset.name}</span>
              {quote && <span className="num">{fmtPrice(quote.price, quote.currency)}<span className="muted small"> last</span></span>}
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
              <label className="field">
                <span>{mode === 'edit' ? 'Average cost' : 'Price per unit'} ({currency})</span>
                <input type="number" inputMode="decimal" min="0" step="any" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </label>
            )}
            {total != null && mode !== 'sell' && <div className="total"><span className="muted">Total</span><span className="num">{money(total, currency)}</span></div>}
            {mode === 'sell' && q > 0 && quote && <div className="total"><span className="muted">At market</span><span className="num">{money(q * quote.price, currency)}</span></div>}
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
