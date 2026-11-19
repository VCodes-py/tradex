import { CLASS_COLOR, CLASS_LABEL, money, pct } from '../format.js';

export default function AllocationBar({ allocation, currency }) {
  if (!allocation.length) return <div className="empty small">Allocation appears once you hold priced assets.</div>;
  return (
    <div>
      <div className="alloc-bar" role="img" aria-label="Allocation by asset class">
        {allocation.map((a) => (
          <span key={a.assetClass} style={{ width: `${a.weight}%`, background: CLASS_COLOR[a.assetClass] }} title={`${CLASS_LABEL[a.assetClass]} ${pct(a.weight, { sign: false })}`} />
        ))}
      </div>
      <ul className="alloc-list">
        {allocation.map((a) => (
          <li key={a.assetClass}>
            <span className="dot" style={{ background: CLASS_COLOR[a.assetClass] }} />
            <span className="alloc-name">{CLASS_LABEL[a.assetClass]}</span>
            <span className="num muted">{money(a.value, currency, { compact: true })}</span>
            <span className="num alloc-w">{pct(a.weight, { sign: false })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
