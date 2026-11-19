import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Logo from '../components/Logo.jsx';
import TickerTape from '../components/TickerTape.jsx';
import { CLASS_COLOR, CLASS_LABEL } from '../format.js';

const DEMO_CREDENTIALS = {
  email: 'demo@tradex.app',
  password: 'demo-pass-123',
};

const FX_RATES_TO_USD = {
  USD: 1,
  INR: 0.0116, // 1 INR ~ 0.0116 USD (86.2 INR/USD)
  EUR: 1.09,   // 1 EUR ~ 1.09 USD
  GBP: 1.28,   // 1 GBP ~ 1.28 USD
};

const MOCK_HOLDINGS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', assetClass: 'indian_stock', exchange: 'NSE', qty: 40, priceInNative: 1365.8, nativeCur: 'INR' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', assetClass: 'intl_stock', exchange: 'NASDAQ', qty: 15, priceInNative: 150.96, nativeCur: 'USD' },
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'intl_stock', exchange: 'NASDAQ', qty: 25, priceInNative: 232.45, nativeCur: 'USD' },
  { symbol: 'ASML', name: 'ASML Holding', assetClass: 'intl_stock', exchange: 'NASDAQ', qty: 4, priceInNative: 710.0, nativeCur: 'USD' },
  { symbol: 'BTC-USD', name: 'Bitcoin', assetClass: 'crypto', exchange: 'Crypto', qty: 0.35, priceInNative: 63575.9, nativeCur: 'USD' },
  { symbol: 'EURUSD=X', name: 'EUR / USD', assetClass: 'forex', exchange: 'FX', qty: 5000, priceInNative: 1.097, nativeCur: 'USD' },
];

