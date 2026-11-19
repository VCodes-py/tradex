import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLocalList, usePolling } from '../hooks.js';
import { CLASS_LABEL, pct, price, tone } from '../format.js';
import PriceChart from '../components/PriceChart.jsx';
import SymbolSearch from '../components/SymbolSearch.jsx';
import TradeDialog from '../components/TradeDialog.jsx';

const LISTS = {
  watchlist: null,
  indian_stock: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'TATAMOTORS.NS', 'ICICIBANK.NS'],
  intl_stock: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'ASML', '7203.T', 'SAP.DE', 'HSBA.L'],
  crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'BNB-USD'],
  forex: ['EURUSD=X', 'GBPUSD=X', 'USDINR=X', 'USDJPY=X', 'AUDUSD=X', 'USDCHF=X'],
};
const TABS = ['watchlist', 'indian_stock', 'intl_stock', 'crypto', 'forex'];

export default function Markets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolParam = searchParams.get('symbol');

  const [tab, setTab] = useState(() => {
    if (symbolParam) {
      const sym = symbolParam.toUpperCase();
      for (const [k, list] of Object.entries(LISTS)) {
        if (list && list.some((s) => s.toUpperCase() === sym)) return k;
      }
    }
    return 'indian_stock';
  });

  const [watch, toggleWatch] = useLocalList('tradex.watchlist');
  const [active, setActive] = useState(() => {
    if (symbolParam) {
      return { symbol: symbolParam.toUpperCase(), name: symbolParam.toUpperCase(), assetClass: 'intl_stock' };
    }
    return { symbol: 'RELIANCE.NS', name: 'Reliance Industries', assetClass: 'indian_stock' };
  });
  const [dialog, setDialog] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (symbolParam) {
      const sym = symbolParam.toUpperCase();
      setActive((prev) => (prev.symbol === sym ? prev : { symbol: sym, name: sym, assetClass: 'intl_stock' }));
      for (const [k, list] of Object.entries(LISTS)) {
        if (list && list.some((s) => s.toUpperCase() === sym)) {
          setTab(k);
          break;
        }
      }
    }
  }, [symbolParam]);

  const symbols = useMemo(() => {
    const list = tab === 'watchlist' ? watch : LISTS[tab] || [];
    return [...new Set([...list, active.symbol])];
  }, [tab, watch, active.symbol]);

  const { data: quotes, error } = usePolling(() => (symbols.length ? api.quotes(symbols) : {}), 30_000, [symbols.join(',')]);
  const rows = (tab === 'watchlist' ? watch : LISTS[tab] || []).map((s) => quotes?.[s.toUpperCase()] || { symbol: s, missing: true });
  const current = quotes?.[active.symbol.toUpperCase()];

  const pick = (r) => {
    setActive({ symbol: r.symbol, name: r.name, assetClass: r.assetClass });
    setSearchParams({ symbol: r.symbol }, { replace: true });
  };

  return (
    <>
      <div className="searchbar"><SymbolSearch onPick={pick} /></div>
      {flash && <div className="notice ok" role="status">{flash}</div>}

      <div className="grid">
        <section className="panel" aria-label="Chart">
          <div className="quote-head">
            <div>
              <h1 className="quote-sym">{active.symbol}</h1>
              <div className="muted small">{current?.name || active.name} · {CLASS_LABEL[current?.assetClass || active.assetClass]}</div>
            </div>
            <div className="quote-price">
              <div className="num big">{current ? price(current.price, current.currency) : '—'}</div>
              <div className={`num ${tone(current?.changePct)}`}>{current ? `${pct(current.changePct)}` : ''}</div>
            </div>
            <div className="quote-actions">
              <button className="btn btn-ghost" onClick={() => toggleWatch(active.symbol)}>
                {watch.includes(active.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
              </button>
              <button className="btn btn-primary" onClick={() => setDialog(true)}>Add to portfolio</button>
            </div>
          </div>
          <PriceChart symbol={active.symbol} height={380} />
        </section>

        <aside className="panel side-list" aria-label="Instruments">
          <div className="panel-head">
            <div className="seg scroll" role="group" aria-label="Lists">
              {TABS.map((k) => (
                <button key={k} className={k === tab ? 'on' : ''} aria-pressed={k === tab} onClick={() => setTab(k)}>
                  {k === 'watchlist' ? 'Watchlist' : CLASS_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="notice">{error}</div>}
          {tab === 'watchlist' && !watch.length && <div className="empty small">Your watchlist is empty. Search for an asset and add it.</div>}
          <ul className="quote-list">
            {rows.map((q) => (
              <li key={q.symbol}>
                <button className={`quote-row ${q.symbol === active.symbol ? 'sel' : ''}`} onClick={() => pick({ symbol: q.symbol, name: q.name || q.symbol, assetClass: q.assetClass || (tab === 'watchlist' ? active.assetClass : tab) })}>
                  <span className="asset"><span className="sym">{q.symbol}</span><span className="muted small ellip">{q.name}</span></span>
                  <span className="num r">{q.missing ? '—' : price(q.price, q.currency)}</span>
                  <span className={`num r ${tone(q.changePct)}`}>{q.missing ? '' : pct(q.changePct)}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {dialog && <TradeDialog position={null} picked={current ? { ...active, assetClass: current.assetClass, name: current.name } : active} onClose={() => setDialog(false)} onDone={() => { setDialog(false); setFlash(`Added ${active.symbol} to your portfolio.`); setTimeout(() => setFlash(''), 4000); }} />}
    </>
  );
}
