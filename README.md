# TradeX

One portfolio workstation for **Indian stocks, US & international stocks, crypto and forex**, valued live in the currency you choose.

[![GitHub Repo](https://img.shields.io/badge/GitHub-VCodes--py%2Ftradex-blue?logo=github)](https://github.com/VCodes-py/tradex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

- **Unified valuation.** Every holding is priced in its own currency, then converted to your base currency (USD, INR, EUR and more, changeable any time from the top bar).
- **Dedicated Indian stocks.** Native classification for NSE & BSE (`.NS`, `.BO`), Nifty 50, and automatic INR valuation.
- **Unified international section.** US tech and global equities brought together into one streamlined international workspace.
- **Free live prices.** Yahoo Finance by default, with official free APIs as automatic fallback. No paid keys needed to run.
- **Trading-terminal UI.** Interactive clickable ticker tape, dense positions table, TradingView charts, and asset class allocation bar.
- **Aesthetic landing page.** Sleek terminal preview with live dynamic base currency converter and 1-click instant demo.
- **Buy, sell and correct** positions. Buys re-average your cost; selling everything removes the position.

## Stack

React 18 + Vite, TradingView `lightweight-charts`, Express 4, MongoDB (Mongoose), JWT auth.

## 🌐 Live Web App

Access the hosted application directly in your browser without needing to clone or run commands:
👉 **[Launch TradeX Web Terminal](https://github.com/VCodes-py/tradex#deployment-render---free-all-in-one)**

* **1-Click Demo:** Click **⚡ Launch 1-Click Demo** on the landing page for instant access.
* **Demo account:** `demo@tradex.app` / `demo-pass-123`

---

## Local Development (Optional for Developers)

Only needed if you want to contribute, edit the code, or run the app locally on your machine:

```bash
git clone https://github.com/VCodes-py/tradex.git tradex && cd tradex
npm run install:all
cp server/.env.example server/.env      # then set JWT_SECRET
npm run seed                            # optional: demo@tradex.app / demo-pass-123
npm run dev                             # API on :5000, web on :5173
```

Open http://localhost:5173.

## Where prices come from

| Asset | Primary | Fallback |
|---|---|---|
| US and international stocks | Yahoo Finance (`yahoo-finance2`) | Twelve Data (needs a free key) |
| Crypto | Yahoo Finance | CoinGecko (no key needed) |
| Forex pairs | Yahoo Finance | Frankfurter / ECB (no key needed) |
| FX conversion to base currency | Yahoo Finance | Frankfurter / ECB |

Prices are fetched **by the server**, cached for 30 seconds and shared across requests, so keys stay private and rate limits are respected. If every provider fails for a symbol, the last known price is shown with a "Stale" tag. If no price has ever been found, the position is marked "No price" and left out of totals rather than counted as zero.

**Be aware:**
- Yahoo Finance has no official API. `yahoo-finance2` is unofficial and can break or be rate-limited without notice, which is why the fallbacks exist. Check Yahoo's terms before any commercial use.
- Free stock data is usually delayed (often around 15 minutes). Crypto is effectively live.
- The Twelve Data fallback maps a limited set of exchange suffixes (`.NS .BO .L .TO .DE .AX .HK`). Other international symbols rely on Yahoo.
- Check each provider's current free-tier limits before relying on them.

## Symbols

Use Yahoo-style symbols: `AAPL`, `RELIANCE.NS`, `7203.T`, `BTC-USD`, `EURUSD=X`. The search box on Markets and in the Add position dialog finds them for you and classifies each as US stock, international stock, crypto or forex.

## How P&L is calculated

Cost basis is stored in each asset's own currency and converted to your base currency **at today's exchange rate**. The app doesn't store the FX rate at the time of purchase, so P&L in a base currency doesn't capture currency gains since purchase. A per-transaction ledger would fix this and is the natural next step.

## Project layout

```
client/            React app (Vite)
  src/pages/         Portfolio, Markets, Auth
  src/components/    Shell, TickerTape, PriceChart, PositionsTable, TradeDialog ...
server/
  src/routes/        auth, holdings, market, portfolio
  src/services/market/
    providers/       yahoo, coingecko, twelvedata, frankfurter
    index.js         provider chains, caching, fallback
  src/services/portfolio.js   pure valuation maths (unit tested)
  test/              node:test suites
```

## API

All routes except `/api/health` and `/api/auth/register|login` need `Authorization: Bearer <token>`.

| Route | Purpose |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | Create account / sign in |
| `GET /api/auth/me`, `PATCH /api/auth/me` | Profile and base currency |
| `GET /api/portfolio/summary` | Valued positions, totals, allocation |
| `GET/POST /api/holdings`, `POST /api/holdings/:id/sell`, `PUT/DELETE /api/holdings/:id` | Manage positions |
| `GET /api/market/search?q=`, `/quotes?symbols=`, `/history?symbol=&range=`, `/ticker` | Market data |
| `GET /api/health` | Which providers are enabled |

## Deployment (Render - Free All-In-One)

Deploy the entire app (frontend and backend) to **Render** with a single click or Blueprint:

1. **Database (MongoDB Atlas - Free):**
   - Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
   - Under *Database Access*, create a user.
   - Under *Network Access*, add `0.0.0.0/0` (allow access from anywhere).
   - Copy your connection string (`mongodb+srv://...`).

2. **Deploy on Render:**
   - Go to [render.com](https://render.com) and click **New + > Web Service** (or **Blueprint** with the included `render.yaml`).
   - Connect your GitHub repository `VCodes-py/tradex`.
   - Set:
     - **Build Command:** `npm run install:all && npm run build`
     - **Start Command:** `npm start`
     - **Plan:** Free
   - Add Environment Variables:
     - `NODE_ENV`: `production`
     - `NODE_VERSION`: `22`
     - `JWT_SECRET`: *(Generate a 32-character random string or click Generate)*
     - `MONGODB_URI`: *(Your MongoDB Atlas connection string)*
   - Click **Deploy Web Service**!

## Tests

```bash
npm test
```

Covers valuation maths, FX conversion, unpriced holdings, provider fallback and asset classification.

## Known limitations

- No password reset or email verification yet.
- The auth token is kept in `localStorage` (7-day expiry). Move to httpOnly cookies if you add third-party scripts.
- No transaction history; each holding stores quantity and average cost.
- The chart library shows a small TradingView attribution mark, as its licence requires.

## Disclaimer

TradeX tracks holdings. It does not place trades and is not financial advice. Prices may be delayed or inaccurate.

## License

MIT
