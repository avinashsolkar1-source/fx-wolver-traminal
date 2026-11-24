/* FX WOLVER – core extensions: more indicators, sessions, SMC detection, prop evaluator, risk maths */
(function (g) {
  const F = g.FXW, I = F.ind, Sim = F.Sim;

  /* ---------- indicators ---------- */
  I.macd = (a, f, s, sig) => {
    const ef = I.ema(a, f), es = I.ema(a, s), m = a.map((_, i) => (isFinite(ef[i]) && isFinite(es[i]) ? ef[i] - es[i] : NaN));
    const first = m.findIndex((x) => isFinite(x)); const sg = new Array(a.length).fill(NaN);
    if (first >= 0) { const e = I.ema(m.slice(first), sig); for (let i = 0; i < e.length; i++) sg[first + i] = e[i]; }
    return { macd: m, signal: sg, hist: m.map((x, i) => (isFinite(x) && isFinite(sg[i]) ? x - sg[i] : NaN)) };
  };
  I.stoch = (cs, k, d, smooth) => {
    const raw = new Array(cs.length).fill(NaN);
    for (let i = k - 1; i < cs.length; i++) { let hh = -Infinity, ll = Infinity; for (let j = i - k + 1; j <= i; j++) { if (cs[j].h > hh) hh = cs[j].h; if (cs[j].l < ll) ll = cs[j].l; } raw[i] = hh === ll ? 50 : ((cs[i].c - ll) / (hh - ll)) * 100; }
    const sm = (a, p) => { const o = new Array(a.length).fill(NaN); for (let i = 0; i < a.length; i++) { let s = 0, n = 0; for (let j = i - p + 1; j <= i; j++) if (j >= 0 && isFinite(a[j])) { s += a[j]; n++; } if (n === p) o[i] = s / p; } return o; };
    const kk = smooth > 1 ? sm(raw, smooth) : raw; return { k: kk, d: sm(kk, d) };
  };
  // VWAP resets each UTC day. Uses tick volume of the imported data; if no volume exists it returns NaN (not faked).
  I.vwap = (cs) => {
    const o = new Array(cs.length).fill(NaN); let pv = 0, vv = 0, day = null;
    for (let i = 0; i < cs.length; i++) { const d = F.dayKey(cs[i].t); if (d !== day) { day = d; pv = 0; vv = 0; } const v = cs[i].v || 0; pv += ((cs[i].h + cs[i].l + cs[i].c) / 3) * v; vv += v; if (vv > 0) o[i] = pv / vv; }
    return o;
  };
  F.INDICATORS = {
    ema: { name: 'EMA', pane: 'price', params: { period: 21 }, color: '#f5b942' },
    sma: { name: 'SMA', pane: 'price', params: { period: 50 }, color: '#7aa7f7' },
    ma: { name: 'Moving Average (WMA)', pane: 'price', params: { period: 20 }, color: '#c084fc' },
    bb: { name: 'Bollinger Bands', pane: 'price', params: { period: 20, mult: 2 }, color: '#8795ad' },
    vwap: { name: 'VWAP (daily)', pane: 'price', params: {}, color: '#22d3ee' },
    rsi: { name: 'RSI', pane: 'sub', params: { period: 14 }, color: '#a78bfa' },
    macd: { name: 'MACD', pane: 'sub', params: { fast: 12, slow: 26, signal: 9 }, color: '#3b82f6' },
    stoch: { name: 'Stochastic', pane: 'sub', params: { k: 14, d: 3, smooth: 3 }, color: '#34d399' },
    atr: { name: 'ATR', pane: 'sub', params: { period: 14 }, color: '#fb923c' },
    volume: { name: 'Volume', pane: 'sub', params: {}, color: '#64748b' },
  };
  I.wma = (a, p) => { const o = new Array(a.length).fill(NaN), den = (p * (p + 1)) / 2; for (let i = p - 1; i < a.length; i++) { let s = 0; for (let j = 0; j < p; j++) s += a[i - p + 1 + j] * (j + 1); o[i] = s / den; } return o; };
  // compute an indicator on the VISIBLE candle array only (caller passes the replay-limited array => no look-ahead)
  F.computeIndicator = function (ind, cs) {
    const cl = cs.map((c) => c.c), p = ind.params || {};
    switch (ind.type) {
      case 'ema': return { lines: [I.ema(cl, p.period)] };
      case 'sma': return { lines: [I.sma(cl, p.period)] };
      case 'ma': return { lines: [I.wma(cl, p.period)] };
      case 'bb': { const b = I.bb(cl, p.period, p.mult); return { lines: [b.up, b.mid, b.lo], fill: [0, 2] }; }
      case 'vwap': return { lines: [I.vwap(cs)] };
      case 'rsi': return { sub: true, lines: [I.rsi(cl, p.period)], levels: [30, 70], range: [0, 100] };
      case 'macd': { const m = I.macd(cl, p.fast, p.slow, p.signal); return { sub: true, lines: [m.macd, m.signal], hist: m.hist }; }
      case 'stoch': { const s = I.stoch(cs, p.k, p.d, p.smooth); return { sub: true, lines: [s.k, s.d], levels: [20, 80], range: [0, 100] }; }
      case 'atr': return { sub: true, lines: [I.atr(cs, p.period)] };
      case 'volume': return { sub: true, volume: true, lines: [] };
    }
    return { lines: [] };
  };

  /* ---------- sessions (UTC, documented in the UI) ---------- */
  F.SESSIONS = [{ k: 'Asia', from: 0, to: 7 }, { k: 'London', from: 7, to: 12 }, { k: 'New York', from: 12, to: 21 }, { k: 'Off-hours', from: 21, to: 24 }];
  F.sessionOf = (t) => { const h = new Date(t * 1000).getUTCHours(); return (F.SESSIONS.find((s) => h >= s.from && h < s.to) || F.SESSIONS[3]).k; };

  /* ---------- SMC detection (rules documented in UI; operates ONLY on candles it is given) ----------
     Swing high/low : candle whose high (low) is the highest (lowest) of N bars on each side. Confirmed N bars AFTER the pivot.
     BOS            : close beyond the last confirmed swing in the direction of the current structure.
     CHoCH          : close beyond the last confirmed swing AGAINST the current structure (first opposite break).
     FVG            : 3-candle gap: bullish c1.high < c3.low, bearish c1.low > c3.high; (gap >= minGapAtr * ATR). Mitigated when price later trades fully through it.
     Order Block    : last opposite-colour candle before the impulse candle that produced a BOS/CHoCH. Mitigated when price later closes through its far side.
     Equal H/L      : two confirmed swings of same type within tol * ATR of each other.
     Premium/Discount: last confirmed swing high/low range, split at 50% equilibrium.
     These are objective rule outputs, not trade signals. */
  F.detectSMC = function (cs, o) {
    o = Object.assign({ n: 3, minGapAtr: 0.1, eqTol: 0.1 }, o || {});
    const n = o.n, out = { swings: [], bos: [], choch: [], fvg: [], ob: [], eq: [], pd: null };
    if (cs.length < n * 2 + 5) return out;
    const atr = I.atr(cs, 14), A = (i) => atr[i] || atr[Math.min(cs.length - 1, i + 14)] || (cs[i].h - cs[i].l);
    let lastH = null, lastL = null, trend = 0;
    for (let i = n; i < cs.length; i++) {
      const p = i - n; let isH = true, isL = true;
      if (p >= n) { for (let j = p - n; j <= p + n; j++) { if (j === p) continue; if (cs[j].h >= cs[p].h) isH = false; if (cs[j].l <= cs[p].l) isL = false; } } else { isH = isL = false; }
      if (isH) { const s = { type: 'H', idx: p, t: cs[p].t, p: cs[p].h, confirmT: cs[i].t }; out.swings.push(s); lastH = s; }
      if (isL) { const s = { type: 'L', idx: p, t: cs[p].t, p: cs[p].l, confirmT: cs[i].t }; out.swings.push(s); lastL = s; }
      const c = cs[i];
      if (lastH && !lastH.broken && c.c > lastH.p) {
        lastH.broken = true; const ev = { dir: 'bull', level: lastH.p, fromT: lastH.t, t: c.t, idx: i };
        if (trend >= 0) out.bos.push(ev); else out.choch.push(ev); trend = 1;
        for (let j = i - 1; j >= Math.max(0, lastH.idx); j--) if (cs[j].c < cs[j].o) { out.ob.push({ dir: 'bull', t: cs[j].t, hi: cs[j].h, lo: cs[j].l, idx: j, at: i }); break; }
      }
      if (lastL && !lastL.broken && c.c < lastL.p) {
        lastL.broken = true; const ev = { dir: 'bear', level: lastL.p, fromT: lastL.t, t: c.t, idx: i };
        if (trend <= 0) out.bos.push(ev); else out.choch.push(ev); trend = -1;
        for (let j = i - 1; j >= Math.max(0, lastL.idx); j--) if (cs[j].c > cs[j].o) { out.ob.push({ dir: 'bear', t: cs[j].t, hi: cs[j].h, lo: cs[j].l, idx: j, at: i }); break; }
      }
    }
    for (let i = 2; i < cs.length; i++) {
      const a = cs[i - 2], c = cs[i], gap = Math.max(c.l - a.h, a.l - c.h);
      if (gap > o.minGapAtr * A(i)) out.fvg.push(c.l > a.h ? { dir: 'bull', t: a.t, t2: c.t, hi: c.l, lo: a.h, idx: i } : { dir: 'bear', t: a.t, t2: c.t, hi: a.l, lo: c.h, idx: i });
    }
    for (const z of out.fvg) { z.mitigated = false; for (let k = z.idx + 1; k < cs.length; k++) if (z.dir === 'bull' ? cs[k].l <= z.lo : cs[k].h >= z.hi) { z.mitigated = true; z.mitT = cs[k].t; break; } }
    for (const z of out.ob) { z.mitigated = false; for (let k = z.at + 1; k < cs.length; k++) if (z.dir === 'bull' ? cs[k].c < z.lo : cs[k].c > z.hi) { z.mitigated = true; z.mitT = cs[k].t; break; } }
    for (const T of ['H', 'L']) { const sw = out.swings.filter((s) => s.type === T); for (let i = 1; i < sw.length; i++) { const a = sw[i - 1], b = sw[i]; if (Math.abs(a.p - b.p) <= o.eqTol * A(b.idx)) out.eq.push({ type: T, t1: a.t, t2: b.t, p: (a.p + b.p) / 2 }); } }
    if (lastH && lastL) { const hi = Math.max(lastH.p, lastL.p), lo = Math.min(lastH.p, lastL.p); out.pd = { hi, lo, mid: (hi + lo) / 2, t: Math.min(lastH.t, lastL.t) }; }
    return out;
  };

  /* ---------- prop firm rule evaluator (all rules configurable; no firm hardcoded) ---------- */
  F.PROP_DEFAULT = { balance: 10000, target: 10, dailyLoss: 5, maxLoss: 10, ddType: 'static', minDays: 0, consistency: 0, maxRisk: 0 };
  F.propEvaluate = function (trades, cfg, liveEquity) {
    cfg = Object.assign({}, F.PROP_DEFAULT, cfg); const B = cfg.balance;
    const cl = trades.filter((t) => t.status === 'closed' && t.pnl != null).sort((a, b) => a.exit_time - b.exit_time);
    let bal = B, peak = B, dayStart = B, curDay = null; const days = {}, viol = []; let failed = false, passedAt = null;
    for (const t of cl) {
      const d = F.dayKey(t.exit_time); if (d !== curDay) { curDay = d; dayStart = bal; }
      bal += t.pnl; days[d] = (days[d] || 0) + t.pnl; if (bal > peak) peak = bal;
      const floor = cfg.ddType === 'trailing' ? Math.max(peak - (B * cfg.maxLoss) / 100, 0) : B * (1 - cfg.maxLoss / 100);
      if (cfg.maxRisk > 0 && t.risk_amount != null && (t.risk_amount / B) * 100 > cfg.maxRisk + 1e-9) viol.push({ t: t.exit_time, rule: 'Max position risk', text: 'Trade risk was ' + F.round((t.risk_amount / B) * 100, 2) + '% (limit ' + cfg.maxRisk + '%)' });
      if (cfg.dailyLoss > 0 && ((dayStart - bal) / B) * 100 >= cfg.dailyLoss && !failed) { failed = true; viol.push({ t: t.exit_time, rule: 'Daily loss', text: 'Daily loss limit ' + cfg.dailyLoss + '% toota (' + F.fmtDate(t.exit_time) + ')', fatal: true }); }
      if (bal <= floor && !failed) { failed = true; viol.push({ t: t.exit_time, rule: cfg.ddType === 'trailing' ? 'Trailing drawdown' : 'Max loss', text: (cfg.ddType === 'trailing' ? 'Trailing drawdown' : 'Max loss') + ' limit toota (' + F.fmtDate(t.exit_time) + ')', fatal: true }); }
    }
    const eq = liveEquity != null ? liveEquity : bal, dayCount = Object.keys(days).length;
    const profit = bal - B, totalPos = Object.values(days).filter((x) => x > 0).reduce((a, b) => a + b, 0), bestDay = Math.max(0, ...Object.values(days));
    const consPct = totalPos > 0 ? (bestDay / totalPos) * 100 : 0;
    const consOK = !(cfg.consistency > 0) || profit <= 0 || consPct <= cfg.consistency;
    const targetHit = profit >= (B * cfg.target) / 100, daysOK = dayCount >= cfg.minDays;
    const floorNow = cfg.ddType === 'trailing' ? Math.max(peak - (B * cfg.maxLoss) / 100, 0) : B * (1 - cfg.maxLoss / 100);
    const lastDay = cl.length ? F.dayKey(cl[cl.length - 1].exit_time) : null;
    const todayLoss = lastDay != null ? Math.max(0, dayStart - eq) : 0;
    let status = 'IN PROGRESS'; if (failed) status = 'FAILED'; else if (targetHit && daysOK && consOK) status = 'PASSED';
    return { status, balance: bal, equity: eq, profit, profitPct: (profit / B) * 100, targetProgress: Math.max(0, Math.min(100, (profit / ((B * cfg.target) / 100)) * 100)),
      dailyAllowance: cfg.dailyLoss > 0 ? (B * cfg.dailyLoss) / 100 - todayLoss : null, ddAllowance: eq - floorNow, floor: floorNow, tradingDays: dayCount,
      consistencyPct: consPct, consistencyOK: consOK, targetHit, daysOK, violations: viol, bestDay };
  };


  /* ---------- condition-based strategy engine ----------
     rules = { long:[cond], short:[cond], exitLong:[cond], exitShort:[cond], sl:{mode:'atr'|'pips'|'pct', v, atrP}, tp:{r}, riskPct }
     cond = { l:operand, op:'>'|'<'|'crosses_above'|'crosses_below', r:operand };  operand = {k:'close|open|high|low|ema|sma|rsi|atr|macd|macdsig|bbup|bblo|bbmid|stoch|num', p, v}
     Conditions in one list are combined with AND. Signals are evaluated on the CLOSED candle i and executed at that candle's close. */
  F.OPERANDS = { close: 'Close', open: 'Open', high: 'High', low: 'Low', ema: 'EMA', sma: 'SMA', rsi: 'RSI', atr: 'ATR', macd: 'MACD line', macdsig: 'MACD signal', bbup: 'Bollinger upper', bblo: 'Bollinger lower', bbmid: 'Bollinger mid', stoch: 'Stochastic %K', num: 'Number' };
  F.operandSeries = function (cs, o, cache) {
    const key = o.k + ':' + (o.p || '') + ':' + (o.v == null ? '' : o.v); if (cache[key]) return cache[key]; const cl = cs.map((c) => c.c); let r;
    switch (o.k) {
      case 'close': r = cl; break; case 'open': r = cs.map((c) => c.o); break; case 'high': r = cs.map((c) => c.h); break; case 'low': r = cs.map((c) => c.l); break;
      case 'ema': r = I.ema(cl, o.p || 20); break; case 'sma': r = I.sma(cl, o.p || 20); break; case 'rsi': r = I.rsi(cl, o.p || 14); break; case 'atr': r = I.atr(cs, o.p || 14); break;
      case 'macd': r = I.macd(cl, 12, 26, 9).macd; break; case 'macdsig': r = I.macd(cl, 12, 26, 9).signal; break;
      case 'bbup': r = I.bb(cl, o.p || 20, 2).up; break; case 'bblo': r = I.bb(cl, o.p || 20, 2).lo; break; case 'bbmid': r = I.bb(cl, o.p || 20, 2).mid; break;
      case 'stoch': r = I.stoch(cs, o.p || 14, 3, 3).k; break; case 'num': r = new Array(cs.length).fill(+o.v); break; default: throw new Error('Unknown operand ' + o.k);
    }
    return (cache[key] = r);
  };
  F.condText = (c) => { const t = (o) => (o.k === 'num' ? o.v : F.OPERANDS[o.k] + (o.p ? '(' + o.p + ')' : '')); return t(c.l) + ' ' + ({ '>': '>', '<': '<', crosses_above: 'crosses above', crosses_below: 'crosses below' })[c.op] + ' ' + t(c.r); };
  F.runRules = function (candles, rules, o) {
    const { spec, balance = 10000, spread = 0, commission = 0, slippage = 0, swap = 0 } = o, cache = {};
    const compile = (list) => (list || []).map((c) => ({ c, L: F.operandSeries(candles, c.l, cache), R: F.operandSeries(candles, c.r, cache) }));
    const L = compile(rules.long), S = compile(rules.short), XL = compile(rules.exitLong), XS = compile(rules.exitShort);
    if (!L.length && !S.length) throw new Error('At least one entry condition (long or short) is required.');
    const test = (list, i) => list.length > 0 && list.every(({ c, L: a, R: b }) => { if (!isFinite(a[i]) || !isFinite(b[i])) return false; if (c.op === '>') return a[i] > b[i]; if (c.op === '<') return a[i] < b[i]; if (!isFinite(a[i - 1]) || !isFinite(b[i - 1])) return false; return c.op === 'crosses_above' ? a[i - 1] <= b[i - 1] && a[i] > b[i] : a[i - 1] >= b[i - 1] && a[i] < b[i]; });
    const atr = I.atr(candles, (rules.sl && rules.sl.atrP) || 14), sl = rules.sl || { mode: 'atr', v: 1.5 }, tpR = rules.tp && rules.tp.r > 0 ? rules.tp.r : null, riskPct = rules.riskPct || 1;
    const sim = new Sim({ spec, balance, spread, commission, slippage, swap }); const warm = 60;
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i]; sim.onCandle(c); if (i < warm) continue;
      const open = sim.trades.find((t) => t.status === 'open');
      if (open && test(open.side === 'buy' ? XL : XS, i)) { sim.closeTrade(open, c, 'signal'); continue; }
      if (open) continue; const buy = test(L, i), sell = !buy && test(S, i); if (!buy && !sell) continue;
      const entry = buy ? c.c + spread + slippage : c.c - slippage; let d;
      if (sl.mode === 'atr') { if (!isFinite(atr[i])) continue; d = atr[i] * sl.v; } else if (sl.mode === 'pips') d = sl.v * (spec.pip || 1); else d = entry * (sl.v / 100);
      if (!(d > 0)) continue; const slp = buy ? entry - d : entry + d, tpp = tpR ? (buy ? entry + d * tpR : entry - d * tpR) : null;
      const size = sim.sizeFromRisk(sim.balance * (riskPct / 100), entry, slp); if (size < spec.min) continue;
      try { sim.place({ side: buy ? 'buy' : 'sell', size, sl: slp, tp: tpp }, c); } catch (e) { /* invalid, skip */ }
    }
    const last = candles[candles.length - 1]; for (const t of sim.trades) if (t.status === 'open') sim.closeTrade(t, last, 'end');
    return { trades: sim.trades, stats: F.stats(sim.trades, balance) };
  };

  /* ---------- risk maths ---------- */
  // Risk of ruin (fixed-fraction, independent trades): ruin when equity falls to (1-ruinPct) of start. Uses simple closed-form for win-rate/payoff.
  F.riskOfRuin = function (winRate, rr, riskPct, ruinPct) {
    const w = winRate / 100, q = 1 - w; const edge = w * rr - q; if (edge <= 0) return 1;
    const unit = ruinPct / riskPct; // number of risk units to lose to be "ruined"
    // approximate with the random-walk gambler's ruin on R units: P = ((1-a)/(1+a))^unit, a = edge / sqrt(variance + edge^2)
    const m = edge, v = w * (rr - m) ** 2 + q * (-1 - m) ** 2; const a = m / Math.sqrt(v + m * m);
    return Math.pow((1 - a) / (1 + a), unit);
  };
  F.lossStreakProb = function (winRate, len, trades) { const q = 1 - winRate / 100; // P(at least one streak of len losses in N trades) via DP
    let st = new Array(len).fill(0); st[0] = 1; let hit = 0;
    for (let i = 0; i < trades; i++) { const nx = new Array(len).fill(0); for (let k = 0; k < len; k++) { nx[0] += st[k] * (1 - q); if (k + 1 === len) hit += st[k] * q; else nx[k + 1] += st[k] * q; } st = nx; }
    return hit; };
  F.projectEquity = (bal, riskPct, winRate, rr, trades) => { const e = (winRate / 100) * rr - (1 - winRate / 100); const out = [bal]; let b = bal; for (let i = 0; i < trades; i++) { b *= 1 + (riskPct / 100) * e; out.push(b); } return out; };
  F.drawdownRecovery = (ddPct) => (ddPct >= 100 ? Infinity : (ddPct / (100 - ddPct)) * 100);
})(typeof window !== 'undefined' ? window : globalThis);