export default function LandingPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  const [mockBase, setMockBase] = useState('USD');
  const [authModal, setAuthModal] = useState(false); // false | 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Calculate dynamic mockup values based on selected currency
  const calculatedPositions = useMemo(() => {
    const targetFx = FX_RATES_TO_USD[mockBase] || 1;
    return MOCK_HOLDINGS.map((h) => {
      const priceInUSD = h.nativeCur === 'USD' ? h.priceInNative : h.priceInNative * (FX_RATES_TO_USD[h.nativeCur] || 1);
      const priceInTarget = priceInUSD / targetFx;
      const totalValue = priceInTarget * h.qty;
      return {
        ...h,
        priceInTarget,
        totalValue,
      };
    });
  }, [mockBase]);

  const totalPortfolioValue = useMemo(() => {
    return calculatedPositions.reduce((acc, p) => acc + p.totalValue, 0);
  }, [calculatedPositions]);

  const allocationByClass = useMemo(() => {
    const totals = {};
    for (const p of calculatedPositions) {
      totals[p.assetClass] = (totals[p.assetClass] || 0) + p.totalValue;
    }
    return Object.entries(totals).map(([assetClass, val]) => ({
      assetClass,
      val,
      pct: totalPortfolioValue > 0 ? (val / totalPortfolioValue) * 100 : 0,
    })).sort((a, b) => b.val - a.val);
  }, [calculatedPositions, totalPortfolioValue]);

  async function handleDemoLogin() {
    setBusy(true);
    setError('');
    try {
      await signIn('login', DEMO_CREDENTIALS);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in to demo account');
      setBusy(false);
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(authModal, authModal === 'register' ? form : { email: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed');
      setBusy(false);
    }
  }

  function fillDemo() {
    setForm({ name: 'Demo User', email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
  }

  function copyCli() {
    navigator.clipboard.writeText('git clone https://github.com/tradex/tradex && cd tradex && npm run dev');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const formatCurrency = (val, cur) => {
    const symbolMap = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
    const prefix = symbolMap[cur] || cur + ' ';
    return `${prefix}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="landing-root">
      {/* Glow Backdrop */}
      <div className="landing-grid-bg" aria-hidden="true" />
      <div className="landing-radial-glow" aria-hidden="true" />

      {/* Top Navigation */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <Logo height={18} />
            <span className="landing-version-tag">v2.4</span>
          </div>

          <div className="landing-status-pill" title="Live Yahoo Finance, CoinGecko, & ECB providers operational">
            <span className="landing-status-dot" />
            <span>TERMINAL ACTIVE · ZERO LATENCY</span>
          </div>

          <nav className="landing-nav-links">
            <a href="#overview">Overview</a>
            <a href="#interactive-terminal">Terminal</a>
            <a href="#features">Architecture</a>
            <a href="#markets">Coverage</a>
          </nav>

          <div className="landing-nav-actions">
            {user ? (
              <Link to="/" className="btn btn-primary btn-sm">Open Terminal →</Link>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setAuthModal('login'); setError(''); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleDemoLogin}
                  disabled={busy}
                >
                  {busy ? 'Launching…' : '⚡ 1-Click Demo'}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero" id="overview">
        <div className="landing-container">
          <div className="landing-eyebrow">
            <span className="eyebrow-chip">MULTI-ASSET ARCHITECTURE</span>
            <span className="eyebrow-text">Unified Valuation · Free Live Feeds · Zero Bloat</span>
          </div>

          <h1 className="landing-headline">
            One quiet terminal for <br />
            <span className="hl-gradient">Indian stocks, US tech, crypto &amp; forex.</span>
          </h1>

          <p className="landing-subhead">
            Value your entire cross-border portfolio live in the currency you choose (USD, INR, EUR, and more).
            Indian equities, US &amp; international stocks, crypto pairs, and currencies—priced in real time without paid API subscriptions.
          </p>

          <div className="landing-hero-cta">
            {user ? (
              <Link to="/" className="btn btn-primary btn-lg">
                Go to Your Terminal →
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleDemoLogin}
                  disabled={busy}
                >
                  {busy ? 'Initializing…' : '⚡ Launch 1-Click Demo'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-lg"
                  onClick={() => { setAuthModal('register'); setError(''); }}
                >
                  Create Account
                </button>
              </>
            )}

            <div className="landing-cli-badge" onClick={copyCli} title="Click to copy quickstart command">
              <span className="cli-prompt">$</span>
              <code>npm run dev</code>
              <span className="cli-copy">{copied ? '✓ Copied' : 'Copy'}</span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="landing-metrics-strip">
            <div className="metric-cell">
              <span className="m-label">Asset Classes</span>
              <span className="m-val">4 Unified</span>
              <span className="m-sub">India · Intl · Crypto · FX</span>
            </div>
            <div className="metric-cell">
              <span className="m-label">Live Price Refresh</span>
              <span className="m-val">30s TTL</span>
              <span className="m-sub">Shared server cache</span>
            </div>
            <div className="metric-cell">
              <span className="m-label">Base Currencies</span>
              <span className="m-val">12+ Live</span>
              <span className="m-sub">Instant FX re-averaging</span>
            </div>
            <div className="metric-cell">
              <span className="m-label">API Cost</span>
              <span className="m-val">$0 / Free</span>
              <span className="m-sub">Multi-provider fallbacks</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Ticker Tape Strip */}
      <section className="landing-tape-section">
        <div className="tape-section-header">
          <span className="tape-label">LIVE GLOBAL MARKETS FEED · CLICK ANY ASSET TO INSPECT</span>
        </div>
        <TickerTape />
      </section>

      {/* Interactive Terminal Mockup Section */}
      <section className="landing-terminal-section" id="interactive-terminal">
        <div className="landing-container">
          <div className="section-head">
            <span className="sec-tag">INTERACTIVE TERMINAL PREVIEW</span>
            <h2>Tactical density. Zero distractions.</h2>
            <p className="sec-sub">
              Switch the base currency below and observe how holdings across diverse exchanges (NSE, NASDAQ, Crypto) dynamically re-price in real time:
            </p>
          </div>

          <div className="terminal-window">
            {/* Window titlebar */}
            <div className="terminal-titlebar">
              <div className="win-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <div className="win-title">tradex-workstation // portfolio-summary.sys</div>
              <div className="win-tools">
                <span className="win-badge">VALUATION: LIVE</span>
              </div>
            </div>

            {/* Terminal controls strip */}
            <div className="terminal-strip">
              <div className="t-stat">
                <div className="t-label">PORTFOLIO VALUATION</div>
                <div className="t-val big num">{formatCurrency(totalPortfolioValue, mockBase)}</div>
              </div>
              <div className="t-stat">
                <div className="t-label">TODAY'S RETURN</div>
                <div className="t-val num up">+2.48%</div>
                <div className="t-sub num up">+{formatCurrency(totalPortfolioValue * 0.0248, mockBase)}</div>
              </div>
              <div className="t-stat">
                <div className="t-label">TOTAL UNREALIZED P&amp;L</div>
                <div className="t-val num up">+18.42%</div>
                <div className="t-sub num up">+{formatCurrency(totalPortfolioValue * 0.1842, mockBase)}</div>
              </div>
              <div className="t-stat cur-picker">
                <div className="t-label">ACTIVE BASE CURRENCY</div>
                <div className="cur-seg" role="group" aria-label="Mock base currency selector">
                  {['USD', 'INR', 'EUR', 'GBP'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={c === mockBase ? 'on' : ''}
                      onClick={() => setMockBase(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Allocation Bar Preview */}
            <div className="terminal-alloc-wrap">
              <div className="t-alloc-bar">
                {allocationByClass.map((a) => (
                  <span
                    key={a.assetClass}
                    style={{ width: `${a.pct}%`, background: CLASS_COLOR[a.assetClass] }}
                    title={`${CLASS_LABEL[a.assetClass]}: ${a.pct.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="t-alloc-legend">
                {allocationByClass.map((a) => (
                  <div key={a.assetClass} className="t-alloc-item">
                    <span className="dot" style={{ background: CLASS_COLOR[a.assetClass] }} />
                    <span className="t-alloc-name">{CLASS_LABEL[a.assetClass]}</span>
                    <span className="num muted">{a.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Holdings Table Preview */}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Category</th>
                    <th className="r">Holdings</th>
                    <th className="r">Native Price</th>
                    <th className="r">Valued in {mockBase}</th>
                    <th className="r">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedPositions.map((p) => (
                    <tr key={p.symbol}>
                      <td>
                        <div className="asset">
                          <span className="sym">{p.symbol}</span>
                          <span className="muted small ellip">{p.name} · {p.exchange}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="tag"
                          style={{ borderColor: CLASS_COLOR[p.assetClass], color: CLASS_COLOR[p.assetClass] }}
                        >
                          {CLASS_LABEL[p.assetClass]}
                        </span>
                      </td>
                      <td className="r num">{p.qty.toLocaleString()}</td>
                      <td className="r num">{formatCurrency(p.priceInNative, p.nativeCur)}</td>
                      <td className="r num" style={{ fontWeight: 600 }}>{formatCurrency(p.totalValue, mockBase)}</td>
                      <td className="r num">{((p.totalValue / totalPortfolioValue) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="terminal-foot">
              <span>● SERVER CACHE VALID · NEXT CYCLE IN 14s</span>
              <span>LIGHTWEIGHT CHARTS READY · 60 FPS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section className="landing-features" id="features">
        <div className="landing-container">
          <div className="section-head">
            <span className="sec-tag">CORE CAPABILITIES</span>
            <h2>Engineered for investors with international exposure.</h2>
            <p className="sec-sub">Everything you need to track multi-jurisdiction portfolios without bloatware or paywalls.</p>
          </div>

          <div className="feature-grid">
            <div className="feature-card highlight-border">
              <div className="f-icon">🇮🇳</div>
              <h3>First-Class Indian Stocks Sub-Category</h3>
              <p>
                Native support for National Stock Exchange (NSE) and Bombay Stock Exchange (BSE) via <code>.NS</code> and <code>.BO</code> tickers. Real-time INR cost-basis and live market indexing.
              </p>
              <div className="f-tags">
                <span>NSE / BSE</span>
                <span>Nifty 50</span>
                <span>INR Valuation</span>
              </div>
            </div>

            <div className="feature-card highlight-border">
              <div className="f-icon">🌐</div>
              <h3>Unified International Section</h3>
              <p>
                US equities (Nasdaq, NYSE) and global giants (London, Tokyo, Frankfurt, Amsterdam) unified under one international umbrella for clear allocation tracking.
              </p>
              <div className="f-tags">
                <span>US Equities</span>
                <span>Global Markets</span>
                <span>Tech Titans</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="f-icon">⚡</div>
              <h3>Resilient Multi-Provider Fallback</h3>
              <p>
                Yahoo Finance default with automatic fallback to CoinGecko for crypto, Twelve Data for international equities, and the European Central Bank (Frankfurter) for live forex.
              </p>
              <div className="f-tags">
                <span>Zero Paid Keys</span>
                <span>Automatic Failover</span>
                <span>Shared Cache</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="f-icon">💱</div>
              <h3>Live Cross-Currency Matrix</h3>
              <p>
                Hold assets denominated in USD, INR, EUR, GBP, JPY, CAD or AUD. TradeX dynamically recalculates unrealized P&amp;L and day change into your chosen base currency.
              </p>
              <div className="f-tags">
                <span>12 Base Currencies</span>
                <span>Live FX Rates</span>
                <span>Instant Switching</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="f-icon">📈</div>
              <h3>TradingView Lightweight Charts</h3>
              <p>
                Dense, high-speed charting powered by TradingView’s open canvas library. Seamlessly switch between candlestick and area charts across 1D, 5D, 1M, 6M, 1Y, and 5Y ranges.
              </p>
              <div className="f-tags">
                <span>Candlestick</span>
                <span>Area Views</span>
                <span>Sub-Millisecond Pan</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="f-icon">🛡️</div>
              <h3>Private &amp; Self-Hosted</h3>
              <p>
                Your portfolio data stays strictly on your local MongoDB database. JWT authenticated endpoints with no telemetry, third-party analytics, or cookie tracking.
              </p>
              <div className="f-tags">
                <span>JWT Auth</span>
                <span>Local MongoDB</span>
                <span>MIT Licensed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Coverage Section */}
      <section className="landing-markets" id="markets">
        <div className="landing-container">
          <div className="section-head">
            <span className="sec-tag">GLOBAL INSTRUMENT COVERAGE</span>
            <h2>Thousands of tickers. One clean interface.</h2>
          </div>

          <div className="markets-pill-grid">
            <div className="market-col">
              <h4>🇮🇳 Indian Equities</h4>
              <div className="ticker-capsules">
                <span>RELIANCE.NS</span>
                <span>TCS.NS</span>
                <span>HDFCBANK.NS</span>
                <span>INFY.NS</span>
                <span>TATAMOTORS.NS</span>
                <span>^NSEI (Nifty 50)</span>
              </div>
            </div>

            <div className="market-col">
              <h4>🇺🇸 US Tech &amp; Global</h4>
              <div className="ticker-capsules">
                <span>AAPL</span>
                <span>NVDA</span>
                <span>MSFT</span>
                <span>TSLA</span>
                <span>ASML</span>
                <span>7203.T</span>
              </div>
            </div>

            <div className="market-col">
              <h4>₿ Digital Assets</h4>
              <div className="ticker-capsules">
                <span>BTC-USD</span>
                <span>ETH-USD</span>
                <span>SOL-USD</span>
                <span>XRP-USD</span>
                <span>BNB-USD</span>
                <span>DOGE-USD</span>
              </div>
            </div>

            <div className="market-col">
              <h4>💱 Foreign Exchange</h4>
              <div className="ticker-capsules">
                <span>EURUSD=X</span>
                <span>USDINR=X</span>
                <span>GBPUSD=X</span>
                <span>USDJPY=X</span>
                <span>AUDUSD=X</span>
                <span>GC=F (Gold)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="landing-cta-banner">
        <div className="landing-container">
          <div className="cta-box">
            <h2>Ready to inspect your global portfolio?</h2>
            <p>Experience the terminal with the pre-configured demo account or start fresh with your own assets.</p>
            <div className="cta-btns">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleDemoLogin}
                disabled={busy}
              >
                {busy ? 'Launching…' : '⚡ Launch 1-Click Demo'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-lg"
                onClick={() => { setAuthModal('register'); setError(''); }}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <div className="footer-brand">
            <Logo height={16} />
            <p className="small muted">A dense, quiet trading terminal for multi-asset global wealth.</p>
          </div>
          <div className="footer-links">
            <span className="small muted">Node 24 · Express 4 · React 18 · MongoDB · MIT License</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal / Dialog */}
      {authModal && (
        <div className="overlay" onClick={() => setAuthModal(false)}>
          <div className="dialog auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h2>{authModal === 'login' ? 'Sign In to TradeX' : 'Create TradeX Account'}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setAuthModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="dialog-body">
              <div className="seg wide" style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className={authModal === 'login' ? 'on' : ''}
                  onClick={() => { setAuthModal('login'); setError(''); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={authModal === 'register' ? 'on' : ''}
                  onClick={() => { setAuthModal('register'); setError(''); }}
                >
                  Register
                </button>
              </div>

              {authModal === 'register' && (
                <label className="field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your Name"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="field">
                <span>Email Address</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                  autoComplete="email"
                  autoFocus
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete={authModal === 'login' ? 'current-password' : 'new-password'}
                />
              </label>

              {error && <div className="error">{error}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={busy}
                style={{ marginTop: 8 }}
              >
                {busy ? 'Verifying…' : authModal === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="demo-fill-wrap">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-block"
                  onClick={fillDemo}
                >
                  Use Demo Credentials (demo@tradex.app)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
