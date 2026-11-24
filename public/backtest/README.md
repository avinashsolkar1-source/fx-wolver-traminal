# FX WOLVER — Trading Terminal + Backtesting
Static site (no build). Files: `index.html` (landing), `app.html` (terminal), `js/`, `css/`, `assets/`, `supabase/`, `tests/`.

## Run locally
`python3 -m http.server 8099` in this folder → open http://localhost:8099/ . Works in **local mode** (data in browser IndexedDB) with no keys.

## Data
No candles are bundled. Import CSV on *Market Data* (MT4/MT5, Dukascopy, Binance, TradingView…). Forex/Gold/Indices need your own CSV or a paid provider.

## Cloud mode (Supabase)
1. On a DEV Supabase project run `supabase/001_backtesting.sql` (tables + RLS; rollback SQL in comments). Production only after you approve.
2. Put the project URL and **anon** key in `js/config.js` (never the service_role key).
3. Edge functions (optional): `supabase functions deploy market-data ai-coach`; `supabase secrets set TWELVEDATA_API_KEY=… ANTHROPIC_API_KEY=…`.

## Deploy on Cloudflare Pages
Upload this folder (or connect repo): build command none, output dir `/`. Demo/sandbox only — no real deposits/withdrawals.

## Execution model
Market orders fill at candle close ± spread/slippage; pending orders fill when a later candle touches the price (gap → open); SL/TP checked on later candles; if both hit in one candle SL is assumed first; trailing stops apply from the next candle. Commission on close, swap per UTC night. Shown in the workspace *Info* tab.

## Tests
`node tests/core.test.js`; e2e: Playwright scripts in `tests/` (need `eurusd_m5.csv` generated via `fixture.js` — synthetic, test only).

## Known limitations
Cloud mode, Binance adapter and Edge Functions untested; account currency USD only; chart times UTC; mobile workspace is compact; tests use synthetic data, so no real-market results are claimed.

## Login flow
Landing page (`index.html`) has a login / create-account card. With `SUPABASE_ANON_KEY` set in `js/config.js` it signs in via Supabase and goes straight to `app.html#/bt/workspace`. Without a key the site runs in local mode (data stays in the browser) and the card shows "Enter terminal".

## Adding your free data later
Copy CSV files into `data/` and list them in `data/manifest.json` (format in `data/README.md`). Redeploy; they appear under Trading Terminal → New Backtest → Data Library with a one-click Load button. Or use the CSV import page.

## Google login
Supabase Dashboard → Authentication → Providers → Google: enable it and add your Google OAuth client ID/secret. Add your site URL under Authentication → URL Configuration. Then put the project's anon key in `js/config.js`.
