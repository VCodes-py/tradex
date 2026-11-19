import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { CURRENCIES } from '../format.js';
import Logo from './Logo.jsx';
import TickerTape from './TickerTape.jsx';

export default function Shell() {
  const { user, signOut, setBaseCurrency } = useAuth();
  const currencies = CURRENCIES.includes(user.baseCurrency) ? CURRENCIES : [user.baseCurrency, ...CURRENCIES];

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="TradeX home"><Logo height={15} /></NavLink>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>Portfolio</NavLink>
          <NavLink to="/markets">Markets</NavLink>
          <NavLink to="/landing">Overview</NavLink>
        </nav>
        <div className="topbar-right">
          <label className="field-inline">
            <span>Base currency</span>
            <select value={user.baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
              {currencies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <span className="user" title={user.email}>{user.name || user.email}</span>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <TickerTape />
      <main className="page"><Outlet /></main>
    </div>
  );
}
