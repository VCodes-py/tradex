import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { usePolling } from '../hooks.js';
import { CLASS_LABEL, clock, money, pct, signed, tone } from '../format.js';
import AllocationBar from '../components/AllocationBar.jsx';
import PositionsTable from '../components/PositionsTable.jsx';
import PriceChart from '../components/PriceChart.jsx';
import TradeDialog from '../components/TradeDialog.jsx';

const FILTERS = ['all', 'indian_stock', 'intl_stock', 'crypto', 'forex'];

export default function Portfolio() {
  const { user } = useAuth();
  const base = user.baseCurrency;
  const { data, error, loading, updatedAt, refresh } = usePolling(() => api.summary(base), 30_000, [base]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [dialog, setDialog] = useState(null); // { position? }

  const ready = data && data.baseCurrency === base;
  const positions = ready ? data.positions : [];
  const shown = filter === 'all'
    ? positions
    : positions.filter((p) => p.assetClass === filter || (filter === 'intl_stock' && p.assetClass === 'us_stock'));
  const chartSymbol = selected && positions.some((p) => p.symbol === selected) ? selected : positions[0]?.symbol;
  const t = ready ? data.totals : null;

  return (
    <>
      <section className="strip" aria-label="Portfolio totals">
        <Stat label="Portfolio value" big value={t ? money(t.value, base) : '—'} />
        <Stat label="Today" value={t ? signed(t.dayChange, base) : '—'} sub={t ? pct(t.dayChangePct) : ''} cls={t ? tone(t.dayChange) : ''} />
        <Stat label="Total profit / loss" value={t ? signed(t.pnl, base) : '—'} sub={t ? pct(t.pnlPct) : ''} cls={t ? tone(t.pnl) : ''} />
        <Stat label="Cost basis" value={t ? money(t.cost, base) : '—'} />
        <div className="strip-meta">
          <span className={`status ${error ? 'bad' : 'ok'}`} aria-hidden="true" />
          <span className="small muted">
            {error ? error : updatedAt ? `Updated ${clock(updatedAt)}${data?.sources?.length ? ` · ${data.sources.join(', ')}` : ''}` : 'Loading prices…'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={refresh}>Refresh</button>
        </div>
      </section>

      {t?.unpriced > 0 && (
        <div className="notice" role="status">
          {t.unpriced} {t.unpriced === 1 ? 'position has' : 'positions have'} no live price right now, so {t.unpriced === 1 ? 'it is' : 'they are'} left out of the totals.
        </div>
      )}

      <div className="grid">
        <section className="panel" aria-label="Positions">
          <div className="panel-head">
            <div className="seg" role="group" aria-label="Filter by asset class">
              {FILTERS.map((f) => (
                <button key={f} className={f === filter ? 'on' : ''} aria-pressed={f === filter} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : CLASS_LABEL[f]}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setDialog({})}>Add position</button>
          </div>

          {loading && !data && <div className="empty">Loading your portfolio…</div>}
          {ready && !positions.length && (
            <div className="empty">
              <p>No positions yet.</p>
              <p className="muted">Add one here, or find assets on the Markets page.</p>
              <button className="btn btn-primary" onClick={() => setDialog({})}>Add your first position</button>
            </div>
          )}
          {ready && positions.length > 0 && !shown.length && <div className="empty">You don’t hold any {CLASS_LABEL[filter]} assets.</div>}
          {shown.length > 0 && (
            <PositionsTable positions={shown} baseCurrency={base} selected={chartSymbol} onSelect={setSelected} onTrade={(p) => setDialog({ position: p })} />
          )}
        </section>

        <aside className="side">
          {chartSymbol && (
            <section className="panel">
              <div className="panel-head"><h2 className="panel-title">{chartSymbol}</h2></div>
              <PriceChart symbol={chartSymbol} height={260} />
            </section>
          )}
          <section className="panel">
            <div className="panel-head"><h2 className="panel-title">Allocation</h2></div>
            <div className="panel-pad"><AllocationBar allocation={ready ? data.allocation : []} currency={base} /></div>
          </section>
        </aside>
      </div>

      {dialog && (
        <TradeDialog
          position={dialog.position || null}
          onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); refresh(); }}
        />
      )}
    </>
  );
}

function Stat({ label, value, sub, cls = '', big }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value num ${big ? 'big' : ''} ${cls}`}>{value}</div>
      {sub && <div className={`stat-sub num ${cls}`}>{sub}</div>}
    </div>
  );
}
