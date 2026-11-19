import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { CLASS_LABEL } from '../format.js';

export default function SymbolSearch({ onPick, placeholder = 'Search a name or symbol: Apple, RELIANCE.NS, BTC, EURUSD', autoFocus = false }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) { setResults([]); setState('idle'); return undefined; }
    setState('loading');
    let cancelled = false;
    const t = setTimeout(() => {
      api.search(term)
        .then((r) => { if (!cancelled) { setResults(r); setState('done'); } })
        .catch(() => { if (!cancelled) setState('error'); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  useEffect(() => {
    const close = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (r) => { setOpen(false); setQ(''); onPick(r); };

  return (
    <div className="search" ref={wrap}>
      <input
        type="search" value={q} autoFocus={autoFocus} placeholder={placeholder} aria-label="Search symbols"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) pick(results[0]); if (e.key === 'Escape') setOpen(false); }}
      />
      {open && q.trim() && (
        <ul className="search-menu" role="listbox">
          {state === 'loading' && !results.length && <li className="search-note">Searching…</li>}
          {state === 'error' && <li className="search-note">Search is unavailable right now. Try again in a moment.</li>}
          {state === 'done' && !results.length && <li className="search-note">No matches for “{q.trim()}”.</li>}
          {results.map((r) => (
            <li key={`${r.symbol}-${r.exchange}`} role="option">
              <button type="button" onClick={() => pick(r)}>
                <span className="sym">{r.symbol}</span>
                <span className="search-name">{r.name}</span>
                <span className="muted small">{CLASS_LABEL[r.assetClass]} · {r.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
