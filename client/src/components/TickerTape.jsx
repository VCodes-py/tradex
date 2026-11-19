import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { usePolling } from '../hooks.js';
import { num, pct, tone } from '../format.js';

const SHORT = { '^GSPC': 'S&P 500', '^IXIC': 'Nasdaq', '^NSEI': 'Nifty 50', '^FTSE': 'FTSE 100', 'GC=F': 'Gold' };
const label = (q) => SHORT[q.symbol] || q.symbol.replace('=X', '');

export default function TickerTape() {
  const navigate = useNavigate();
  const { data } = usePolling(api.ticker, 30_000);
  if (!data?.length) return <div className="tape" aria-hidden="true" />;

  const onItemClick = (sym) => {
    navigate(`/markets?symbol=${encodeURIComponent(sym)}`);
  };

  const renderItem = (q, idx, isClone = false) => (
    <button
      type="button"
      className="tape-item"
      key={`${q.symbol}-${idx}`}
      onClick={() => onItemClick(q.symbol)}
      title={`View ${label(q)} (${q.symbol}) on Markets`}
      tabIndex={isClone ? -1 : 0}
      aria-hidden={isClone ? 'true' : undefined}
    >
      <span className="tape-sym">{label(q)}</span>
      <span className="num">{num(q.price, q.price < 10 ? 4 : 2)}</span>
      <span className={`num ${tone(q.changePct)}`}>{pct(q.changePct)}</span>
    </button>
  );

  return (
    <div className="tape" role="region" aria-label="Market overview ticker tape">
      <div className="tape-track">
        <div className="tape-group">{data.map((q, i) => renderItem(q, i, false))}</div>
        <div className="tape-group" aria-hidden="true">{data.map((q, i) => renderItem(q, i, true))}</div>
      </div>
    </div>
  );
}
