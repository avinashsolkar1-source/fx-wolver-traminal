/* FX WOLVER – Replay Workspace (trading terminal)
   Look-ahead safety: every panel/indicator/SMC calc is fed ONLY candles with index <= W.idx (see feedPanel).
   Determinism: session state = initial settings + candle data + action log. Trades are rebuilt from the log, which makes "previous candle" and "resume" exact. */
(function (g) {
  const F = g.FXW, U = F.ui, DB = F.DB, A = F.App, { $, $$, esc, icon } = { $: U.$, $$: U.$$, esc: U.esc, icon: U.icon };
  const SPEEDS = [1, 2, 5, 10, 20, 50];
  const TOOLS = [['cursor', 'cursor', 'Select / move (Esc)'], ['trend', 'trend', 'Trendline'], ['ray', 'ray', 'Ray'], ['hline', 'hline', 'Horizontal line'], ['vline', 'vline', 'Vertical line'], ['rect', 'rect', 'Rectangle'], ['zone', 'zone', 'Support / Resistance zone'], ['fibret', 'fib', 'Fib retracement'], ['fibext', 'fib', 'Fib extension (3 clicks)'], ['text', 'text', 'Text'], ['longpos', 'pos', 'Long position (3 clicks)'], ['shortpos', 'pos', 'Short position (3 clicks)'], null,
    ['ob', 'ob', 'SMC: Order block'], ['fvg', 'fvg', 'SMC: Fair value gap'], ['liq', 'liq', 'SMC: Liquidity level'], ['eqh', 'swing', 'SMC: Equal highs'], ['eql', 'swing', 'SMC: Equal lows'], ['bos', 'bos', 'SMC: BOS'], ['choch', 'bos', 'SMC: CHoCH'], ['pd', 'pd', 'SMC: Premium / Discount'], ['mit', 'ob', 'SMC: Mitigation zone'], ['swing', 'swing', 'SMC: Swing label']];
  const EXEC_DOC = `<b>Execution model (candle-based, documented)</b><ul style="padding-left:18px;margin:6px 0">
  <li><b>Market order</b> fills at the <b>close</b> of the revealed candle: Buy = close + spread (ask), Sell = close (bid). Slippage always works against you.</li>
  <li><b>Limit / Stop</b> orders fill on subsequent candles when the candle's range touches the price. If a candle opens with a gap through the price, the order fills at the <b>open price</b>.</li>
  <li><b>SL / TP</b> are checked against the high/low of each subsequent candle. For sell trades, the trigger is on the ask side (price + spread).</li>
  <li><b>If SL and TP are both touched in the same candle</b>, the intra-candle order is unknown, so <b>SL is assumed to hit first</b> (pessimistic).</li>
  <li><b>Gap</b> If a candle opens beyond the SL, the fill is at the <b>open price</b> (worse than SL); if it gaps beyond the TP, the fill is at the open (better than TP).</li>
  <li><b>Trailing stop</b> moves after a candle closes and takes effect from the next candle. <b>Breakeven</b> places the SL at the entry price.</li>
  <li><b>Commission</b> is charged at close, <b>swap</b> is charged per night at each daily rollover (UTC).</li>
  <li><b>No look-ahead:</b> the chart, indicators, SMC detection and trading engine only see data up to the current candle.</li>
  <li>The smaller the base data timeframe, the higher the fill accuracy. This is an educational historical simulator, not a live brokerage.</li></ul>`;

  F.pages.workspace = async function (el, ctx) {
    if (!ctx.arg) return chooser(el);
    return openWs(el, ctx.arg, ctx);
  };

  async function chooser(el) {
    const ses = await A.sessions();
    if (ses.length) { A.go('#/bt/workspace/' + ses[0].id); return; }   // terminal opens straight into your latest session
    const tool = (t) => `<button disabled aria-label="${esc(t[2])}" data-tip="${esc(t[2])}">${icon(t[1])}</button>`;
    el.classList.add('flush');
    el.innerHTML = `<div class="ws"><div class="wsbar"><div class="seg2"><button class="on" type="button">\u25E2 FXW Pro chart</button><button type="button" id="e_tv">TradingView</button></div><span class="symchip">\u2014 <small>NO DATA</small></span><span class="srcb" style="color:#fbbf24;border-color:#f59e0b55;background:#f59e0b12">NO DATA LOADED YET</span><span class="sep"></span>
      <div class="tfb">${['5m', '15m', '1h', '4h', '1d'].map((k) => `<button disabled>${k}</button>`).join('')}</div><span class="sep"></span><button class="btn sm ic" disabled>${icon('reset')}</button><button class="btn sm ic" disabled>${icon('prev')}</button><button class="btn sm pri ic" disabled>${icon('play')}</button><button class="btn sm ic" disabled>${icon('next')}</button></div>
      <div class="wsmain noside" style="grid-template-columns:44px 1fr"><div class="draw">${TOOLS.filter(Boolean).slice(0, 14).map(tool).join('')}</div>
      <div class="panes"><div class="cgrid" style="display:grid;place-items:center;background:radial-gradient(ellipse 60% 50% at 50% 45%,#0d2a52 0,#070d1a 70%)"><div style="text-align:center;max-width:460px;padding:20px"><span class="lfx big" style="--s:96px"><img src="assets/logo.png" alt=""></span>
        <h2 style="margin:20px 0 6px;font-family:var(--display)">FX WOLVER Terminal</h2><p class="mut" style="margin:0 0 18px;line-height:1.6">The terminal is ready. Charting, indicators, drawing tools, replay and trading will work here as soon as historical data is loaded. No data has been loaded yet.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn pri" href="#/bt/new">${icon('plus')} Load data & start backtest</a><a class="btn" href="#/bt/tv">TradingView</a></div><p class="hint" style="margin-top:16px"><a href="#/bt/data" style="color:var(--dim)">CSV import</a></p></div></div>
        <div class="rgbar">${['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', 'All'].map((k) => `<button disabled>${k}</button>`).join('')}</div>
        <div class="qdock"><button class="qb qs" disabled><small>SELL</small><b class="mono">\u2013</b></button><span class="qspr">\u2013</span><button class="qb qy" disabled><small>BUY</small><b class="mono">\u2013</b></button><input class="in qin" disabled placeholder="SL price"><input class="in qin" disabled placeholder="TP price"><div class="qlot"><button disabled>\u2212</button><input class="in" disabled value="0.10"><button disabled>+</button></div></div></div></div></div>`;
    $('#e_tv', el).onclick = () => A.go('#/bt/tv');
    return () => el.classList.remove('flush');
  }

  async function openWs(el, sid, ctx) {
    const s = await DB.get('sessions', sid); if (!s) throw new Error('Session not found (it may have been deleted).');
    const [S, ds, dsAll, tradesDB, drDoc, tpls, imps, props, journalDB, layouts] = await Promise.all([A.settingsGet(), DB.get('datasets', s.dataset_id), DB.list('datasets'), A.trades(sid), DB.get('drawings', 'dr:' + sid), DB.list('indicator_templates'), DB.list('imports'), DB.list('prop_configs'), DB.list('journal', { session_id: sid }), DB.list('layouts')]);
    if (!ds) throw new Error('The dataset for this session has been deleted. Re-import it in Market Data.');
    const cs = await DB.loadCandles(s.dataset_id); if (ctx.isStale()) return;
    const spec = F.specFor(s.symbol, s.market), lowerBound = (t) => { let lo = 0, hi = cs.length; while (lo < hi) { const m = (lo + hi) >> 1; if (cs[m].t < t) lo = m + 1; else hi = m; } return lo; };
    const W = { s, spec, cs, startIdx: lowerBound(s.start_t), endIdx: 0, idx: 0, sim: null, log: (s.log || []).slice(), panels: [], active: 0, playing: false, timer: null, speed: s.speed || S.speed || 5, tool: null, side: 'buy', savedHash: {}, journalIds: new Set(journalDB.map((j) => j.id)), closedSeen: new Set(), drawings: (drDoc && drDoc.list) || [], drDirty: false, indicators: (s.ui && s.ui.indicators) || [], smc: (s.ui && s.ui.smc) || { on: false, n: 3, gap: 0.1, eq: 0.1, show: { fvg: true, ob: true, bos: true, choch: true, eq: true, pd: false, swings: false } }, layout: (s.ui && s.ui.layout) || { n: 1, tfs: [s.tf], srcs: [s.dataset_id] }, sync: !(s.ui && s.ui.sync === false), srcs: new Map(), events: [], pauseOnClose: S.pauseOnClose !== false, autoShot: S.autoShot !== false, magnet: false, tab: 'trade', rpOpen: window.innerWidth > 860, botCol: false, bottomTab: 'pos', saveState: 'saved', dirty: false };
    { let e = cs.length - 1; while (e > 0 && cs[e].t > s.end_t) e--; W.endIdx = e; }
    W.idx = Math.max(W.startIdx, Math.min(W.endIdx, s.cur_t != null ? lowerBound(s.cur_t) : s.idx || W.startIdx));
    W.srcs.set(s.dataset_id, { main: true, cs, base: s.base_sec, arrs: new Map(), meta: ds });
    W.events = imps.filter((i) => i.kind === 'events').flatMap((i) => i.rows).filter((e) => e.imp !== 'low' && (!e.cur || e.cur === spec.base || e.cur === spec.quote || (s.market !== 'forex' && e.cur === 'USD'))).sort((a, b) => a.t - b.t);
    const colors = { up: S.chart.upColor, down: S.chart.downColor, bg: S.chart.bg };
    const prop = props.find((p) => p.id === s.prop_id) || null;

    /* ---------- deterministic rebuild from the action log ---------- */
    const mkSim = () => new F.Sim({ spec, balance: s.initial, initial: s.initial, spread: s.spread, commission: s.commission, slippage: s.slippage, swap: s.swap });
    const decorate = (t, tf) => { t.session_id = sid; t.symbol = s.symbol; t.market = s.market; t.tf = tf || s.tf; t.strategy = s.strategy_name || 'Manual'; return t; };
    const byId = (id) => W.sim.trades.find((t) => t.id === id);
    function applyAction(a, c) {
      try {
        if (a.a === 'place') { const t = W.sim.place(Object.assign({}, a.o), c); decorate(t, a.tf); }
        else if (a.a === 'close') W.sim.closeTrade(byId(a.id), c, 'manual');
        else if (a.a === 'cancel') W.sim.cancel(byId(a.id));
        else if (a.a === 'modify') W.sim.modify(byId(a.id), { sl: a.sl, tp: a.tp }, c);
        else if (a.a === 'be') W.sim.breakeven(byId(a.id), c);
        else if (a.a === 'trail') W.sim.setTrail(byId(a.id), a.dist);
        else if (a.a === 'partial') { const ch = W.sim.partialClose(byId(a.id), a.size, c, a.child); decorate(ch, byId(a.id).tf); }
      } catch (e) { console.warn('replay action skipped', a, e.message); }
    }
    function rebuild(target) {
      W.sim = mkSim(); const m = new Map(); W.log.forEach((a) => { if (!m.has(a.t)) m.set(a.t, []); m.get(a.t).push(a); });
      for (let i = W.startIdx; i <= target; i++) { const c = cs[i]; if (i > W.startIdx) W.sim.onCandle(c); const acts = m.get(c.t); if (acts) acts.forEach((a) => applyAction(a, c)); }
      W.closedSeen = new Set(W.sim.trades.filter((t) => t.status === 'closed').map((t) => t.id));
    }
    rebuild(W.idx);

    /* ---------- DOM ---------- */
    el.innerHTML = `<div class="ws" id="ws"><div class="wsbar" id="bar"></div><div class="wsmain" id="wm"><div class="draw" id="dt"></div><div class="panes"><div class="cgrid" id="cg"></div><div class="rgbar" id="rg"></div><div class="qdock" id="qd"></div><div class="botp" id="bp"></div><button class="railopen hide" id="dopen" title="Show tools">☰</button></div><div class="rp" id="rp"></div></div><div class="statusbar" id="sb"></div></div>`;
    const q = (sel) => $(sel, el);

    /* ---------- toolbar ---------- */
    const optsFor = (srcId) => { const sr = W.srcs.get(srcId); return A.tfOptions(sr ? sr.base : s.base_sec); };
    function renderBar() {
      const tfs = optsFor(W.panels[W.active] ? W.panels[W.active].srcId : s.dataset_id), ap = W.panels[W.active];
      q('#bar').innerHTML = `<div class="seg2" id="eng"><button class="on" id="eng_n" type="button">◢ FXW Pro chart</button><button id="eng_tv" type="button" title="TradingView (not connected yet)">TradingView</button></div><span class="symchip" title="${esc(s.name)}">${esc(s.symbol)} <small>${esc((spec.market || '').toUpperCase())}</small></span><span class="srcb" title="Data source of this backtest">REAL DATA · ${esc(ds.source || 'imported')}</span><span class="px mono" id="px">–</span><span class="mut mono" id="spx" style="font-size:11px"></span><span class="sep"></span>
      <div class="tfb" id="tfb">${tfs.map((k) => `<button data-k="${k}" class="${ap && ap.tf === k ? 'on' : ''}">${k}</button>`).join('')}</div><span class="sep"></span>
      <div class="tfb" id="lay" title="Chart layout">${[1, 2, 3, 4, 6].map((n) => `<button data-n="${n}" class="${W.layout.n === n ? 'on' : ''}" title="${n} chart${n > 1 ? 's' : ''}">${n}</button>`).join('')}</div><label class="chip" style="padding:3px 9px;font-size:11.5px" title="Sync panel scrolling"><input type="checkbox" id="sy" ${W.sync ? 'checked' : ''}> sync</label><span class="sep"></span>
      <button class="btn sm ic" id="rst" title="Reset replay">${icon('reset')}</button><button class="btn sm ic" id="prv" title="Previous candle (←)">${icon('prev')}</button><button class="btn sm pri ic" id="ply" title="Play / Pause (Space)">${icon('play')}</button><button class="btn sm ic" id="nxt" title="Next candle (→)">${icon('next')}</button>
      <select class="in" id="skp" style="width:74px;min-height:30px;padding:2px 6px" title="Skip ahead"><option value="">Skip</option><option value="3600">+1 hour</option><option value="14400">+4 hours</option><option value="86400">+1 day</option><option value="604800">+1 week</option></select><select class="in" id="spd" style="width:68px;min-height:30px;padding:2px 6px" title="Replay speed">${SPEEDS.map((x) => `<option value="${x}" ${W.speed === x ? 'selected' : ''}>${x}x</option>`).join('')}</select>
      <input type="date" class="in" id="jd" style="width:132px;min-height:30px;padding:2px 6px" title="Jump to date" min="${F.fmtDate(s.start_t)}" max="${F.fmtDate(s.end_t)}"><button class="btn sm" id="jg">Go</button>
      <div style="min-width:90px;flex:1;max-width:200px"><div class="prog"><i id="pg" style="width:0"></i></div></div><span class="mut" id="pgl" style="font-size:11.5px"></span>
      <span style="margin-left:auto"></span><span class="mut" id="svs" style="font-size:11.5px"></span><button class="btn sm" id="sv">${icon('check')} Save</button><button class="btn sm ic" id="lyb" title="Chart layouts">${icon('layout')}</button><select class="in sm" id="cst" title="Chart style" style="width:auto;padding:4px 6px"><option value="candle">Candles</option><option value="hollow">Hollow</option><option value="ha">Heikin-Ashi</option><option value="bars">OHLC bars</option><option value="line">Line</option><option value="area">Area</option></select><button class="btn sm ic" id="zi" title="Zoom in">${icon('zoomin')}</button><button class="btn sm ic" id="zo" title="Zoom out">${icon('zoomout')}</button><button class="btn sm ic" id="shot" title="Download screenshot">${icon('cam')}</button><button class="btn sm ic" id="fs" title="Fullscreen">${icon('layers')}</button><button class="btn sm ic sheetbtn" id="rpt" title="Trade panel">${icon('panel')}</button>`;
      $$('#tfb button', el).forEach((b) => (b.onclick = () => setTf(W.active, b.dataset.k)));
      $$('#lay button', el).forEach((b) => (b.onclick = () => setLayout(+b.dataset.n)));
      q('#sy').onchange = (e) => { W.sync = e.target.checked; markUi(); };
      q('#rst').onclick = resetReplay; q('#prv').onclick = () => back(1); q('#nxt').onclick = () => { pause(); step(1); }; q('#ply').onclick = () => (W.playing ? pause() : play());
      q('#skp').onchange = (e) => { const secs = +e.target.value; e.target.value = ''; if (!secs) return; pause(); const j = Math.min(W.endIdx, lowerBound(cs[W.idx].t + secs)), n = j - W.idx; if (n > 0) step(n); else U.toast('No more data ahead', 'warn'); };
      q('#spd').onchange = (e) => { W.speed = +e.target.value; s.speed = W.speed; if (W.playing) { clearTimeout(W.timer); loop(); } markUi(); };
      q('#jg').onclick = jump; q('#sv').onclick = () => persist(true); q('#lyb').onclick = layoutsModal;
      try { const sv = localStorage.getItem('fxw_cstyle'); if (sv) { q('#cst').value = sv; W.cstyle = sv; } } catch (e) {}
      q('#eng_tv').onclick = () => F.App.tvModal(); q('#eng_n').onclick = () => U.toast('FXW Pro chart is active', 'ok');
      q('#cst').onchange = () => { W.cstyle = q('#cst').value; try { localStorage.setItem('fxw_cstyle', W.cstyle); } catch (e) {} W.panels.forEach((p) => p.chart.setOptions({ style: W.cstyle })); };
      q('#zi').onclick = () => W.panels[W.active] && W.panels[W.active].chart.zoom(1.25); q('#zo').onclick = () => W.panels[W.active] && W.panels[W.active].chart.zoom(0.8);
      q('#shot').onclick = () => { const a = document.createElement('a'); a.href = W.panels[W.active].chart.snapshot(); a.download = `${s.symbol}-${F.fmtDT(cs[W.idx].t).replace(/[: ]/g, '-')}.jpg`; a.click(); };
      q('#fs').onclick = toggleMax;
      q('#rpt').onclick = () => { W.rpOpen = !W.rpOpen; q('#wm').classList.toggle('noside', !W.rpOpen); };
      updatePlayBtn(); updateBar();
    }
    function updatePlayBtn() { const b = q('#ply'); if (b) b.innerHTML = icon(W.playing ? 'pause' : 'play'); }
    function updateBar() {
      const c = cs[W.idx]; if (!q('#px')) return; q('#px').textContent = F.fmtP(c.c, W.digits); q('#px').className = 'px mono ' + (c.c >= c.o ? 'up' : 'dn'); q('#spx').textContent = s.spread ? 'spr ' + F.fmtP(s.spread, W.digits) : '';
      const p = (W.idx - W.startIdx) / Math.max(1, W.endIdx - W.startIdx); q('#pg').style.width = Math.round(p * 100) + '%'; q('#pgl').textContent = `${Math.round(p * 100)}% · ${W.idx - W.startIdx}/${W.endIdx - W.startIdx}`;
      q('#svs').textContent = W.saveState === 'saved' ? 'Saved ✓' : W.saveState === 'saving' ? 'Saving…' : W.saveState === 'error' ? '⚠ Save failed' : 'Unsaved'; q('#svs').style.color = W.saveState === 'error' ? 'var(--red)' : '';
      q('#sb').innerHTML = `<span>${F.fmtDT(c.t)} UTC</span><span>Session: ${F.sessionOf(c.t)}</span><span>Candle ${W.idx + 1}/${cs.length} (replay ${W.idx - W.startIdx}/${W.endIdx - W.startIdx})</span><span>Base ${esc(ds.tf)} · ${W.layout.n} chart(s)</span><span id="cross"></span><span style="margin-left:auto">Equity ${F.fmtMoney(W.sim.equity(c))} · Balance ${F.fmtMoney(W.sim.balance)}</span>`;
    }

    /* ---------- drawing toolbar ---------- */
    q('#dt').innerHTML = '<button id="dtg" data-tip="Hide tools" aria-label="Hide tools">☰</button><hr>' + TOOLS.map((t) => (t ? `<button data-t="${t[0]}" data-tip="${esc(t[2])}" class="${t[0] === 'cursor' ? 'on' : ''}" aria-label="${esc(t[2])}">${icon(t[1])}</button>` : '<hr>')).join('') + `<hr><button id="mg" data-tip="Magnet (snap to OHLC)">${icon('magnet')}</button><button id="dlt" data-tip="Delete selected (Del)">${icon('trash')}</button><button id="clr" data-tip="Remove all drawings">${icon('x')}</button>`;
    function setTool(t) { W.tool = t === 'cursor' ? null : t; $$('#dt [data-t]', el).forEach((b) => b.classList.toggle('on', b.dataset.t === (t || 'cursor'))); W.panels.forEach((p) => p.chart.setTool(W.tool)); }
    $$('#dt [data-t]', el).forEach((b) => (b.onclick = () => setTool(b.dataset.t)));
    q('#mg').onclick = () => { W.magnet = !W.magnet; q('#mg').classList.toggle('on', W.magnet); W.panels.forEach((p) => p.chart.setOptions({ magnet: W.magnet })); };
    q('#dlt').onclick = () => { const p = W.panels.find((x) => x.chart.sel) || W.panels[W.active]; if (!p || !p.chart.deleteSelected()) U.toast('Select a drawing first', 'warn'); };
    q('#clr').onclick = async () => { if (!W.drawings.length) return; if (await U.confirm('Delete all drawings in this session?', 'Delete all', true)) { W.drawings = []; setDrawings(); W.drDirty = true; schedule(); } };

    /* ---------- panels ---------- */
    W.digits = F.digitsFor(cs[W.idx].c);
    const getSrc = async (id) => { if (W.srcs.has(id)) return W.srcs.get(id); const d = dsAll.find((x) => x.id === id), c2 = await DB.loadCandles(id); const sr = { main: false, cs: c2, base: d.tfSec, arrs: new Map(), meta: d }; W.srcs.set(id, sr); return sr; };
    const getArr = (sr, sec) => { if (!sr.arrs.has(sec)) sr.arrs.set(sec, F.buildTF(sr.cs, sec)); return sr.arrs.get(sec); };
    function feedPanel(p) {
      const sr = W.srcs.get(p.srcId); if (!sr) return; let j;
      if (sr.main) j = W.idx; else { const lim = cs[W.idx].t + s.base_sec; let lo = 0, hi = sr.cs.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sr.cs[m].t + sr.base <= lim) lo = m + 1; else hi = m; } j = lo - 1; } // only candles fully CLOSED by the current replay time
      if (j < 0) { p.chart.setData({ arr: [], n: 0, last: null }, p.sec); return; }
      if (p.sec === sr.base) { p.chart.setData({ arr: sr.cs, n: j + 1, last: sr.cs[j] }, p.sec); return; }
      const arr = getArr(sr, p.sec); let lo = 0, hi = arr.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (arr[m].i0 <= j) lo = m; else hi = m - 1; }
      const b = arr[lo]; let pc = p.pc;
      if (pc && pc.lo === lo && pc.src === sr && j >= pc.j) { for (let i = pc.j + 1; i <= j; i++) { const c = sr.cs[i]; if (c.h > pc.h) pc.h = c.h; if (c.l < pc.l) pc.l = c.l; pc.v += c.v || 0; } pc.c = sr.cs[j].c; pc.j = j; }
      else { pc = p.pc = { lo, j, src: sr, o: sr.cs[b.i0].o, h: -Infinity, l: Infinity, c: sr.cs[j].c, v: 0 }; for (let i = b.i0; i <= j; i++) { const c = sr.cs[i]; if (c.h > pc.h) pc.h = c.h; if (c.l < pc.l) pc.l = c.l; pc.v += c.v || 0; } }
      p.chart.setData({ arr, n: lo + 1, last: { t: b.t, o: pc.o, h: pc.h, l: pc.l, c: pc.c, v: pc.v } }, p.sec);
    }
    function setGrid(n) { const cg = q('#cg'), mobile = window.innerWidth <= 860; cg.classList.toggle('mp', mobile && n > 1); cg.style.setProperty('--n', n); const L = { 1: ['1fr', '1fr'], 2: ['1fr 1fr', '1fr'], 3: ['1.4fr 1fr', '1fr 1fr'], 4: ['1fr 1fr', '1fr 1fr'], 6: ['1fr 1fr 1fr', '1fr 1fr'] }[n]; cg.style.gridTemplateColumns = L[0]; cg.style.gridTemplateRows = L[1]; }
    async function buildPanels() {
      W.panels.forEach((p) => p.chart.destroy()); const cg = q('#cg'); cg.innerHTML = ''; W.panels = []; const n = W.layout.n; setGrid(n);
      const mainOpts = optsFor(s.dataset_id); const ladder = mainOpts;
      for (let k = 0; k < n; k++) {
        const srcId = W.layout.srcs[k] || s.dataset_id; await getSrc(srcId); const sr = W.srcs.get(srcId), op = A.tfOptions(sr.base); let tf = W.layout.tfs[k]; if (!tf || !op.includes(tf)) { const i0 = Math.max(0, ladder.indexOf(s.tf)); tf = op[Math.min(op.length - 1, k === 0 ? i0 : i0 + k * 2)] || op[0]; }
        const div = document.createElement('div'); div.className = 'cpanel'; if (n === 3 && k === 0) div.style.gridRow = '1 / span 2'; cg.appendChild(div);
        const cv = document.createElement('div'); cv.style.cssText = 'position:absolute;inset:0'; div.appendChild(cv);
        const others = dsAll.filter((d) => d.id !== s.dataset_id);
        const ctl = document.createElement('div'); ctl.className = 'ctl'; ctl.innerHTML = `<select class="tfsel" aria-label="Timeframe">${op.map((x) => `<option ${x === tf ? 'selected' : ''}>${x}</option>`).join('')}</select>${others.length ? `<select class="srcsel" aria-label="Instrument"><option value="${s.dataset_id}">${esc(s.symbol)}</option>${others.map((d) => `<option value="${d.id}" ${d.id === srcId ? 'selected' : ''}>${esc(d.symbol)} ${esc(d.tf)}</option>`).join('')}</select>` : ''}`; div.appendChild(ctl);
        const main = srcId === s.dataset_id, p = { k, div, srcId, tf, sec: F.TF[tf], chart: null };
        p.chart = new F.Chart(cv, { digits: main ? W.digits : F.digitsFor(sr.cs[sr.cs.length - 1].c), up: colors.up, down: colors.down, bg: colors.bg, grid: S.chart.grid, volume: S.chart.volume, magnet: W.magnet, tfSec: p.sec, style: W.cstyle || 'candle', symbol: main ? s.symbol : '', spec: main ? spec : null });
        const ch = p.chart; ch.onContext = (info) => ctxMenu(info); ch.onFocus = () => { if (W.active !== k) { W.active = k; $$('.cpanel', el).forEach((d, i) => d.classList.toggle('act', i === k && W.panels.length > 1)); renderTfb(); } };
        ch.onDrawings = (list, dw, created, deleted) => { W.drawings = list; setDrawings(ch); W.drDirty = true; schedule(); if (W.tab === 'draw') renderTab(); };
        ch.onSelect = () => { if (W.tab === 'draw') renderTab(); }; ch.onEdit = (dw) => editDrawing(dw); ch.onToolDone = () => setTool('cursor');
        ch.onTradeLine = (t, key, price) => { if (!main) return; try { const c = cs[W.idx]; W.sim.modify(t, { [key]: price }, c); W.log.push({ t: c.t, a: 'modify', id: t.id, sl: t.sl, tp: t.tp }); touch(); refresh(); } catch (e) { U.toast(e.message, 'err'); refresh(); } };
        ch.onCross = (t) => { const e = $('#cross', el); if (e) e.textContent = t ? 'Cursor: ' + F.fmtDT(t) : ''; };
        ch.onView = (c) => { if (!W.sync) return; W.panels.forEach((o) => { if (o.chart !== c) { if (c.follow) o.chart.scrollToEnd(); else o.chart.setRightTime(c.getRightTime()); } }); };
        ch.setIndicators(W.indicators); ch.setDrawings(main ? W.drawings : []); ch.setTool(W.tool); ch.setEvents(main ? visibleEvents() : []);
        ctl.querySelector('.tfsel').onchange = (e) => setTf(k, e.target.value); const ss = ctl.querySelector('.srcsel'); if (ss) ss.onchange = async (e) => { W.layout.srcs[k] = e.target.value; W.layout.tfs[k] = null; markUi(); await buildPanels(); refresh(); };
        W.panels.push(p);
      }
      W.layout.tfs = W.panels.map((p) => p.tf); W.layout.srcs = W.panels.map((p) => p.srcId); W.active = Math.min(W.active, W.panels.length - 1); $$('.cpanel', el).forEach((d, i) => d.classList.toggle('act', i === W.active && W.panels.length > 1)); renderBar(); refresh();
    }
    function setDrawings(except) { W.panels.forEach((p) => { if (p.srcId === s.dataset_id) { if (p.chart !== except) p.chart.drawings = W.drawings; p.chart.drawings = W.drawings; p.chart.draw(); } }); }
    function renderTfb() { const ap = W.panels[W.active]; if (!ap) return; $$('#tfb button', el).forEach((b) => b.classList.toggle('on', b.dataset.k === ap.tf)); }
    function setTf(k, tf) { const p = W.panels[k]; if (!p) return; p.tf = tf; p.sec = F.TF[tf]; p.pc = null; p.chart.o.tfSec = p.sec; p.chart.follow = true; const sel = $('.tfsel', p.div); if (sel) sel.value = tf; W.layout.tfs[k] = tf; if (k === 0) s.tf = tf; feedPanel(p); p.chart.scrollToEnd(); renderTfb(); markUi(); }
    async function setLayout(n) { W.layout.n = n; W.layout.tfs = W.layout.tfs.slice(0, n); W.layout.srcs = W.layout.srcs.slice(0, n); await buildPanels(); markUi(); }
    function visibleEvents() { const lim = cs[W.idx].t + s.base_sec; let hi = 0; while (hi < W.events.length && W.events[hi].t <= lim) hi++; return W.events.slice(Math.max(0, hi - 400), hi); } // future events are never passed to the chart

    /* ---------- refresh ---------- */
    let smcPending = false;
    function refresh() {
      const c = cs[W.idx];
      for (const t of W.sim.trades) if (t.status === 'open') t._float = W.sim.pnl(t.side, t.entry_price, t.side === 'buy' ? c.c : c.c + s.spread, t.size); else t._float = null;
      W.panels.forEach((p) => { feedPanel(p); const main = p.srcId === s.dataset_id; if (main) { p.chart.setTrades(W.sim.trades); p.chart.setEvents(visibleEvents()); } if (W.smc.on) p.chart.setAuto(smcFor(p)); else if (p.chart.auto) p.chart.setAuto(null); });
      updateBar(); updateDock(); renderBottom(); updateAccount(); if (W.tab === 'stats') renderStatsLive(); calcTicket();
    }
    function smcFor(p) { const n = p.chart.n; if (n < 20) return null; const off = Math.max(0, n - 1500), a = []; for (let i = off; i < n; i++) a.push(p.chart.bar(i)); const r = F.detectSMC(a, { n: W.smc.n, minGapAtr: W.smc.gap, eqTol: W.smc.eq }), sh = W.smc.show; return { fvg: sh.fvg ? r.fvg : null, ob: sh.ob ? r.ob : null, bos: sh.bos ? r.bos : null, choch: sh.choch ? r.choch : null, eq: sh.eq ? r.eq : null, pd: sh.pd ? r.pd : null, swings: r.swings, showSwings: sh.swings, raw: r }; }

    /* ---------- replay control ---------- */
    function onChanged(changed, c) {
      for (const t of changed) {
        if (t.status === 'closed' && !W.closedSeen.has(t.id)) { W.closedSeen.add(t.id); onClosed(t, c); }
        else if (t.status === 'open' && t.entry_time === c.t && t.order_type !== 'market' && S.notify.toast !== false) U.toast(`${t.order_type.toUpperCase()} ${t.side} filled @ ${F.fmtP(t.entry_price, W.digits)}`, 'ok');
      }
    }
    function onClosed(t, c) {
      const why = { sl: 'Stop-loss hit', tp: 'Take-profit hit', manual: 'Closed', partial: 'Partial close', end: 'Closed', signal: 'Signal exit' }[t.exit_reason] || 'Closed';
      if (S.notify.toast !== false) U.toast(`${why}: ${t.symbol} ${t.side} ${F.fmtMoney(t.pnl)}`, t.pnl >= 0 ? 'ok' : 'warn'); if (S.notify.sound) beep();
      if (W.playing && W.pauseOnClose && t.exit_reason !== 'partial') pause(); W.shotQueue = (W.shotQueue || []).concat([t.id]);
    }
    function beep() { try { const a = new (g.AudioContext || g.webkitAudioContext)(), o = a.createOscillator(), gn = a.createGain(); o.connect(gn); gn.connect(a.destination); o.frequency.value = 660; gn.gain.value = 0.05; o.start(); o.stop(a.currentTime + 0.12); } catch (e) {} }
    function step(n) {
      let moved = 0;
      for (let k = 0; k < n; k++) {
        if (W.idx >= W.endIdx) { pause(); reachedEnd(); break; }
        W.idx++; const c = cs[W.idx], ch = W.sim.onCandle(c); moved++; onChanged(ch, c); if (!W.playing && n === 1) break;
        if (W.idx >= W.endIdx) { pause(); reachedEnd(); break; } if (!W.playing && k + 1 < n && W.stopBatch) break;
      }
      if (W.stopBatch) W.stopBatch = false; if (moved) { touch(); refresh(); captureShots(); }
    }
    function captureShots() { if (!W.shotQueue || !W.shotQueue.length || !W.autoShot) { W.shotQueue = []; return; } const ids = W.shotQueue; W.shotQueue = []; setTimeout(async () => { try { const ch = W.panels[0].chart, c = document.createElement('canvas'), src = ch.cv, k = Math.min(1, 900 / src.width); c.width = src.width * k; c.height = src.height * k; c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); const url = c.toDataURL('image/jpeg', 0.7); for (const id of ids) await DB.put('screenshots', { id, session_id: sid, auto: url }); } catch (e) { console.warn('screenshot failed', e); } }, 80); }
    function play() { if (W.playing) return; if (W.idx >= W.endIdx) return U.toast('Replay is at the end. Reset it or change the date.', 'warn'); W.playing = true; updatePlayBtn(); loop(); }
    function loop() { const per = W.speed >= 10 ? W.speed / 10 : 1, ms = W.speed >= 10 ? 100 : 1000 / W.speed; W.timer = setTimeout(() => { if (!W.playing) return; step(per); if (W.playing) loop(); }, ms); }
    function pause() { if (!W.playing) return; W.playing = false; clearTimeout(W.timer); updatePlayBtn(); persist(); }
    let endShown = false;
    function reachedEnd() { if (endShown) return; endShown = true; s.status = 'completed'; persist(); U.modal({ title: 'Replay complete 🎯', html: `<p style="margin:0">The end of the selected date range has been reached. Session saved.</p>`, buttons: [{ label: 'Stay here', value: 1, cls: 'ghost' }, { label: 'View analytics', value: 'a', cls: 'pri' }] }).then((v) => { if (v === 'a') A.go('#/bt/analytics'); }); }
    async function back(n) {
      pause(); const target = Math.max(W.startIdx, W.idx - n); if (target === W.idx) return U.toast('Replay is at the start', 'warn'); const lost = W.log.filter((a) => a.t > cs[target].t).length;
      if (lost && n > 1 && !(await U.confirm(`Going back will undo ${lost} action(s) (trade/order/modify) made after that point. Continue?`, 'Go back', true))) return;
      W.log = W.log.filter((a) => a.t <= cs[target].t); W.idx = target; rebuild(target); endShown = false; if (s.status === 'completed') s.status = 'active'; touch(); refresh(); if (lost) U.toast(`${lost} action(s) undone (made after that candle)`, 'warn');
    }
    async function jump() {
      const v = q('#jd').value; if (!v) return U.toast('Select a date', 'warn'); const t = Date.parse(v + 'T00:00:00Z') / 1000; let target = lowerBound(t); if (target > W.endIdx) target = W.endIdx; if (target < W.startIdx) target = W.startIdx; if (target === W.idx) return;
      pause(); if (target < W.idx) { await back(W.idx - target); return; }
      const before = W.sim.trades.filter((x) => x.status === 'closed').length; while (W.idx < target) { W.idx++; const ch = W.sim.onCandle(cs[W.idx]); for (const t2 of ch) if (t2.status === 'closed' && !W.closedSeen.has(t2.id)) W.closedSeen.add(t2.id); } const nc = W.sim.trades.filter((x) => x.status === 'closed').length - before; if (nc) U.toast(`${nc} trade(s) closed by SL/TP during the jump`, 'warn'); touch(); refresh(); W.panels.forEach((p) => p.chart.scrollToEnd());
    }
    async function resetReplay() { if (!(await U.confirm('Replay will return to the start and all trades, orders and journal entries in this session will be deleted. Drawings will be kept.', 'Reset', true))) return; pause(); W.log = []; W.idx = W.startIdx; rebuild(W.idx); for (const t of ['trades', 'journal', 'screenshots']) await DB.delBySession(t, sid); W.savedHash = {}; W.journalIds = new Set(); s.status = 'active'; endShown = false; touch(); refresh(); persist(true); U.toast('Replay reset'); }

    /* ---------- persistence ---------- */
    let st = null; const strip = (t) => JSON.stringify(t, (k, v) => (k === '_float' ? undefined : v));
    function touch() { W.dirty = true; W.saveState = 'dirty'; schedule(W.playing ? 3000 : 700); }
    function markUi() { W.dirty = true; W.saveState = 'dirty'; schedule(); }
    function schedule(ms) { clearTimeout(st); st = setTimeout(() => persist(), ms || 700); }
    async function persist(manual) {
      clearTimeout(st); if (W.saving) { W.again = true; return; } W.saving = true; W.saveState = 'saving'; updateBar();
      try {
        const c = cs[W.idx], sim = W.sim, closed = sim.trades.filter((t) => t.status === 'closed'); s.idx = W.idx; s.cur_t = c.t; s.balance = sim.balance; s.equity = F.round(sim.equity(c), 2); s.net = F.round(closed.reduce((a, t) => a + t.pnl, 0), 2); s.trade_count = closed.length; s.progress = (W.idx - W.startIdx) / Math.max(1, W.endIdx - W.startIdx); s.log = W.log; s.speed = W.speed;
        s.ui = { indicators: W.indicators, smc: W.smc, layout: W.layout, sync: W.sync }; await DB.put('sessions', s);
        const put = [], jr = [], present = new Set();
        for (const t of sim.trades) { present.add(t.id); const h = strip(t); if (W.savedHash[t.id] !== h) { put.push(JSON.parse(h)); W.savedHash[t.id] = h; } if (t.status === 'closed' && !W.journalIds.has(t.id)) { jr.push({ id: t.id, session_id: sid, trade_id: t.id, setup: '', mistakes: [], emotions: [], rating: 0, tags: t.tags || [], notes: t.notes || '' }); W.journalIds.add(t.id); } }
        if (put.length) await DB.putMany('trades', put); if (jr.length) await DB.putMany('journal', jr);
        for (const id of Object.keys(W.savedHash)) if (!present.has(id)) { delete W.savedHash[id]; W.journalIds.delete(id); await DB.del('trades', id); await DB.del('journal', id); await DB.del('screenshots', id); }
        if (W.drDirty) { await DB.put('drawings', { id: 'dr:' + sid, session_id: sid, list: W.drawings }); W.drDirty = false; }
        W.saveState = 'saved'; W.dirty = false; if (manual === true) U.toast('Session saved');
      } catch (e) { console.error(e); W.saveState = 'error'; W.saveErr = e; U.toast('Save fail: ' + e.message, 'err'); }
      finally { W.saving = false; updateBar(); if (W.again) { W.again = false; schedule(); } }
    }
    tradesDB.forEach((t) => (W.savedHash[t.id] = strip(t)));
    W.persist = persist;

    /* ---------- orders ---------- */
    const notional = (size, px) => (spec.base === 'USD' && spec.quote !== 'USD' ? size * spec.contract : size * spec.contract * px);
    const openCount = () => W.sim.trades.filter((t) => t.status === 'open' || t.status === 'pending').length;
    const usedMargin = () => W.sim.trades.filter((t) => t.status === 'open').reduce((a, t) => a + notional(t.size, t.entry_price) / s.leverage, 0);
    function readTicket() { const g2 = (id) => { const e = $(id, q('#rp')); return e ? e.value : ''; }, num = (v) => (v === '' || v == null || !isFinite(parseFloat(v)) ? null : parseFloat(v)); return { side: W.side, type: g2('#tk_type') || 'market', price: num(g2('#tk_price')), mode: g2('#tk_mode') || s.sizing, risk: num(g2('#tk_risk')), fixed: num(g2('#tk_size')), sl: num(g2('#tk_sl')), tp: num(g2('#tk_tp')), slp: num(g2('#tk_slp')), tpr: num(g2('#tk_tpr')), notes: g2('#tk_notes') }; }
    function refPrice(T) { const c = cs[W.idx]; return T.type !== 'market' && T.price != null ? T.price : T.side === 'buy' ? c.c + s.spread + s.slippage : c.c - s.slippage; }
    function sizeFor(T) { const ref = refPrice(T); if (T.mode === 'fixed') return T.fixed; if (T.sl == null) return null; return W.sim.sizeFromRisk(W.sim.balance * ((T.risk || 0) / 100), ref, T.sl); }
    function calcTicket() {
      const o = $('#tk_out', el); if (!o) return; const T = readTicket(), ref = refPrice(T), size = sizeFor(T), sim = W.sim; let h = '', warn = [];
      if (T.mode === 'risk' && T.sl == null) warn.push('Enter a Stop-loss for risk-based sizing.');
      if (T.sl != null && (T.side === 'buy' ? T.sl >= ref : T.sl <= ref)) warn.push('SL is on the wrong side of entry.'); if (T.tp != null && (T.side === 'buy' ? T.tp <= ref : T.tp >= ref)) warn.push('TP is on the wrong side of entry.');
      if (size != null && size > 0) { const risk = T.sl != null ? sim.riskAmt(ref, T.sl, size) : null, rew = T.tp != null ? Math.abs(T.tp - ref) * size * spec.contract * sim.conv(T.tp) : null; h = `<div class="grid g2 k2" style="font-size:12px;gap:6px"><div><span class="mut">Size</span><br><b class="mono">${size} ${spec.unit}</b></div><div><span class="mut">Entry ~</span><br><b class="mono">${F.fmtP(ref, W.digits)}</b></div><div><span class="mut">Risk</span><br><b class="mono dn">${risk != null ? F.fmtMoney(risk) + ' (' + F.round((risk / sim.balance) * 100, 2) + '%)' : '–'}</b></div><div><span class="mut">Reward</span><br><b class="mono up">${rew != null ? F.fmtMoney(rew) : '–'}</b></div><div><span class="mut">R:R</span><br><b class="mono">${risk && rew ? '1 : ' + F.round(rew / risk, 2) : '–'}</b></div><div><span class="mut">Margin</span><br><b class="mono">${F.fmtMoney(notional(size, ref) / s.leverage)}</b></div></div>`; }
      o.innerHTML = warn.map((w) => `<div class="err">${esc(w)}</div>`).join('') + h; const b = $('#tk_go', el); if (b) { b.disabled = false; }
    }
    function placeOrder(Tov) {
      try {
        const T = Tov && Tov.side ? Tov : readTicket(), c = cs[W.idx]; if (T.type !== 'market' && T.price == null) throw new Error('Enter a price for the pending order.'); if (T.mode === 'risk' && T.sl == null) throw new Error('A Stop-loss is required for risk-based sizing.');
        const size = sizeFor(T); if (!(size > 0)) throw new Error(T.mode === 'fixed' ? 'Enter a size.' : 'Could not calculate size from Risk %, SL and entry.'); if (size < spec.min) throw new Error(`Risk-based size ${size} is below the minimum ${spec.min} ${spec.unit}. Tighten the SL or increase Risk %.`);
        if (openCount() >= s.maxOpen) throw new Error(`Maximum open positions (${s.maxOpen}) reached.`); const ref = refPrice(T), need = notional(size, ref) / s.leverage, free = W.sim.equity(c) - usedMargin(); if (need > free) throw new Error(`Insufficient margin: ${F.fmtMoney(need)} required, ${F.fmtMoney(free)} free (leverage 1:${s.leverage}).`);
        const id = F.uid(), o = { id, side: T.side, type: T.type, price: T.type === 'market' ? undefined : T.price, size, sl: T.sl, tp: T.tp, notes: T.notes }, t = W.sim.place(Object.assign({}, o), c); decorate(t, W.panels[0].tf); W.log.push({ t: c.t, a: 'place', o, tf: W.panels[0].tf }); touch(); refresh();
        U.toast(`${T.type === 'market' ? '' : T.type.toUpperCase() + ' '}${T.side.toUpperCase()} ${size} @ ${F.fmtP(t.entry_price, W.digits)}`, 'ok'); persist();
      } catch (e) { U.toast(e.message, 'err'); }
    }
    function act(kind, id, extra) {
      const c = cs[W.idx], t = byId(id); if (!t) return;
      try {
        if (kind === 'close') { W.sim.closeTrade(t, c, 'manual'); W.log.push({ t: c.t, a: 'close', id }); W.closedSeen.add(id); onClosed(t, c); }
        else if (kind === 'cancel') { W.sim.cancel(t); W.log.push({ t: c.t, a: 'cancel', id }); }
        else if (kind === 'be') { W.sim.breakeven(t, c); W.log.push({ t: c.t, a: 'be', id }); U.toast('SL moved to breakeven', 'ok'); }
        else if (kind === 'half') { const child = W.sim.partialClose(t, t.size / 2, c, F.uid()); decorate(child, t.tf); W.log.push({ t: c.t, a: 'partial', id, size: child.size, child: child.id }); W.closedSeen.add(child.id); onClosed(child, c); }
        touch(); refresh(); persist(); captureShots();
      } catch (e) { U.toast(e.message, 'err'); }
    }
    async function modifyModal(id) {
      const t = byId(id); if (!t) return; const r = await U.modal({ title: `Modify ${t.side.toUpperCase()} ${t.size} ${t.symbol}`, html: `<div class="frm c2"><div><label class="f">Stop-loss</label><input class="in" id="m_sl" type="number" step="any" value="${t.sl != null ? t.sl : ''}"></div><div><label class="f">Take-profit</label><input class="in" id="m_tp" type="number" step="any" value="${t.tp != null ? t.tp : ''}"></div>${t.status === 'open' ? `<div class="full"><label class="f">Trailing stop distance (price units, 0/blank = off)</label><input class="in" id="m_tr" type="number" step="any" value="${t.trail || ''}"><div class="hint">After each candle close, moves the SL to this distance from price (in your favour only).</div></div>` : ''}</div>`, buttons: [{ label: 'Cancel', value: null, cls: 'ghost' }, { label: 'Apply', cls: 'pri', validate: (b) => { const v = (i) => { const x = $(i, b); return !x || x.value === '' ? null : parseFloat(x.value); }; return { sl: v('#m_sl'), tp: v('#m_tp'), tr: v('#m_tr') }; } }] }); if (!r) return;
      try { const c = cs[W.idx]; W.sim.modify(t, { sl: r.sl, tp: r.tp }, c); W.log.push({ t: c.t, a: 'modify', id, sl: t.sl, tp: t.tp }); if (t.status === 'open') { W.sim.setTrail(t, r.tr); W.log.push({ t: c.t, a: 'trail', id, dist: t.trail || null }); } touch(); refresh(); persist(); } catch (e) { U.toast(e.message, 'err'); }
    }

    /* ---------- right panel ---------- */
    const TABS = [['trade', 'Trade'], ['ind', 'Indic.'], ['smc', 'SMC'], ['draw', 'Draw'], ['stats', 'Info']];
    function renderRp() { q('#rp').innerHTML = `<div class="tabs" id="rtabs">${TABS.map((t) => `<button data-t="${t[0]}" class="${W.tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div><div class="rpb" id="rpb"></div>`; $$('#rtabs button', el).forEach((b) => (b.onclick = () => { W.tab = b.dataset.t; renderRp(); })); renderTab(); }
    function renderTab() { const b = q('#rpb'); if (!b) return; ({ trade: tabTrade, ind: tabInd, smc: tabSmc, draw: tabDraw, stats: tabStats })[W.tab](b); }
    function updateAccount() { const e = $('#acct', el); if (!e) return; const c = cs[W.idx], sim = W.sim, fl = sim.floating(c), um = usedMargin(); e.innerHTML = `<div><small>Balance</small><b>${F.fmtMoney(sim.balance)}</b></div><div><small>Equity</small><b>${F.fmtMoney(sim.balance + fl)}</b></div><div><small>Floating</small><b class="${fl >= 0 ? 'up' : 'dn'}">${F.fmtMoney(fl)}</b></div><div><small>Free margin</small><b>${F.fmtMoney(sim.balance + fl - um)}</b></div>`; }
    function tabTrade(b) {
      const c = cs[W.idx]; b.innerHTML = `<div class="eqbar" id="acct"></div><div class="seg" style="width:100%;margin-bottom:10px" id="sd"><button data-s="buy" class="${W.side === 'buy' ? 'on' : ''}" style="flex:1;${W.side === 'buy' ? 'background:#15803d' : ''}">BUY <span class="mono" id="ask">${F.fmtP(c.c + s.spread, W.digits)}</span></button><button data-s="sell" class="${W.side === 'sell' ? 'on' : ''}" style="flex:1;${W.side === 'sell' ? 'background:#b91c1c' : ''}">SELL <span class="mono" id="bid">${F.fmtP(c.c, W.digits)}</span></button></div>
      <div class="frm c2"><div><label class="f">Order type</label><select class="in" id="tk_type"><option value="market">Market</option><option value="limit">Limit</option><option value="stop">Stop</option></select></div><div><label class="f">Pending price</label><input class="in" id="tk_price" type="number" step="any" disabled placeholder="market"></div>
      <div><label class="f">Sizing</label><select class="in" id="tk_mode"><option value="risk" ${s.sizing === 'risk' ? 'selected' : ''}>Risk %</option><option value="fixed" ${s.sizing === 'fixed' ? 'selected' : ''}>Fixed size</option></select></div><div><label class="f" id="tk_l">${s.sizing === 'risk' ? 'Risk %' : 'Size (' + spec.unit + ')'}</label><input class="in" id="tk_risk" type="number" step="any" value="${s.riskPct}" ${s.sizing === 'fixed' ? 'class="hide"' : ''}><input class="in hide" id="tk_size" type="number" step="${spec.step}" min="${spec.min}" value="${s.fixedSize}"></div>
      <div><label class="f">Stop-loss price</label><input class="in" id="tk_sl" type="number" step="any"></div><div><label class="f">SL distance (${spec.pip ? 'pips' : 'price'})</label><input class="in" id="tk_slp" type="number" step="any" min="0"></div>
      <div><label class="f">Take-profit price</label><input class="in" id="tk_tp" type="number" step="any"></div><div><label class="f">TP as R multiple</label><input class="in" id="tk_tpr" type="number" step="any" min="0" value=""></div><div class="full"><label class="f">Trade note (optional)</label><input class="in" id="tk_notes" maxlength="200" placeholder="setup / reason"></div></div>
      <div id="tk_out" style="margin:10px 0"></div><button class="btn ${W.side === 'buy' ? 'buy' : 'sell'}" id="tk_go" style="width:100%;min-height:42px;font-size:14px">Place ${W.side.toUpperCase()} order</button>
      <div class="hint" style="margin-top:8px">You can also modify SL/TP by dragging their lines on the chart. Orders fill at candle close; see the "Info" tab for the execution model.</div>`;
      const mode = () => { const f = $('#tk_mode', b).value === 'fixed'; $('#tk_risk', b).classList.toggle('hide', f); $('#tk_size', b).classList.toggle('hide', !f); $('#tk_l', b).textContent = f ? 'Size (' + spec.unit + ')' : 'Risk %'; calcTicket(); };
      const typ = () => { const m = $('#tk_type', b).value === 'market'; $('#tk_price', b).disabled = m; if (m) $('#tk_price', b).value = ''; else if (!$('#tk_price', b).value) $('#tk_price', b).value = F.fmtP(cs[W.idx].c, W.digits); calcTicket(); };
      $$('#sd button', b).forEach((x) => (x.onclick = () => { W.side = x.dataset.s; tabTrade(b); }));
      $('#tk_mode', b).onchange = mode; $('#tk_type', b).onchange = typ; const unit = spec.pip || 1;
      const link = (id, fn) => { $(id, b).oninput = () => { fn(); calcTicket(); }; };
      link('#tk_slp', () => { const T = readTicket(), d = (T.slp || 0) * unit, ref = refPrice(T); if (T.slp > 0) $('#tk_sl', b).value = F.fmtP(T.side === 'buy' ? ref - d : ref + d, W.digits); }); link('#tk_sl', () => { const T = readTicket(), ref = refPrice(T); $('#tk_slp', b).value = T.sl != null ? F.round(Math.abs(ref - T.sl) / unit, 2) : ''; }); link('#tk_tpr', () => { const T = readTicket(), ref = refPrice(T); if (T.sl != null && T.tpr > 0) { const d = Math.abs(ref - T.sl) * T.tpr; $('#tk_tp', b).value = F.fmtP(T.side === 'buy' ? ref + d : ref - d, W.digits); } }); link('#tk_tp', () => { const T = readTicket(), ref = refPrice(T); if (T.sl != null && T.tp != null && ref !== T.sl) $('#tk_tpr', b).value = F.round(Math.abs(T.tp - ref) / Math.abs(ref - T.sl), 2); });
      ['#tk_price', '#tk_risk', '#tk_size'].forEach((i) => ($(i, b).oninput = calcTicket)); $('#tk_go', b).onclick = placeOrder; mode(); updateAccount(); calcTicket();
    }
    function tabInd(b) {
      b.innerHTML = `<div class="chips" style="margin-bottom:10px"><select class="in" id="ia" style="flex:1">${Object.keys(F.INDICATORS).map((k) => `<option value="${k}">${F.INDICATORS[k].name}</option>`).join('')}</select><button class="btn sm pri" id="iad">Add</button></div>
      ${W.indicators.length ? W.indicators.map((ind, i) => `<div class="card" style="padding:10px;margin-bottom:8px" data-i="${i}"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b style="flex:1;font-size:13px">${F.INDICATORS[ind.type].name}</b><input type="color" data-c value="${ind.color || '#7aa7f7'}" style="width:28px;height:24px;border:0;background:none;padding:0"><button class="btn sm ic ${ind.visible === false ? '' : 'on'}" data-v title="Show/hide">${icon('eye')}</button><button class="btn sm ic danger" data-r>${icon('x')}</button></div><div class="chips">${Object.keys(ind.params).map((k) => `<label class="mut" style="font-size:11px">${k}<input class="in" data-p="${k}" type="number" step="any" min="1" value="${ind.params[k]}" style="width:62px;min-height:28px;padding:2px 6px;margin-left:4px"></label>`).join('') || '<span class="mut" style="font-size:12px">No parameters</span>'}</div></div>`).join('') : '<div class="mut" style="margin-bottom:10px">No indicators. Add one above.</div>'}
      <h3 style="margin-top:14px">Templates</h3><div class="chips"><select class="in" id="it" style="flex:1"><option value="">— apply template —</option>${tpls.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><button class="btn sm" id="isv">Save current</button></div><div class="hint">Indicators are calculated only on data up to the current replay candle.</div>`;
      $('#iad', b).onclick = () => { const k = $('#ia', b).value, d = F.INDICATORS[k]; W.indicators.push({ id: F.uid(), type: k, params: Object.assign({}, d.params), color: d.color, visible: true }); applyInds(); renderTab(); };
      $$('[data-i]', b).forEach((row) => { const i = +row.dataset.i, ind = W.indicators[i]; $('[data-c]', row).oninput = (e) => { ind.color = e.target.value; applyInds(); }; $('[data-v]', row).onclick = () => { ind.visible = ind.visible === false; applyInds(); renderTab(); }; $('[data-r]', row).onclick = () => { W.indicators.splice(i, 1); applyInds(); renderTab(); }; $$('[data-p]', row).forEach((p) => (p.onchange = () => { const v = parseFloat(p.value); if (!(v >= 1)) { p.value = ind.params[p.dataset.p]; return U.toast('Parameter must be at least 1', 'err'); } ind.params[p.dataset.p] = v; if (ind.type === 'macd' && ind.params.fast >= ind.params.slow) U.toast('MACD: fast must be less than slow', 'warn'); applyInds(); })); });
      $('#it', b).onchange = (e) => { const t = tpls.find((x) => x.id === e.target.value); if (t) { W.indicators = JSON.parse(JSON.stringify(t.list)); applyInds(); renderTab(); U.toast('Template applied'); } };
      $('#isv', b).onclick = async () => { if (!W.indicators.length) return U.toast('Add an indicator first', 'warn'); const n = await U.prompt('Save indicator template', 'Template name'); if (n) { const rec = await DB.put('indicator_templates', { name: n, list: JSON.parse(JSON.stringify(W.indicators)) }); tpls.push(rec); renderTab(); U.toast('Template saved'); } };
    }
    function applyInds() { W.panels.forEach((p) => p.chart.setIndicators(W.indicators)); markUi(); }
    function tabSmc(b) {
      const m = W.smc, sh = m.show; b.innerHTML = `<label class="chip ${m.on ? 'on' : ''}" style="margin-bottom:10px"><input type="checkbox" id="sm_on" ${m.on ? 'checked' : ''}> Auto-detect overlay (rule-based)</label><div class="chips" style="margin-bottom:10px">${[['fvg', 'FVG'], ['ob', 'Order blocks'], ['bos', 'BOS'], ['choch', 'CHoCH'], ['eq', 'Equal H/L'], ['pd', 'Prem/Disc'], ['swings', 'Swings']].map(([k, l]) => `<label class="chip ${sh[k] ? 'on' : ''}"><input type="checkbox" data-k="${k}" ${sh[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
      <div class="frm c3"><div><label class="f">Swing bars (N)</label><input class="in" id="sm_n" type="number" min="1" max="10" value="${m.n}"></div><div><label class="f">Min FVG (×ATR)</label><input class="in" id="sm_g" type="number" step="0.05" min="0" value="${m.gap}"></div><div><label class="f">EQ tol (×ATR)</label><input class="in" id="sm_e" type="number" step="0.05" min="0" value="${m.eq}"></div></div>
      <button class="btn" id="sm_sv" style="width:100%;margin-top:10px">Save detected zones as editable drawings</button>
      <details class="ds" style="margin-top:12px"><summary>Detection rules</summary><div class="mut" style="font-size:12.5px;margin-top:6px;line-height:1.6"><b>Swing:</b> highest/lowest over N bars on both sides (confirmed after N bars).<br><b>BOS:</b> <i>close</i> above/below the last swing in the direction of structure.<br><b>CHoCH:</b> first swing break against the structure.<br><b>FVG:</b> 3-candle gap (c1 high &lt; c3 low, or the reverse) ≥ min×ATR; mitigated when price returns to it.<br><b>Order block:</b> last opposite-colour candle before the impulse that created the BOS/CHoCH.<br><b>EQH/EQL:</b> two swings within tolerance×ATR.<br><b>Prem/Disc:</b> 50% equilibrium of the last swing range.<br><span class="amb">These are outputs of objective rules, not trade signals. Mark any subjective SMC reading with the manual drawing tools.</span></div></details>`;
      $('#sm_on', b).onchange = (e) => { m.on = e.target.checked; markUi(); refresh(); renderTab(); }; $$('[data-k]', b).forEach((x) => (x.onchange = () => { sh[x.dataset.k] = x.checked; markUi(); refresh(); renderTab(); }));
      const num = (id, k, lo, hi) => ($(id, b).onchange = (e) => { const v = parseFloat(e.target.value); if (v >= lo && v <= hi) { m[k] = v; markUi(); refresh(); } else { e.target.value = m[k]; U.toast('Value out of range', 'err'); } }); num('#sm_n', 'n', 1, 10); num('#sm_g', 'gap', 0, 5); num('#sm_e', 'eq', 0, 5);
      $('#sm_sv', b).onclick = () => { const p = W.panels.find((x) => x.srcId === s.dataset_id); if (!p || !p.chart.auto || !p.chart.auto.raw) return U.toast('Turn on auto-detect first', 'warn'); const r = p.chart.auto.raw, add = [], T = F.DRAW_TYPES; const mk = (type, pts, extra) => add.push(Object.assign({ id: F.uid(), type, points: pts, color: T[type].color, width: 1.5, text: '', visible: true }, extra || {})); const lim = cs[W.idx].t + s.base_sec;
        r.fvg.filter((z) => !z.mitigated).slice(-6).forEach((z) => mk('fvg', [{ t: z.t, p: z.hi }, { t: lim, p: z.lo }], { extend: 1, color: z.dir === 'bull' ? '#22c55e' : '#ef4444' })); r.ob.filter((z) => !z.mitigated).slice(-6).forEach((z) => mk('ob', [{ t: z.t, p: z.hi }, { t: lim, p: z.lo }], { extend: 1, color: z.dir === 'bull' ? '#3b82f6' : '#f97316' })); r.bos.slice(-4).forEach((e) => mk('bos', [{ t: e.fromT, p: e.level }, { t: e.t, p: e.level }])); r.choch.slice(-4).forEach((e) => mk('choch', [{ t: e.fromT, p: e.level }, { t: e.t, p: e.level }])); r.eq.slice(-4).forEach((e) => mk(e.type === 'H' ? 'eqh' : 'eql', [{ t: e.t1, p: e.p }, { t: e.t2, p: e.p }]));
        if (!add.length) return U.toast('No unmitigated zones to save', 'warn'); W.drawings = W.drawings.concat(add); setDrawings(); W.drDirty = true; schedule(); U.toast(add.length + ' zones saved to drawings; you can now edit or delete them'); };
    }
    function tabDraw(b) {
      const sel = W.panels.map((p) => p.chart.sel).find(Boolean); b.innerHTML = W.drawings.length ? `<div class="mut" style="font-size:12px;margin-bottom:8px">${W.drawings.length} drawings · double-click a drawing on the chart to edit · Del to delete</div>` + W.drawings.map((d) => `<div class="card" style="padding:8px 10px;margin-bottom:6px;${d.id === sel ? 'border-color:var(--blue)' : ''}" data-id="${d.id}"><div style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:${d.color || '#3b82f6'}"></span><b style="flex:1;font-size:12.5px">${F.DRAW_TYPES[d.type].name}${d.text ? ' · ' + esc(d.text) : ''}</b><button class="btn sm ic" data-e>${icon('edit')}</button><button class="btn sm ic ${d.visible === false ? '' : 'on'}" data-v>${icon('eye')}</button><button class="btn sm ic ${d.locked ? 'on' : ''}" data-l>${icon('lock')}</button><button class="btn sm ic danger" data-r>${icon('x')}</button></div></div>`).join('') : '<div class="mut">No drawings yet. Use the left toolbar for trendline, fib, zone or SMC tools. Drawings are saved with this session.</div>';
      $$('[data-id]', b).forEach((row) => { const d = W.drawings.find((x) => x.id === row.dataset.id); $('[data-e]', row).onclick = () => editDrawing(d); $('[data-v]', row).onclick = () => { d.visible = d.visible === false; commitDrawings(); }; $('[data-l]', row).onclick = () => { d.locked = !d.locked; commitDrawings(); }; $('[data-r]', row).onclick = () => { W.drawings = W.drawings.filter((x) => x.id !== d.id); W.panels.forEach((p) => { if (p.chart.sel === d.id) p.chart.sel = null; }); commitDrawings(); }; });
    }
    function commitDrawings() { setDrawings(); W.drDirty = true; schedule(); renderTab(); }
    async function editDrawing(d) { const T = F.DRAW_TYPES[d.type]; const r = await U.modal({ title: 'Edit ' + T.name, html: `<div class="frm c2"><div><label class="f">Colour</label><input type="color" class="in" id="e_c" value="${d.color || T.color}" style="padding:2px;height:38px"></div><div><label class="f">Line width</label><input class="in" id="e_w" type="number" min="1" max="6" step="0.5" value="${d.width || 1.5}"></div>${['text', 'hline', 'vline', 'line', 'ray', 'rect'].includes(T.cat) || T.label ? `<div class="full"><label class="f">Label / text</label><input class="in" id="e_t" maxlength="60" value="${esc(d.text || '')}"></div>` : ''}${T.smc && T.cat === 'rect' ? `<div class="full"><label class="chip"><input type="checkbox" id="e_x" ${d.extend ? 'checked' : ''}> Extend zone to the right edge</label></div>` : ''}</div>`, buttons: [{ label: 'Delete', value: 'del', cls: 'danger' }, { label: 'Cancel', value: null, cls: 'ghost' }, { label: 'Apply', cls: 'pri', validate: (b) => ({ c: $('#e_c', b).value, w: parseFloat($('#e_w', b).value) || 1.5, t: $('#e_t', b) ? $('#e_t', b).value : d.text, x: $('#e_x', b) ? $('#e_x', b).checked : d.extend }) }] }); if (!r) return; if (r === 'del') { W.drawings = W.drawings.filter((x) => x.id !== d.id); W.panels.forEach((p) => { if (p.chart.sel === d.id) p.chart.sel = null; }); } else { d.color = r.c; d.width = r.w; d.text = r.t; if (r.x != null) d.extend = r.x; } commitDrawings(); }
    function tabStats(b) {
      b.innerHTML = `<div id="live"></div><h3 style="margin-top:14px">Session notes</h3><textarea class="in" id="sn" rows="3" placeholder="Notes about this session…">${esc(s.notes || '')}</textarea><div class="chips" style="margin-top:10px"><button class="btn sm" id="xr">${icon('dl')} Report</button><button class="btn sm" id="xc">${icon('dl')} Trades CSV</button><button class="btn sm pri" id="fin">Mark session complete</button></div>
      <details class="ds" style="margin-top:12px"><summary>Execution model</summary><div class="mut" style="font-size:12.5px;line-height:1.55;margin-top:6px">${EXEC_DOC}</div></details><details class="ds"><summary>Keyboard shortcuts</summary><div class="mut" style="font-size:12.5px;line-height:1.8;margin-top:6px"><span class="code">B</span> buy · <span class="code">S</span> sell (dock size/SL/TP) · <span class="code">M</span> maximize · Right-click chart = pending order · <span class="code">Space</span> play/pause · <span class="code">→</span> next candle · <span class="code">←</span> previous · <span class="code">Del</span> selected drawing delete · <span class="code">Esc</span> tool cancel · Wheel = zoom · Drag = pan · Price-axis drag = vertical zoom (double-click reset)</div></details>`;
      $('#sn', b).onchange = (e) => { s.notes = e.target.value; markUi(); }; $('#xr', b).onclick = () => { const w = window.open('', '_blank'), h = A.sessionReport(s, W.sim.trades); if (w) { w.document.write(h); w.document.close(); } else U.download('report.html', h, 'text/html'); }; $('#xc', b).onclick = () => U.download(`${s.symbol}-trades.csv`, A.tradesCSV(W.sim.trades.map((t) => JSON.parse(strip(t)))), 'text/csv');
      $('#fin', b).onclick = async () => { s.status = 'completed'; await persist(true); U.toast('Session marked as completed'); }; renderStatsLive();
    }
    function renderStatsLive() {
      const e = $('#live', el); if (!e) return; const c = cs[W.idx], st = F.stats(W.sim.trades, s.initial); let h = `<div class="grid g2 k2" style="font-size:12px;gap:6px">${[['Closed trades', st.n], ['Win rate', st.n ? F.round(st.wr, 1) + '%' : '–'], ['Net P/L', F.fmtMoney(st.net)], ['Profit factor', st.n ? U.pf(st.pf) : '–'], ['Max DD', st.n ? F.round(st.maxDDpct, 2) + '%' : '–'], ['Avg R', st.rs.length ? F.round(st.avgR, 2) : '–']].map((x) => `<div class="card" style="padding:8px"><span class="mut">${x[0]}</span><br><b class="mono">${x[1]}</b></div>`).join('')}</div>`;
      if (prop) { const ev = F.propEvaluate(W.sim.trades, prop, W.sim.equity(c)); h += `<h3 style="margin-top:14px">Prop rules: ${esc(prop.name)}</h3><div class="alert ${ev.status === 'PASSED' ? 'ok' : ev.status === 'FAILED' ? 'err' : 'info'}" style="padding:8px 10px"><b>${ev.status}</b></div><div class="prog"><i style="width:${ev.targetProgress}%"></i></div><div class="mut" style="font-size:12px;margin:4px 0 8px">Target ${F.round(ev.profitPct, 2)}% / ${prop.target}%</div><div class="grid g2 k2" style="font-size:12px;gap:6px"><div class="card" style="padding:8px"><span class="mut">Daily left</span><br><b class="mono">${ev.dailyAllowance == null ? 'off' : F.fmtMoney(ev.dailyAllowance)}</b></div><div class="card" style="padding:8px"><span class="mut">DD left</span><br><b class="mono">${F.fmtMoney(ev.ddAllowance)}</b></div><div class="card" style="padding:8px"><span class="mut">Days</span><br><b class="mono">${ev.tradingDays}/${prop.minDays}</b></div><div class="card" style="padding:8px"><span class="mut">Consistency</span><br><b class="mono">${prop.consistency ? F.round(ev.consistencyPct, 0) + '%' : 'off'}</b></div></div>${ev.violations.map((v) => `<div class="err">${esc(v.text)}</div>`).join('')}`; }
      e.innerHTML = h;
    }

    /* ---------- bottom panel ---------- */

    /* ---------- range bar, quick-trade dock, maximize, rail toggle ---------- */
    const RANGES = [['1D', 86400], ['5D', 432000], ['1M', 2592000], ['3M', 7776000], ['6M', 15552000], ['YTD', 'ytd'], ['1Y', 31536000], ['All', 'all']];
    W.lot = Math.max(spec.min, Math.round(spec.step * 10 / spec.step) * spec.step); if (spec.kind === 'forex' || spec.kind === 'metal') W.lot = 0.1; const lotDp = (spec.step < 0.01 ? 3 : spec.step < 1 ? 2 : 0);
    function setRange(k) { const p = W.panels[W.active]; if (!p) return; const r = RANGES.find((x) => x[0] === k)[1], now = cs[W.idx].t; let secs = r === 'all' ? null : r === 'ytd' ? now - Date.UTC(new Date(now * 1000).getUTCFullYear(), 0, 1) / 1000 : r; const list = W.sync ? W.panels : [p]; list.forEach((pn) => pn.chart.setVisBars(secs == null ? pn.chart.n : Math.max(10, Math.round(secs / pn.sec)))); }
    function renderRange() {
      q('#rg').innerHTML = RANGES.map((r) => `<button data-r="${r[0]}" type="button">${r[0]}</button>`).join('') + `<span style="margin-left:auto"></span><button class="rgi" id="rmax" type="button" title="Maximize chart (Esc to restore)">${icon('layers')} <span class="rgl">Maximize</span></button>`;
      $$('#rg [data-r]', el).forEach((b) => (b.onclick = () => setRange(b.dataset.r))); q('#rmax').onclick = toggleMax;
    }
    function toggleMax() { const w = q('#ws'); W.max = !w.classList.contains('max'); w.classList.toggle('max', W.max); document.body.classList.toggle('fxw-maxed', W.max); const b = q('#rmax'); if (b) b.querySelector('.rgl').textContent = W.max ? 'Minimize' : 'Maximize'; setTimeout(() => window.dispatchEvent(new Event('resize')), 40); }
    function renderDock() {
      q('#qd').innerHTML = `<button class="qb qs" id="qsell" type="button"><small>SELL</small><b class="mono" id="qsp">–</b></button><span class="qspr" id="qspr">–</span><button class="qb qy" id="qbuy" type="button"><small>BUY</small><b class="mono" id="qbp">–</b></button>
      <input class="in qin" id="qd_sl" type="number" step="any" placeholder="SL price" aria-label="Stop loss price"><input class="in qin" id="qd_tp" type="number" step="any" placeholder="TP price" aria-label="Take profit price">
      <div class="qlot"><button type="button" id="qlm" aria-label="Decrease size">−</button><input class="in" id="qd_lot" type="number" step="${spec.step}" min="${spec.min}" value="${W.lot}" aria-label="Size (${esc(spec.unit)})"><button type="button" id="qlp" aria-label="Increase size">+</button></div>`;
      const lot = q('#qd_lot'), nudge = (d) => { const v = Math.max(spec.min, Math.round(((parseFloat(lot.value) || spec.min) + d * spec.step) / spec.step) * spec.step); lot.value = v.toFixed(lotDp); W.lot = v; };
      q('#qlm').onclick = () => nudge(-1); q('#qlp').onclick = () => nudge(1); lot.onchange = () => { W.lot = parseFloat(lot.value) || spec.min; };
      const go = (side) => { const num = (i) => { const v = parseFloat(q(i).value); return isFinite(v) ? v : null; }, c = cs[W.idx], ref = side === 'buy' ? c.c + s.spread : c.c, sl = num('#qd_sl'), tp = num('#qd_tp'), size = parseFloat(lot.value);
        if (!(size > 0)) return U.toast('Enter a size', 'err'); if (sl != null && (side === 'buy' ? sl >= ref : sl <= ref)) return U.toast('SL is on the wrong side of entry', 'err'); if (tp != null && (side === 'buy' ? tp <= ref : tp >= ref)) return U.toast('TP is on the wrong side of entry', 'err');
        placeOrder({ side, type: 'market', price: null, mode: 'fixed', fixed: size, risk: null, sl, tp, notes: '' }); };
      q('#qsell').onclick = () => go('sell'); q('#qbuy').onclick = () => go('buy');
    }
    function updateDock() { const c = cs[W.idx], a = q('#qsp'); if (!a) return; a.textContent = F.fmtP(c.c, W.digits); q('#qbp').textContent = F.fmtP(c.c + s.spread, W.digits); q('#qspr').textContent = spec.pip ? `${F.round(s.spread / spec.pip, 1)} pips` : (s.spread ? 'spr ' + F.fmtP(s.spread, W.digits) : 'spr 0'); }
    function toggleRail() { const wm = q('#wm'), off = !wm.classList.contains('noleft'); wm.classList.toggle('noleft', off); q('#dopen').classList.toggle('hide', !off); setTimeout(() => window.dispatchEvent(new Event('resize')), 40); }

    function ctxMenu(info) {
      const old = $('.ctxm'); if (old) old.remove(); const c = cs[W.idx], ask = c.c + s.spread, bid = c.c, pr = info.price, P = F.fmtP(pr, W.digits);
      const m = document.createElement('div'); m.className = 'ctxm'; m.style.left = Math.min(info.cx, innerWidth - 230) + 'px'; m.style.top = Math.min(info.cy, innerHeight - 170) + 'px';
      const bt = pr < ask ? 'limit' : 'stop', st = pr > bid ? 'limit' : 'stop';
      m.innerHTML = `<div class="ctxh">${P}</div><button data-a="b">Buy ${bt} @ ${P}</button><button data-a="s">Sell ${st} @ ${P}</button><button data-a="c">Copy price</button>`;
      const pend = (side, type) => { const num = (i) => { const v = parseFloat(q(i).value); return isFinite(v) ? v : null; }, sl = num('#qd_sl'), tp = num('#qd_tp'), size = parseFloat(q('#qd_lot').value);
        if (sl != null && (side === 'buy' ? sl >= pr : sl <= pr)) return U.toast('SL is on the wrong side of entry', 'err'); if (tp != null && (side === 'buy' ? tp <= pr : tp >= pr)) return U.toast('TP is on the wrong side of entry', 'err');
        placeOrder({ side, type, price: +pr.toFixed(W.digits), mode: 'fixed', fixed: size, risk: null, sl, tp, notes: '' }); };
      m.onclick = (e) => { const a = e.target.closest('[data-a]'); if (!a) return; m.remove(); if (a.dataset.a === 'b') pend('buy', bt); else if (a.dataset.a === 's') pend('sell', st); else if (navigator.clipboard) navigator.clipboard.writeText(String(+pr.toFixed(W.digits))).then(() => U.toast('Price copied', 'ok')).catch(() => U.toast('Copy not allowed', 'warn')); };
      document.body.appendChild(m); setTimeout(() => document.addEventListener('mousedown', function h(e) { if (!m.contains(e.target)) m.remove(); document.removeEventListener('mousedown', h); }), 0);
    }
    function renderBottom() {
      const bp = q('#bp'), tr = W.sim.trades, open = tr.filter((t) => t.status === 'open'), pend = tr.filter((t) => t.status === 'pending'), cl = tr.filter((t) => t.status === 'closed').slice().reverse(); bp.classList.toggle('col', W.botCol); bp.classList.toggle('max', !!W.botMax);
      const tabs = [['pos', `Positions (${open.length})`], ['pen', `Pending (${pend.length})`], ['his', `Closed (${cl.length})`]], d = W.digits, f = (v) => (v == null ? '–' : F.fmtP(v, d));
      const acts = (t) => `<button class="btn sm" data-a="edit" title="Modify SL/TP/trailing">${icon('edit')}</button> ${t.status === 'open' ? `<button class="btn sm" data-a="be" title="Move SL to breakeven">BE</button> <button class="btn sm" data-a="half" title="Close 50%">½</button> <button class="btn sm danger" data-a="close">Close</button>` : `<button class="btn sm danger" data-a="cancel">Cancel</button>`}`;
      let body; if (W.bottomTab === 'pos') body = open.length ? `<table class="t"><thead><tr><th>Side</th><th>Size</th><th>Entry</th><th>SL</th><th>TP</th><th>Float P/L</th><th>R</th><th></th></tr></thead><tbody>${open.map((t) => `<tr data-id="${t.id}"><td><span class="tag ${t.side === 'buy' ? 'g' : 'r'}">${t.side}</span></td><td class="mono">${t.size}</td><td class="mono">${f(t.entry_price)}</td><td class="mono">${f(t.sl)}${t.trail ? ' ⇣' : ''}</td><td class="mono">${f(t.tp)}</td><td class="mono ${t._float >= 0 ? 'up' : 'dn'}">${F.fmtMoney(t._float)}</td><td class="mono">${t.risk_amount ? F.round(t._float / t.risk_amount, 2) : '–'}</td><td>${acts(t)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty" style="padding:16px">No open positions.</div>';
      else if (W.bottomTab === 'pen') body = pend.length ? `<table class="t"><thead><tr><th>Type</th><th>Side</th><th>Size</th><th>Price</th><th>SL</th><th>TP</th><th></th></tr></thead><tbody>${pend.map((t) => `<tr data-id="${t.id}"><td>${t.order_type}</td><td><span class="tag ${t.side === 'buy' ? 'g' : 'r'}">${t.side}</span></td><td class="mono">${t.size}</td><td class="mono">${f(t.entry_price)}</td><td class="mono">${f(t.sl)}</td><td class="mono">${f(t.tp)}</td><td>${acts(t)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty" style="padding:16px">No pending orders.</div>';
      else body = cl.length ? `<table class="t"><thead><tr><th>Closed</th><th>Side</th><th>Size</th><th>Entry</th><th>Exit</th><th>By</th><th>Gross</th><th>Costs</th><th>Net</th><th>R</th></tr></thead><tbody>${cl.slice(0, 100).map((t) => `<tr class="click" data-id="${t.id}" data-j="1"><td class="mut">${F.fmtDT(t.exit_time)}</td><td><span class="tag ${t.side === 'buy' ? 'g' : 'r'}">${t.side}</span></td><td class="mono">${t.size}</td><td class="mono">${f(t.entry_price)}</td><td class="mono">${f(t.exit_price)}</td><td>${t.exit_reason}</td><td class="mono">${t.gross_pnl}</td><td class="mono">${F.round((t.commission || 0) + (t.swap_cost || 0), 2)}</td><td class="mono ${t.pnl >= 0 ? 'up' : 'dn'}">${t.pnl}</td><td class="mono">${t.r_multiple != null ? t.r_multiple : '–'}</td></tr>`).join('')}</tbody></table>` : '<div class="empty" style="padding:16px">No closed trades yet.</div>';
      bp.innerHTML = `<div class="tabs" id="bt2" style="display:flex;align-items:center">${tabs.map((t) => `<button data-t="${t[0]}" class="${W.bottomTab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}<span style="margin-left:auto"></span><button class="btn sm ghost ic" id="bmin" title="${W.botCol ? 'Restore panel' : 'Minimize panel'}">${W.botCol ? '▲' : '▁'}</button><button class="btn sm ghost ic" id="bmax" title="${W.botMax ? 'Restore size' : 'Maximize panel'}">${W.botMax ? '⧉' : '⤢'}</button></div><div class="bb">${body}</div>`;
      $$('#bt2 [data-t]', bp).forEach((b) => (b.onclick = () => { W.bottomTab = b.dataset.t; W.botCol = false; renderBottom(); window.dispatchEvent(new Event('resize')); })); $('#bmin', bp).onclick = () => { W.botCol = !W.botCol; W.botMax = false; renderBottom(); setTimeout(() => window.dispatchEvent(new Event('resize')), 30); }; $('#bmax', bp).onclick = () => { W.botMax = !W.botMax; W.botCol = false; renderBottom(); setTimeout(() => window.dispatchEvent(new Event('resize')), 30); };
      $$('tbody tr', bp).forEach((r) => { const id = r.dataset.id; r.onclick = (e) => { const b = e.target.closest('[data-a]'); if (b) { const a = b.dataset.a; if (a === 'edit') modifyModal(id); else act(a, id); } else if (r.dataset.j) A.openJournal(id); }; });
    }

    /* ---------- layouts ---------- */
    async function layoutsModal() {
      const list = layouts.slice(); const r = await U.modal({ title: 'Chart layouts', html: `<p class="mut" style="margin-top:0">Save panels, timeframes and indicators and apply them to any session.</p>${list.length ? `<table class="t"><tbody>${list.map((l) => `<tr data-id="${l.id}"><td>${esc(l.name)}</td><td class="mut">${l.layout.n} chart(s) · ${l.indicators.length} ind.</td><td style="white-space:nowrap"><button class="btn sm pri" data-ap>Apply</button> <button class="btn sm danger" data-dl>${icon('trash')}</button></td></tr>`).join('')}</tbody></table>` : '<div class="mut">No saved layouts.</div>'}`, onOpen: (box, close) => { $$('tr[data-id]', box).forEach((row) => { const l = layouts.find((x) => x.id === row.dataset.id); $('[data-ap]', row).onclick = async () => { close(null); W.layout = Object.assign({}, JSON.parse(JSON.stringify(l.layout)), { srcs: l.layout.srcs.map((x) => (dsAll.some((d) => d.id === x) ? x : s.dataset_id)) }); W.indicators = JSON.parse(JSON.stringify(l.indicators)); await buildPanels(); renderTab(); markUi(); U.toast('Layout applied'); }; $('[data-dl]', row).onclick = async () => { await DB.del('layouts', l.id); layouts.splice(layouts.indexOf(l), 1); row.remove(); }; }); }, buttons: [{ label: 'Close', value: null, cls: 'ghost' }, { label: 'Save current layout', value: 'save', cls: 'pri' }] });
      if (r === 'save') { const n = await U.prompt('Save layout', 'Layout name'); if (n) { const rec = await DB.put('layouts', { name: n, layout: JSON.parse(JSON.stringify(W.layout)), indicators: JSON.parse(JSON.stringify(W.indicators)) }); layouts.push(rec); U.toast('Layout saved'); } }
    }

    /* ---------- keyboard ---------- */
    const onKey = (e) => { const tg = e.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable); if (typing || document.querySelector('.modalbg')) return;
      if (e.code === 'Space') { e.preventDefault(); W.playing ? pause() : play(); } else if (e.key === 'ArrowRight') { e.preventDefault(); pause(); step(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); back(1); } else if (e.key === 'Delete' || e.key === 'Backspace') { const p = W.panels.find((x) => x.chart.sel); if (p) { e.preventDefault(); p.chart.deleteSelected(); } } else if (e.key === 'b' || e.key === 'B') { q('#qbuy').click(); } else if (e.key === 's' || e.key === 'S') { q('#qsell').click(); } else if (e.key === 'm' || e.key === 'M') { toggleMax(); } else if (e.key === 'Escape') { const cm = $('.ctxm'); if (cm) cm.remove(); if (W.max) toggleMax(); W.panels.forEach((p) => p.chart.cancelTool()); setTool('cursor'); } };
    document.addEventListener('keydown', onKey);
    const onVis = () => { if (document.visibilityState === 'hidden') persist(); }; document.addEventListener('visibilitychange', onVis);
    const onUnload = () => { if (W.dirty) persist(); }; window.addEventListener('beforeunload', onUnload);
    const onResize = () => { setGrid(W.layout.n); }; window.addEventListener('resize', onResize);

    /* ---------- go ---------- */
    renderRp(); W.wm = q('#wm'); if (!W.rpOpen) q('#wm').classList.add('noside'); await buildPanels();
    if (ctx.isStale()) { W.panels.forEach((p) => p.chart.destroy()); return; }
    if (s.status === 'completed' && W.idx >= W.endIdx) endShown = true;
    window.__fxw = W; // exposed for automated tests / debugging
    renderRange(); renderDock(); updateDock(); q('#dtg').onclick = toggleRail; q('#dopen').onclick = toggleRail;
    return async function cleanup() { document.body.classList.remove('fxw-maxed'); W.playing = false; clearTimeout(W.timer); clearTimeout(st); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('beforeunload', onUnload); window.removeEventListener('resize', onResize); if (W.dirty || W.saveState !== 'saved') { W.saving = false; await persist(); } W.panels.forEach((p) => p.chart.destroy()); if (window.__fxw === W) window.__fxw = null; };
  }
})(window);
