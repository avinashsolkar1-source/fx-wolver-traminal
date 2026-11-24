/* FX WOLVER – core logic (no DOM): data parsing, timeframes, indicators, trade simulator, analytics, Monte Carlo, strategies */
(function (g) {
  const F = (g.FXW = g.FXW || {});

  /* ---------- timeframes ---------- */
  const TF = { '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800, '1mo': 2592000 };
  F.TF = TF;
  F.tfKeys = Object.keys(TF);
  F.tfName = (sec) => F.tfKeys.find((k) => TF[k] === sec) || sec + 's';

  /* ---------- helpers ---------- */
  F.uid = () => (g.crypto && g.crypto.randomUUID ? g.crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  F.round = (n, d = 2) => (n == null || !isFinite(n) ? n : Math.round(n * Math.pow(10, d)) / Math.pow(10, d));
  F.digitsFor = (p) => (p >= 1000 ? 2 : p >= 100 ? 3 : p >= 10 ? 4 : p >= 1 ? 5 : 6);
  F.fmtP = (p, d) => (p == null || !isFinite(p) ? '–' : Number(p).toFixed(d == null ? F.digitsFor(Math.abs(p)) : d));
  F.fmtMoney = (n) => (n == null || !isFinite(n) ? '–' : (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const pad = (n) => String(n).padStart(2, '0');
  F.fmtDate = (t) => { const d = new Date(t * 1000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  F.fmtDT = (t) => { if (t == null) return '–'; const d = new Date(t * 1000); return F.fmtDate(t) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); };
  F.dayKey = (t) => Math.floor(t / 86400);

  /* ---------- instrument spec ---------- */
  F.MARKETS = {
    crypto: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT', 'AVAXUSDT', 'DOTUSDT', 'LTCUSDT', 'TRXUSDT', 'BCHUSDT', 'NEARUSDT', 'ATOMUSDT'],
    forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURJPY', 'GBPJPY', 'EURGBP', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'GBPNZD', 'AUDJPY', 'AUDCAD', 'AUDCHF', 'AUDNZD', 'CADJPY', 'CHFJPY', 'NZDJPY', 'NZDCAD', 'NZDCHF', 'CADCHF'],
    metals: ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'],
    indices: ['US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'NIFTY50', 'SENSEX', 'JPN225', 'HKG50', 'EU50'],
    stocks: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'JPM', 'AVGO', 'WMT', 'LLY', 'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS'],
  };
  F.specFor = function (symbol, market) {
    symbol = String(symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (market === 'crypto') {
      const m = symbol.match(/^(.+?)(USDT|USDC|BUSD|USD)$/);
      return { symbol, market, kind: 'crypto', contract: 1, base: m ? m[1] : symbol, quote: 'USD', step: 0.001, min: 0.001, unit: 'units' };
    }
    if (market === 'forex') {
      const base = symbol.slice(0, 3), quote = symbol.slice(3, 6);
      return { symbol, market, kind: 'forex', contract: 100000, base, quote, pip: quote === 'JPY' ? 0.01 : 0.0001, step: 0.01, min: 0.01, unit: 'lots' };
    }
    if (market === 'metals') {
      const silver = symbol.startsWith('XAG');
      return { symbol, market, kind: 'metal', contract: silver ? 5000 : 100, base: symbol.slice(0, 3), quote: 'USD', pip: silver ? 0.01 : 0.1, step: 0.01, min: 0.01, unit: 'lots' };
    }
    if (market === 'indices') return { symbol, market, kind: 'index', contract: 1, base: symbol, quote: 'USD', step: 0.1, min: 0.1, unit: 'contracts' };
    return { symbol, market: market || 'stocks', kind: 'stock', contract: 1, base: symbol, quote: 'USD', step: 1, min: 1, unit: 'shares' };
  };

  /* ---------- CSV parsing ---------- */
  F.parseTime = function (s, order) {
    s = String(s).trim().replace(/^"|"$/g, '');
    if (/^\d{8}$/.test(s)) return Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)) / 1000;
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = parseFloat(s);
      if (n >= 1e14) return Math.floor(n / 1e6);
      if (n >= 1e11) return Math.floor(n / 1000);
      if (n >= 1e9) return Math.floor(n);
      return NaN;
    }
    let m = s.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/);
    if (m) {
      let t = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) / 1000;
      if (m[7] && m[7] !== 'Z') { const sign = m[7][0] === '-' ? -1 : 1, hh = +m[7].slice(1, 3), mm = +m[7].slice(-2); t -= sign * (hh * 3600 + mm * 60); }
      return t;
    }
    m = s.match(/^(\d{1,2})([.\-\/])(\d{1,2})[.\-\/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/);
    if (m) {
      let a = +m[1], b = +m[3];
      let day, mon;
      if (order === 'dmy') { day = a; mon = b; } else if (order === 'mdy') { mon = a; day = b; } else if (a > 12) { day = a; mon = b; } else if (b > 12) { mon = a; day = b; } else if (m[2] === '/') { mon = a; day = b; } else { day = a; mon = b; }
      return Date.UTC(+m[4], mon - 1, day, +(m[5] || 0), +(m[6] || 0), +(m[7] || 0)) / 1000;
    }
    const p = Date.parse(s);
    return isNaN(p) ? NaN : Math.floor(p / 1000);
  };

  F.parseCSV = function (text, opts) {
    opts = opts || {};
    text = String(text).replace(/^﻿/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length < 2) throw new Error('No data rows found in the CSV.');
    let delim = ',', best = -1;
    for (const d of [',', ';', '\t']) { const n = lines[0].split(d).length; if (n > best) { best = n; delim = d; } }
    if (best < 5) throw new Error('The CSV needs at least 5 columns (time, open, high, low, close).');
    const split = (l) => l.split(delim).map((x) => x.trim().replace(/^"|"$/g, ''));
    const first = split(lines[0]);
    const hasHeader = first.some((x) => /^<?(date|time|datetime|timestamp|gmt|local|open|high|low|close|vol|tick)/i.test(x));
    let ix = { d: 0, t: -1, o: 1, h: 2, l: 3, c: 4, v: 5 };
    let start = 0;
    if (hasHeader) {
      start = 1;
      ix = { d: -1, t: -1, o: -1, h: -1, l: -1, c: -1, v: -1 };
      first.forEach((x, i) => {
        const n = x.toLowerCase().replace(/[<>"]/g, '').trim();
        if (n === 'date') ix.d = i;
        else if (n === 'time' && ix.d >= 0 && ix.d !== i) ix.t = i;
        else if (['time', 'datetime', 'timestamp', 'gmt time', 'local time', 'date time', 'open time', 'opentime', 'open_time'].includes(n)) { if (ix.d < 0) ix.d = i; else ix.t = i; }
        else if (n === 'open' || n === 'o') ix.o = i;
        else if (n === 'high' || n === 'h') ix.h = i;
        else if (n === 'low' || n === 'l') ix.l = i;
        else if (n === 'close' || n === 'c' || n === 'adj close') { if (ix.c < 0) ix.c = i; }
        else if (/vol/.test(n)) { if (ix.v < 0 || n === 'volume') ix.v = i; }
      });
      if (ix.d < 0 || ix.o < 0 || ix.h < 0 || ix.l < 0 || ix.c < 0) throw new Error('Time/open/high/low/close columns not found in the header.');
    }
    if (!hasHeader && split(lines[0]).length >= 6 && /^\d{1,2}:\d{2}/.test(split(lines[0])[1])) ix = { d: 0, t: 1, o: 2, h: 3, l: 4, c: 5, v: 6 }; // MT4 style: date,time,o,h,l,c,v
    if (opts.map) ix = Object.assign({}, ix, opts.map);
    const num = (x) => parseFloat(delim === ',' ? x : String(x).replace(',', '.'));
    const out = []; let skipped = 0;
    for (let i = start; i < lines.length; i++) {
      const r = split(lines[i]);
      let ts = r[ix.d];
      if (ix.t >= 0) ts = r[ix.d] + ' ' + r[ix.t];
      let t = F.parseTime(ts, opts.order); if (opts.tz && isFinite(t)) t -= opts.tz * 60;
      const o = num(r[ix.o]), h = num(r[ix.h]), l = num(r[ix.l]), c = num(r[ix.c]);
      const v = ix.v >= 0 ? num(r[ix.v]) : 0;
      if (!isFinite(t) || !isFinite(o) || !isFinite(h) || !isFinite(l) || !isFinite(c) || h < l) { skipped++; continue; }
      out.push({ t, o, h: Math.max(h, o, c), l: Math.min(l, o, c), c, v: isFinite(v) ? v : 0 });
    }
    out.sort((a, b) => a.t - b.t);
    const ded = []; let dups = 0;
    for (const c of out) { if (ded.length && ded[ded.length - 1].t === c.t) { ded[ded.length - 1] = c; dups++; } else ded.push(c); }
    if (ded.length < 20) throw new Error('Too few valid candles found (' + ded.length + '). Check the format or column mapping.');
    return { candles: ded, skipped, dups, ix, delim, hasHeader, headers: hasHeader ? first : null };
  };

  F.csvPeek = function (text) {
    text = String(text).replace(/^\uFEFF/, ''); const lines = text.split(/\r?\n/).filter((l) => l.trim().length).slice(0, 400); let delim = ',', best = -1;
    for (const d of [',', ';', '\t']) { const n = (lines[0] || '').split(d).length; if (n > best) { best = n; delim = d; } }
    const rows = lines.slice(0, 8).map((l) => l.split(delim).map((x) => x.trim().replace(/^"|"$/g, ''))); let ix = null, hasHeader = false, headers = null;
    try { const r = F.parseCSV(lines.join('\n')); ix = r.ix; hasHeader = r.hasHeader; headers = r.headers; } catch (e) { hasHeader = rows[0] && rows[0].some((x) => /[a-z]/i.test(x)); }
    return { delim, rows, cols: best, ix, hasHeader, headers, totalLines: text.split(/\r?\n/).length };
  };
  // data quality: weekend/holiday gaps are expected for non-crypto markets and are NOT counted as missing
  F.dataQuality = function (cs, tfSec, market) {
    let gaps = 0, missing = 0, largest = null; const list = [];
    for (let i = 1; i < cs.length; i++) {
      const d = cs[i].t - cs[i - 1].t; if (d <= tfSec * 1.5) continue;
      if (market !== 'crypto') { const a = new Date(cs[i - 1].t * 1000), b = new Date(cs[i].t * 1000); const dayA = a.getUTCDay(), dayB = b.getUTCDay(); const wk = d <= 3.2 * 86400 && (dayA === 5 || dayA === 6 || dayA === 0 || dayB === 0 || dayB === 1) ; if (wk && tfSec <= 86400) continue; if (tfSec > 86400 && d <= tfSec * 1.5 + 4 * 86400) continue; }
      gaps++; missing += Math.round(d / tfSec) - 1; if (!largest || d > largest.d) largest = { d, from: cs[i - 1].t, to: cs[i].t }; if (list.length < 15) list.push({ from: cs[i - 1].t, to: cs[i].t, n: Math.round(d / tfSec) - 1 });
    }
    return { rows: cs.length, from: cs[0].t, to: cs[cs.length - 1].t, gaps, missing, largest, list, zeroVol: cs.filter((c) => !c.v).length === cs.length };
  };

  F.detectTF = function (candles) {
    const d = [];
    for (let i = 1; i < Math.min(candles.length, 800); i++) { const x = candles[i].t - candles[i - 1].t; if (x > 0) d.push(x); }
    d.sort((a, b) => a - b);
    const med = d[Math.floor(d.length / 2)] || 60;
    let best = null, bd = Infinity;
    for (const k of F.tfKeys) { const diff = Math.abs(TF[k] - med) / TF[k]; if (diff < bd) { bd = diff; best = k; } }
    return bd <= 0.1 ? { key: best, sec: TF[best] } : { key: null, sec: med };
  };

  /* ---------- aggregation (multi-timeframe) ---------- */
  const bucketOf = (t, sec) => (sec === 2592000 ? (() => { const d = new Date(t * 1000); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000; })() : sec === 604800 ? Math.floor((t - 345600) / sec) * sec + 345600 : Math.floor(t / sec) * sec);
  F.buildTF = function (base, sec) {
    const out = []; let cur = null;
    for (let i = 0; i < base.length; i++) {
      const c = base[i], b = bucketOf(c.t, sec);
      if (!cur || cur.t !== b) { cur = { t: b, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v || 0, i0: i, i1: i }; out.push(cur); }
      else { if (c.h > cur.h) cur.h = c.h; if (c.l < cur.l) cur.l = c.l; cur.c = c.c; cur.v += c.v || 0; cur.i1 = i; }
    }
    return out;
  };
  // blind replay: only data up to base index `idx` is visible; last bucket is partial
  F.feedAt = function (arr, base, idx) {
    let lo = 0, hi = arr.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (arr[m].i0 <= idx) lo = m; else hi = m - 1; }
    const b = arr[lo];
    const last = { t: b.t, o: base[b.i0].o, h: -Infinity, l: Infinity, c: base[idx].c, v: 0, i0: b.i0, i1: idx };
    for (let i = b.i0; i <= idx; i++) { const c = base[i]; if (c.h > last.h) last.h = c.h; if (c.l < last.l) last.l = c.l; last.v += c.v || 0; }
    return { arr, n: lo + 1, last };
  };

  /* ---------- indicators ---------- */
  const I = (F.ind = {});
  I.sma = (a, p) => { const o = new Array(a.length).fill(NaN); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= p) s -= a[i - p]; if (i >= p - 1) o[i] = s / p; } return o; };
  I.ema = (a, p) => { const o = new Array(a.length).fill(NaN); const k = 2 / (p + 1); let e = NaN; let s = 0; for (let i = 0; i < a.length; i++) { if (i < p - 1) { s += a[i]; continue; } if (i === p - 1) { s += a[i]; e = s / p; } else e = a[i] * k + e * (1 - k); o[i] = e; } return o; };
  I.rsi = (a, p) => { const o = new Array(a.length).fill(NaN); if (a.length <= p) return o; let g = 0, l = 0; for (let i = 1; i <= p; i++) { const d = a[i] - a[i - 1]; if (d >= 0) g += d; else l -= d; } g /= p; l /= p; o[p] = l === 0 ? 100 : 100 - 100 / (1 + g / l); for (let i = p + 1; i < a.length; i++) { const d = a[i] - a[i - 1]; g = (g * (p - 1) + (d > 0 ? d : 0)) / p; l = (l * (p - 1) + (d < 0 ? -d : 0)) / p; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } return o; };
  I.bb = (a, p, m) => { const mid = I.sma(a, p), up = new Array(a.length).fill(NaN), lo = new Array(a.length).fill(NaN); for (let i = p - 1; i < a.length; i++) { let s = 0; for (let j = i - p + 1; j <= i; j++) { const d = a[j] - mid[i]; s += d * d; } const sd = Math.sqrt(s / p); up[i] = mid[i] + m * sd; lo[i] = mid[i] - m * sd; } return { mid, up, lo }; };
  I.atr = (cs, p) => { const o = new Array(cs.length).fill(NaN); let a = 0; for (let i = 1; i < cs.length; i++) { const tr = Math.max(cs[i].h - cs[i].l, Math.abs(cs[i].h - cs[i - 1].c), Math.abs(cs[i].l - cs[i - 1].c)); if (i <= p) { a += tr; if (i === p) { a /= p; o[i] = a; } } else { a = (a * (p - 1) + tr) / p; o[i] = a; } } return o; };

  /* ---------- trade simulator ---------- */
  class Sim {
    constructor(o) {
      this.spec = o.spec; this.balance = o.balance; this.initial = o.initial != null ? o.initial : o.balance;
      this.spread = o.spread || 0; this.commission = o.commission || 0; this.slippage = o.slippage || 0; this.swap = o.swap || 0; this.trades = o.trades || [];
    }
    conv(px) { const s = this.spec; if (!s.quote || s.quote === 'USD') return 1; if (s.base === 'USD') return 1 / px; return 1; }
    approx() { const s = this.spec; return !!(s.quote && s.quote !== 'USD' && s.base !== 'USD'); }
    pnl(side, entry, exit, size) { return (side === 'buy' ? 1 : -1) * (exit - entry) * size * this.spec.contract * this.conv(exit); }
    riskAmt(entry, sl, size) { return sl == null ? null : Math.abs(entry - sl) * size * this.spec.contract * this.conv(sl); }
    sizeFromRisk(risk, entry, sl) {
      const per = Math.abs(entry - sl) * this.spec.contract * this.conv(sl);
      if (!per || !isFinite(per)) return 0;
      const st = this.spec.step, s = Math.floor(risk / per / st + 1e-9) * st;
      return F.round(s, 8);
    }
    ask(c) { return c.c + this.spread; }
    place(o, c) {
      const sp = this.spec; const buy = o.side === 'buy';
      if (!(o.size >= sp.min)) throw new Error('Size must be at least ' + sp.min + ' ' + sp.unit + '.');
      const type = o.type || 'market';
      const ref = buy ? this.ask(c) : c.c;
      let entry = type === 'market' ? (buy ? ref + this.slippage : ref - this.slippage) : ref;
      if (type !== 'market') {
        entry = +o.price; if (!isFinite(entry)) throw new Error('Enter a price for the pending order.');
        if (buy && type === 'limit' && !(entry < ref)) throw new Error('Buy limit price must be below the current price.');
        if (buy && type === 'stop' && !(entry > ref)) throw new Error('Buy stop price must be above the current price.');
        if (!buy && type === 'limit' && !(entry > ref)) throw new Error('Sell limit price must be above the current price.');
        if (!buy && type === 'stop' && !(entry < ref)) throw new Error('Sell stop price must be below the current price.');
      }
      const sl = o.sl == null || o.sl === '' ? null : +o.sl, tp = o.tp == null || o.tp === '' ? null : +o.tp;
      if (sl != null && (buy ? sl >= entry : sl <= entry)) throw new Error(buy ? 'Buy SL must be below entry.' : 'Sell SL must be above entry.');
      if (tp != null && (buy ? tp <= entry : tp >= entry)) throw new Error(buy ? 'Buy TP must be above entry.' : 'Sell TP must be below entry.');
      const t = {
        id: o.id || F.uid(), side: o.side, order_type: type, size: o.size, entry_price: entry, entry_time: type === 'market' ? c.t : null,
        sl, tp, status: type === 'market' ? 'open' : 'pending', exit_price: null, exit_time: null, exit_reason: null, pnl: null, r_multiple: null,
        risk_amount: type === 'market' ? this.riskAmt(entry, sl, o.size) : null, commission: 0, swap_cost: 0, gross_pnl: null, mfe: 0, mae: 0, parent_id: null, notes: o.notes || '', tags: o.tags || [], created_time: c.t,
      };
      this.trades.push(t); return t;
    }
    _exit(t, c) {
      const s = this.spread;
      if (t.side === 'buy') {
        if (t.sl != null && c.l <= t.sl) return { price: Math.min(t.sl, c.o) - this.slippage, reason: 'sl' };
        if (t.tp != null && c.h >= t.tp) return { price: Math.max(t.tp, c.o), reason: 'tp' };
      } else {
        if (t.sl != null && c.h + s >= t.sl) return { price: Math.max(t.sl, c.o + s) + this.slippage, reason: 'sl' };
        if (t.tp != null && c.l + s <= t.tp) return { price: Math.min(t.tp, c.o + s), reason: 'tp' };
      }
      return null;
    }
    _close(t, price, time, reason) {
      const gross = this.pnl(t.side, t.entry_price, price, t.size);
      const nights = Math.max(0, F.dayKey(time) - F.dayKey(t.entry_time != null ? t.entry_time : time));
      t.commission = F.round(this.commission * t.size + (t.commission_paid || 0), 2);
      t.swap_cost = F.round(this.swap * t.size * nights, 2);
      t.gross_pnl = F.round(gross, 2);
      t.pnl = F.round(gross - t.commission - t.swap_cost, 2);
      t.exit_price = price; t.exit_time = time; t.exit_reason = reason; t.status = 'closed';
      t.r_multiple = t.risk_amount > 0 ? F.round(t.pnl / t.risk_amount, 3) : null;
      this.balance = F.round(this.balance + t.pnl, 2);
    }
    onCandle(c) {
      const ch = [], s = this.spread;
      for (const t of this.trades) {
        if (t.status === 'pending') {
          let fill = null;
          if (t.side === 'buy') {
            if (t.order_type === 'limit' && c.l + s <= t.entry_price) fill = Math.min(t.entry_price, c.o + s);
            else if (t.order_type === 'stop' && c.h + s >= t.entry_price) fill = Math.max(t.entry_price, c.o + s);
          } else {
            if (t.order_type === 'limit' && c.h >= t.entry_price) fill = Math.max(t.entry_price, c.o);
            else if (t.order_type === 'stop' && c.l <= t.entry_price) fill = Math.min(t.entry_price, c.o);
          }
          if (fill != null) { t.entry_price = fill; t.status = 'open'; t.entry_time = c.t; t.risk_amount = this.riskAmt(fill, t.sl, t.size); ch.push(t); }
        }
        if (t.status === 'open') {
          const r = this._exit(t, c);
          const fav = t.side === 'buy' ? this.pnl('buy', t.entry_price, c.h, t.size) : this.pnl('sell', t.entry_price, c.l + s, t.size);
          const adv = t.side === 'buy' ? this.pnl('buy', t.entry_price, c.l, t.size) : this.pnl('sell', t.entry_price, c.h + s, t.size);
          if (fav > t.mfe) t.mfe = F.round(fav, 2);
          if (adv < t.mae) t.mae = F.round(adv, 2);
          if (r) { this._close(t, r.price, c.t, r.reason); if (!ch.includes(t)) ch.push(t); }
          else if (t.trail) {
            // trailing stop is moved only AFTER the candle closed -> applies from the next candle (no look-ahead)
            if (t.side === 'buy') { const ns = c.c - t.trail; if (t.sl == null || ns > t.sl) { t.sl = ns; ch.push(t); } }
            else { const ns = c.c + this.spread + t.trail; if (t.sl == null || ns < t.sl) { t.sl = ns; ch.push(t); } }
          }
        }
      }
      return ch;
    }
    closeTrade(t, c, reason) {
      if (t.status !== 'open') throw new Error('Trade is not open.');
      this._close(t, t.side === 'buy' ? c.c : c.c + this.spread, c.t, reason || 'manual'); return t;
    }
    cancel(t) { if (t.status === 'pending') t.status = 'cancelled'; return t; }
    modify(t, m, c) {
      const buy = t.side === 'buy';
      const ref = t.status === 'open' ? (buy ? c.c : c.c + this.spread) : t.entry_price;
      const sl = 'sl' in m ? (m.sl === '' || m.sl == null ? null : +m.sl) : t.sl;
      const tp = 'tp' in m ? (m.tp === '' || m.tp == null ? null : +m.tp) : t.tp;
      if (sl != null && (buy ? sl >= ref : sl <= ref)) throw new Error(buy ? 'SL must be below the current price.' : 'SL must be above the current price.');
      if (tp != null && (buy ? tp <= ref : tp >= ref)) throw new Error(buy ? 'TP must be above the current price.' : 'TP must be below the current price.');
      t.sl = sl; t.tp = tp;
      if (t.status === 'open' && t.risk_amount == null && sl != null) t.risk_amount = this.riskAmt(t.entry_price, sl, t.size);
      return t;
    }
    partialClose(t, size, c, childId) {
      if (t.status !== 'open') throw new Error('Trade is not open.');
      if (!(size > 0) || size >= t.size) throw new Error('Partial size must be greater than 0 and less than the trade size.');
      const st = this.spec.step; size = Math.floor(size / st + 1e-9) * st;
      if (size < this.spec.min) throw new Error('Partial size is below the minimum of ' + this.spec.min + '.');
      if (t.size - size < this.spec.min) throw new Error('Remaining size would fall below the minimum.');
      const frac = size / t.size;
      const child = Object.assign({}, t, { id: childId || F.uid(), size: F.round(size, 8), parent_id: t.id, tags: (t.tags || []).slice(), mfe: t.mfe * frac, mae: t.mae * frac,
        risk_amount: t.risk_amount != null ? t.risk_amount * frac : null, commission_paid: 0 });
      t.size = F.round(t.size - size, 8); t.risk_amount = t.risk_amount != null ? t.risk_amount * (1 - frac) : null;
      t.mfe *= 1 - frac; t.mae *= 1 - frac;
      this.trades.push(child); this._close(child, t.side === 'buy' ? c.c : c.c + this.spread, c.t, 'partial');
      return child;
    }
    breakeven(t, c) {
      if (t.status !== 'open') throw new Error('Trade is not open.');
      const px = t.side === 'buy' ? c.c : c.c + this.spread;
      if (t.side === 'buy' ? px <= t.entry_price : px >= t.entry_price) throw new Error('Breakeven can only be set when the trade is in profit.');
      t.sl = t.entry_price; return t;
    }
    setTrail(t, dist) {
      if (t.status !== 'open') throw new Error('Trade is not open.');
      if (dist == null || dist === '' || +dist === 0) { t.trail = null; return t; }
      if (!(+dist > 0)) throw new Error('Trailing distance must be greater than 0.');
      t.trail = +dist; return t;
    }
    floating(c) { let f = 0; for (const t of this.trades) if (t.status === 'open') f += this.pnl(t.side, t.entry_price, t.side === 'buy' ? c.c : c.c + this.spread, t.size); return f; }
    equity(c) { return this.balance + this.floating(c); }
  }
  F.Sim = Sim;

  /* ---------- analytics ---------- */
  F.stats = function (trades, initial) {
    const cl = trades.filter((t) => t.status === 'closed' && t.pnl != null).sort((a, b) => a.exit_time - b.exit_time);
    const n = cl.length;
    const wins = cl.filter((t) => t.pnl > 0), losses = cl.filter((t) => t.pnl < 0);
    const gp = wins.reduce((s, t) => s + t.pnl, 0), gl = -losses.reduce((s, t) => s + t.pnl, 0);
    const net = gp - gl;
    let eq = initial, peak = initial, maxDD = 0, maxDDpct = 0;
    const curve = [{ t: n ? cl[0].entry_time || cl[0].exit_time : 0, eq: initial, dd: 0 }];
    let cw = 0, cl2 = 0, maxW = 0, maxL = 0;
    for (const t of cl) {
      eq += t.pnl; if (eq > peak) peak = eq;
      const dd = peak - eq; if (dd > maxDD) maxDD = dd; const ddp = peak > 0 ? (dd / peak) * 100 : 0; if (ddp > maxDDpct) maxDDpct = ddp;
      curve.push({ t: t.exit_time, eq, dd: ddp });
      if (t.pnl > 0) { cw++; cl2 = 0; if (cw > maxW) maxW = cw; } else if (t.pnl < 0) { cl2++; cw = 0; if (cl2 > maxL) maxL = cl2; } else { cw = 0; cl2 = 0; }
    }
    const rs = cl.filter((t) => t.r_multiple != null).map((t) => t.r_multiple);
    const wd = Array(7).fill(0), wdn = Array(7).fill(0), hr = Array(24).fill(0), hrn = Array(24).fill(0);
    for (const t of cl) { const d = new Date(t.exit_time * 1000); wd[d.getUTCDay()] += t.pnl; wdn[d.getUTCDay()]++; hr[d.getUTCHours()] += t.pnl; hrn[d.getUTCHours()]++; }
    const side = (s) => { const a = cl.filter((t) => t.side === s); return { n: a.length, net: a.reduce((x, t) => x + t.pnl, 0), wr: a.length ? (a.filter((t) => t.pnl > 0).length / a.length) * 100 : 0 }; };
    const dur = (a) => (a.length ? a.reduce((s, t) => s + (t.exit_time - (t.entry_time || t.exit_time)), 0) / a.length : 0);
    return {
      n, wins: wins.length, losses: losses.length, net, gp, gl, wr: n ? (wins.length / n) * 100 : 0,
      pf: gl ? gp / gl : gp > 0 ? Infinity : 0, avgWin: wins.length ? gp / wins.length : 0, avgLoss: losses.length ? -gl / losses.length : 0,
      expectancy: n ? net / n : 0, avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0, rs,
      best: n ? Math.max(...cl.map((t) => t.pnl)) : 0, worst: n ? Math.min(...cl.map((t) => t.pnl)) : 0,
      maxDD, maxDDpct, maxWinStreak: maxW, maxLossStreak: maxL, curve, final: eq, retPct: initial ? (net / initial) * 100 : 0,
      byWeekday: wd, byWeekdayN: wdn, byHour: hr, byHourN: hrn, long: side('buy'), short: side('sell'),
      avgDurWin: dur(wins), avgDurLoss: dur(losses), closed: cl,
    };
  };

  /* ---------- Monte Carlo & prop firm ---------- */
  const rng = (seed) => { let a = (seed || (Math.random() * 2 ** 32) >>> 0) >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)))];
  F.monteCarlo = function (rs, o) {
    if (!rs.length) throw new Error('Monte Carlo requires closed trades with R-multiples (i.e. with a stop-loss).');
    const { sims = 1000, trades = 100, riskPct = 1, balance = 10000, ruinPct = 50, seed } = o || {};
    const r = rng(seed), finals = [], dds = [], paths = []; let ruin = 0, profit = 0;
    for (let s = 0; s < sims; s++) {
      let eq = balance, peak = balance, mdd = 0, ruined = false; const path = s < 40 ? [eq] : null;
      for (let i = 0; i < trades; i++) {
        eq *= 1 + (riskPct / 100) * rs[(r() * rs.length) | 0]; if (eq < 0) eq = 0;
        if (eq > peak) peak = eq; const dd = peak ? ((peak - eq) / peak) * 100 : 0; if (dd > mdd) mdd = dd;
        if (eq <= balance * (1 - ruinPct / 100)) ruined = true;
        if (path) path.push(eq);
      }
      finals.push(eq); dds.push(mdd); if (ruined) ruin++; if (eq > balance) profit++; if (path) paths.push(path);
    }
    finals.sort((a, b) => a - b); dds.sort((a, b) => a - b);
    return { finals, p5: pct(finals, 5), p25: pct(finals, 25), p50: pct(finals, 50), p75: pct(finals, 75), p95: pct(finals, 95), mean: finals.reduce((a, b) => a + b, 0) / sims, probProfit: (profit / sims) * 100, probRuin: (ruin / sims) * 100, ddMedian: pct(dds, 50), ddP95: pct(dds, 95), paths };
  };
  F.propSim = function (rs, o) {
    if (!rs.length) throw new Error('Prop simulation requires closed trades with R-multiples.');
    const { sims = 2000, balance = 10000, riskPct = 1, target = 10, dailyLoss = 5, maxLoss = 10, tradesPerDay = 2, maxDays = 30, minDays = 0, seed } = o || {};
    const r = rng(seed); let pass = 0, fd = 0, ft = 0, to = 0, dsum = 0;
    for (let s = 0; s < sims; s++) {
      let eq = balance, res = 'timeout', day = 0;
      for (day = 1; day <= maxDays && res === 'timeout'; day++) {
        const ds = eq;
        for (let k = 0; k < tradesPerDay; k++) {
          eq += balance * (riskPct / 100) * rs[(r() * rs.length) | 0];
          if (((ds - eq) / balance) * 100 >= dailyLoss) { res = 'daily'; break; }
          if (((balance - eq) / balance) * 100 >= maxLoss) { res = 'total'; break; }
        }
        if (res === 'timeout' && eq >= balance * (1 + target / 100) && day >= minDays) res = 'pass';
      }
      if (res === 'pass') { pass++; dsum += day - 1; } else if (res === 'daily') fd++; else if (res === 'total') ft++; else to++;
    }
    return { pass: (pass / sims) * 100, failDaily: (fd / sims) * 100, failTotal: (ft / sims) * 100, timeout: (to / sims) * 100, avgDays: pass ? dsum / pass : null };
  };
  F.propCheckHistory = function (trades, o) {
    const { balance = 10000, target = 10, dailyLoss = 5, maxLoss = 10, minDays = 0 } = o || {};
    const cl = trades.filter((t) => t.status === 'closed' && t.pnl != null).sort((a, b) => a.exit_time - b.exit_time);
    let eq = balance, ds = balance, curDay = null, tradingDays = new Set(), status = 'in progress', note = '';
    for (const t of cl) {
      const d = F.dayKey(t.exit_time); if (d !== curDay) { curDay = d; ds = eq; }
      eq += t.pnl; tradingDays.add(d);
      if (((ds - eq) / balance) * 100 >= dailyLoss) { status = 'FAILED'; note = 'Daily loss limit toota: ' + F.fmtDate(t.exit_time); break; }
      if (((balance - eq) / balance) * 100 >= maxLoss) { status = 'FAILED'; note = 'Max loss limit toota: ' + F.fmtDate(t.exit_time); break; }
      if (eq >= balance * (1 + target / 100) && tradingDays.size >= minDays) { status = 'PASSED'; note = 'Target hit: ' + F.fmtDate(t.exit_time); break; }
    }
    return { status, note, equity: eq, days: tradingDays.size, profitPct: ((eq - balance) / balance) * 100 };
  };

  /* ---------- strategy lab ---------- */
  F.strategies = {
    sma_cross: { name: 'SMA Crossover', params: { fast: 20, slow: 50 } },
    ema_cross: { name: 'EMA Crossover', params: { fast: 9, slow: 21 } },
    rsi_rev: { name: 'RSI Reversal', params: { period: 14, low: 30, high: 70 } },
    donchian: { name: 'Donchian Breakout', params: { period: 20 } },
    bb_rev: { name: 'Bollinger Reversion', params: { period: 20, mult: 2 } },
  };
  F.runStrategy = function (candles, type, params, o) {
    const { spec, balance = 10000, riskPct = 1, spread = 0, commission = 0, slAtr = 1.5, tpR = 2, atrPeriod = 14 } = o;
    const cl = candles.map((c) => c.c), p = Object.assign({}, F.strategies[type].params, params || {});
    const atr = I.atr(candles, atrPeriod); let sig;
    if (type === 'sma_cross' || type === 'ema_cross') {
      const f = (type === 'sma_cross' ? I.sma : I.ema)(cl, p.fast), s = (type === 'sma_cross' ? I.sma : I.ema)(cl, p.slow);
      sig = (i) => (f[i - 1] <= s[i - 1] && f[i] > s[i] ? 1 : f[i - 1] >= s[i - 1] && f[i] < s[i] ? -1 : 0);
    } else if (type === 'rsi_rev') {
      const r = I.rsi(cl, p.period);
      sig = (i) => (r[i - 1] < p.low && r[i] >= p.low ? 1 : r[i - 1] > p.high && r[i] <= p.high ? -1 : 0);
    } else if (type === 'donchian') {
      sig = (i) => { if (i < p.period + 1) return 0; let hh = -Infinity, ll = Infinity; for (let j = i - p.period; j < i; j++) { if (candles[j].h > hh) hh = candles[j].h; if (candles[j].l < ll) ll = candles[j].l; } return cl[i] > hh ? 1 : cl[i] < ll ? -1 : 0; };
    } else {
      const b = I.bb(cl, p.period, p.mult);
      sig = (i) => (cl[i] < b.lo[i] ? 1 : cl[i] > b.up[i] ? -1 : 0);
    }
    const sim = new Sim({ spec, balance, spread, commission });
    const warm = Math.max(atrPeriod + 2, (p.slow || p.period || 30) + 2);
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      sim.onCandle(c);
      if (i < warm || !isFinite(atr[i])) continue;
      if (sim.trades.some((t) => t.status === 'open' || t.status === 'pending')) continue;
      const sg = sig(i); if (!sg) continue;
      const buy = sg > 0, d = atr[i] * slAtr, entry = buy ? c.c + spread : c.c;
      const sl = buy ? entry - d : entry + d, tp = buy ? entry + d * tpR : entry - d * tpR;
      const size = sim.sizeFromRisk(sim.balance * (riskPct / 100), entry, sl);
      if (size < spec.min) continue;
      try { sim.place({ side: buy ? 'buy' : 'sell', size, sl, tp }, c); } catch (e) { /* skip invalid */ }
    }
    const lastC = candles[candles.length - 1];
    for (const t of sim.trades) if (t.status === 'open') sim.closeTrade(t, lastC, 'end');
    return { trades: sim.trades, stats: F.stats(sim.trades, balance), params: p };
  };

  /* ---------- rule-based coach (computed from real trades only) ---------- */
  F.coachInsights = function (trades, initial) {
    const st = F.stats(trades, initial), out = [];
    if (st.n < 5) return { st, items: [{ level: 'info', title: 'Insufficient data', text: 'Analysis requires at least 5 closed trades. Currently ' + st.n + '.' }] };
    const add = (level, title, text) => out.push({ level, title, text });
    const cl = st.closed;
    const noSL = cl.filter((t) => t.sl == null).length;
    if (noSL) add('bad', 'Trades without a stop-loss', noSL + ' / ' + st.n + ' trades had no SL. R-multiple and risk control cannot be measured without a SL.');
    if (st.avgLoss && Math.abs(st.avgLoss) > st.avgWin) add('bad', 'Average loss > average win', 'Avg win ' + F.fmtMoney(st.avgWin) + '; avg loss is ' + F.fmtMoney(st.avgLoss) + '. To make this setup profitable, win rate must be above ' + F.round((Math.abs(st.avgLoss) / (st.avgWin + Math.abs(st.avgLoss))) * 100, 0) + '% (currently ' + F.round(st.wr, 1) + '%).');
    else if (st.avgWin) add('good', 'Winners are larger than losers', 'Avg win ' + F.fmtMoney(st.avgWin) + ' vs avg loss ' + F.fmtMoney(st.avgLoss) + '.');
    if (st.pf < 1) add('bad', 'Profit factor below 1', 'Profit factor ' + F.round(st.pf, 2) + ', meaning total losses exceed total profit.');
    else if (isFinite(st.pf)) add('good', 'Profit factor ' + F.round(st.pf, 2), 'Expectancy ' + F.fmtMoney(st.expectancy) + ' per trade, avg R ' + F.round(st.avgR, 2) + '.');
    // revenge: size jump after loss
    let rev = 0, after = 0;
    for (let i = 1; i < cl.length; i++) if (cl[i - 1].pnl < 0) { after++; if (cl[i].size > cl[i - 1].size * 1.5) rev++; }
    if (after >= 3 && rev / after >= 0.25) add('bad', 'Size increased after a loss', 'Size was raised by more than 1.5x immediately after a loss ' + rev + ' times. This is a common revenge-trading pattern.');
    // risk consistency
    const ra = cl.filter((t) => t.risk_amount > 0).map((t) => t.risk_amount);
    if (ra.length >= 5) { const m = ra.reduce((a, b) => a + b, 0) / ra.length, sd = Math.sqrt(ra.reduce((a, b) => a + (b - m) ** 2, 0) / ra.length); if (sd / m > 0.5) add('warn', 'Risk per trade is inconsistent', 'Risk amount varies by ' + F.round((sd / m) * 100, 0) + '%. Use a fixed % risk.'); }
    // best / worst weekday & hour
    const dn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let wi = -1, wv = Infinity, bi = -1, bv = -Infinity;
    st.byWeekday.forEach((v, i) => { if (st.byWeekdayN[i] >= 3) { if (v < wv) { wv = v; wi = i; } if (v > bv) { bv = v; bi = i; } } });
    if (wi >= 0 && wv < 0) add('warn', dn[wi] + ' is the weakest day', dn[wi] + ': ' + F.fmtMoney(wv) + ' across ' + st.byWeekdayN[wi] + ' trades. Test reducing size or skipping trades on this day.');
    if (bi >= 0 && bv > 0) add('good', dn[bi] + ' is the strongest day', dn[bi] + ': ' + F.fmtMoney(bv) + ' (' + st.byWeekdayN[bi] + ' trades).');
    // long vs short
    if (st.long.n >= 4 && st.short.n >= 4 && Math.abs(st.long.wr - st.short.wr) > 20) { const l = st.long.wr > st.short.wr; add('info', (l ? 'Buy' : 'Sell') + ' side performs better', 'Buy win rate ' + F.round(st.long.wr, 0) + '% (' + st.long.n + ' trades) vs Sell ' + F.round(st.short.wr, 0) + '% (' + st.short.n + ').'); }
    // holding time
    if (st.avgDurWin && st.avgDurLoss && st.avgDurLoss > st.avgDurWin * 1.5) add('warn', 'Losers held too long', 'Average hold time of losing trades is ' + F.round(st.avgDurLoss / st.avgDurWin, 1) + 'x that of winners. Cut losses sooner.');
    if (st.maxLossStreak >= 5) add('warn', 'Long losing streak', 'Max losing streak was ' + st.maxLossStreak + ' trades. Max drawdown ' + F.round(st.maxDDpct, 1) + '%.');
    if (!out.length) add('info', 'No major issues found', 'Add more trades to make patterns clearer.');
    return { st, items: out };
  };
})(typeof window !== 'undefined' ? window : globalThis);
