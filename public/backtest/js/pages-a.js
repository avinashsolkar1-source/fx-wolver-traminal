/* FX WOLVER – pages A: overview, new backtest, sessions, history, journal, analytics, gallery */
(function (g) {
  const F = g.FXW, U = F.ui, DB = F.DB, A = F.App, { $, $$, esc, icon } = { $: U.$, $$: U.$$, esc: U.esc, icon: U.icon };
  const group = (cl, fn) => { const o = {}; cl.forEach((t) => { const k = fn(t) || '–'; const r = (o[k] = o[k] || { n: 0, net: 0, w: 0 }); r.n++; r.net += t.pnl; if (t.pnl > 0) r.w++; }); return o; };
  A.group = group;
  const tfLabel = (t) => t.tf || '–';
  const tradeSession = (t) => F.sessionOf(t.entry_time != null ? t.entry_time : t.exit_time);
  const hist = (vals, bins) => { if (!vals.length) return { labels: [], counts: [], mid: [] }; const lo = Math.min(...vals), hi = Math.max(...vals), w = (hi - lo) / bins || 1, c = Array(bins).fill(0); vals.forEach((v) => (c[Math.min(bins - 1, Math.floor((v - lo) / w))]++)); return { labels: c.map((_, i) => F.round(lo + w * i, 1)), counts: c, mid: c.map((_, i) => lo + w * (i + 0.5)) }; };
  const stars = (n) => '★★★★★'.slice(0, n || 0) + '<span class="mut">' + '★★★★★'.slice(0, 5 - (n || 0)) + '</span>';
  const equityOf = (cl) => { const s = cl.slice().sort((a, b) => a.exit_time - b.exit_time); let c = 0, pk = 0; const eq = [], dd = []; s.forEach((t, i) => { c += t.pnl; pk = Math.max(pk, c); eq.push({ x: i + 1, y: c, t: t.exit_time }); dd.push({ x: i + 1, y: -(pk - c) }); }); return { eq: [{ x: 0, y: 0 }].concat(eq), dd: [{ x: 0, y: 0 }].concat(dd), maxDD: dd.length ? -Math.min(...dd.map((d) => d.y)) : 0 }; };

  /* ================= OVERVIEW ================= */
  F.pages.overview = async function (el) {
    const [ses, trades] = await Promise.all([A.sessions(), A.trades()]), cl = A.closed(trades), st = F.stats(cl, 0), E = equityOf(cl);
    const bySym = group(cl, (t) => t.symbol), byStr = group(cl, (t) => t.strategy || 'Manual'), byTf = group(cl, tfLabel), bySes = group(cl, tradeSession);
    const best = (o) => { const k = Object.keys(o).sort((a, b) => o[b].net - o[a].net)[0]; return k ? `${esc(k)} <span class="mut" style="font-size:12px">${F.fmtMoney(o[k].net)}</span>` : '–'; };
    const mo = group(cl, (t) => new Date(t.exit_time * 1000).toISOString().slice(0, 7)), moK = Object.keys(mo).sort();
    el.innerHTML = `<div class="pagehead"><div><h1>Backtesting Overview</h1><p>Combined real performance across all your saved backtests.</p></div><div class="acts"><a class="btn pri" href="#/bt/new">${icon('plus')} New Backtest</a></div></div>
    ${!ses.length ? `<div class="card">${U.empty('chart', 'No backtests yet', 'First import real historical data in <a href="#/bt/data">Market Data</a>, then create a New Backtest. This dashboard fills in as trades are closed.', '<a class="btn pri" href="#/bt/new">New Backtest</a>')}</div>` : `
    <div class="grid g6 k2" style="margin-bottom:14px">${U.kpi('Total backtests', ses.length)}${U.kpi('Simulated trades', cl.length)}${U.kpi('Winning', st.wins, '', 'up')}${U.kpi('Losing', st.losses, '', 'dn')}${U.kpi('Win rate', F.round(st.wr, 1) + '%')}${U.kpi('Net P/L', U.money(st.net))}</div>
    <div class="grid g6 k2" style="margin-bottom:16px">${U.kpi('Profit factor', U.pf(st.pf))}${U.kpi('Avg R-multiple', F.round(st.avgR, 2), 'SL trades only')}${U.kpi('Max drawdown', F.fmtMoney(E.maxDD), 'combined P/L curve')}${U.kpi('Avg duration', U.dur(cl.length ? cl.reduce((a, t) => a + (t.exit_time - (t.entry_time || t.exit_time)), 0) / cl.length : 0))}${U.kpi('Best strategy', best(byStr))}${U.kpi('Best symbol', best(bySym))}</div>
    <div class="grid g2" style="margin-bottom:14px"><div class="card"><h3>Equity curve (cumulative P/L)</h3><div class="chartbox"><canvas id="c1"></canvas></div></div><div class="card"><h3>Drawdown</h3><div class="chartbox"><canvas id="c2"></canvas></div></div></div>
    <div class="grid g2" style="margin-bottom:14px"><div class="card"><h3>Monthly performance</h3><div class="chartbox"><canvas id="c3"></canvas></div></div><div class="card"><h3>Win / loss distribution</h3><div class="chartbox"><canvas id="c4"></canvas></div></div></div>
    <div class="grid g3 keep1"><div class="card"><h3>By symbol</h3><div class="chartbox"><canvas id="c5"></canvas></div></div><div class="card"><h3>By timeframe</h3><div class="chartbox"><canvas id="c6"></canvas></div></div><div class="card"><h3>By session (UTC)</h3><div class="chartbox"><canvas id="c7"></canvas></div><div class="hint">Asia 00–07 · London 07–12 · New York 12–21 UTC (entry time)</div></div></div>`}`;
    if (!ses.length) return;
    const draw = () => {
      U.lineChart($('#c1'), [{ data: E.eq, color: '#3b82f6', fill: true }], { zero: true, fillBase: 0, fmt: (v) => F.round(v, 0), xfmt: (x) => '#' + Math.round(x) });
      U.lineChart($('#c2'), [{ data: E.dd, color: '#ef4444', fill: true }], { fillBase: 0, fmt: (v) => F.round(v, 0), xfmt: (x) => '#' + Math.round(x) });
      U.barChart($('#c3'), moK, moK.map((k) => F.round(mo[k].net, 2)));
      const h = hist(cl.map((t) => t.pnl), 12); U.barChart($('#c4'), h.labels, h.counts, { color: (v, i) => (h.mid[i] >= 0 ? '#22c55e' : '#ef4444'), fmt: (v) => v });
      const bar = (id, o) => { const k = Object.keys(o); U.barChart($(id), k, k.map((x) => F.round(o[x].net, 2))); };
      bar('#c5', bySym); bar('#c6', byTf); bar('#c7', bySes);
    }; draw(); const rs = () => draw(); window.addEventListener('resize', rs); return () => window.removeEventListener('resize', rs);
  };

  /* ================= NEW BACKTEST ================= */
  /* ---------- Data library: real historical data straight inside New Backtest ---------- */
  const PROV = (m) => (m === 'crypto' ? 'binance' : 'yahoo');
  A.tvModal = () => U.modal({ title: 'TradingView chart', html: `<div class="alert info" style="margin:0 0 10px">Status: <b>not connected</b></div><p style="margin:0 0 8px;line-height:1.6">The terminal currently runs on the native FXW chart (replay, indicators, drawing and SMC tools). To connect TradingView:</p><ol class="guide"><li>TradingView <b>Charting Library</b> access (it requires a license / application process).</li><li>Place the library files in <code>/tv/charting_library/</code> and set <code>TV_LIBRARY_PATH</code> in <code>js/config.js</code>.</li><li>A datafeed adapter is required to supply this app's candles to TradingView and control replay (not built yet).</li></ol><p class="mut" style="margin:8px 0 0">Once the library is added, this button will enable TradingView mode.</p>`, buttons: [{ label: 'Close', value: true, cls: 'pri' }] });
  A.dataCard = function (el, dsAll, S) {
    const markets = [['crypto', 'Crypto'], ['forex', 'Forex'], ['metals', 'Gold / Metals'], ['indices', 'Indices'], ['stocks', 'Stocks']]; const to0 = new Date().toISOString().slice(0, 10), fr0 = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
    return `<div class="card" id="dl" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h3 style="margin:0">Real historical data</h3><div class="chips"><span class="chip" style="border-color:#22c55e;color:#86efac">● FXW chart</span><button class="chip" id="tvb" type="button">○ TradingView — connect</button></div></div>
      <div id="lib"></div><p class="mut" style="margin:8px 0 12px">Select a market and dates, download real candles and start backtesting. No fake or random data.</p>
      <div class="frm c4"><div><label class="f">Market</label><select class="in" id="dm">${markets.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div><label class="f">Symbol</label><select class="in" id="ds2"></select></div><div><label class="f">Timeframe</label><select class="in" id="dt2">${['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((x) => `<option ${x === '15m' ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div><label class="f">Source</label><div class="in" id="dsrc" style="display:flex;align-items:center;opacity:.85"></div></div>
      <div><label class="f">From</label><input class="in" type="date" id="dfr" value="${fr0}" max="${to0}"></div><div><label class="f">To</label><input class="in" type="date" id="dto" value="${to0}" max="${to0}"></div><div class="full" style="grid-column:span 2;display:flex;align-items:end;gap:10px;flex-wrap:wrap"><button class="btn pri" id="dgo" type="button">${U.icon('dl')} Download real data</button><span class="hint" id="dest"></span></div></div>
      <div id="dmsg" style="margin-top:10px"></div><div class="hint" style="margin-top:8px">Have your own CSV file? <a href="#/bt/data" style="color:var(--blue2)">CSV import (side option)</a></div></div>`;
  };
  A.bindDataCard = function (el) {
    const q = (i) => $(i, el); if (!q('#dl')) return;
    (async () => {
      const box = q('#lib'); if (!box) return; let csvList = [], sharedList = [];
      try { const r = await fetch('data/manifest.json', { cache: 'no-store' }); if (r.ok) csvList = ((await r.json()).datasets || []).filter((d) => d && d.file && d.symbol && d.tf && F.TF[d.tf]); } catch (e) { csvList = []; }
      try { sharedList = (await DB.list('datasets')).filter((d) => d.is_public); } catch (e) { sharedList = []; }
      const list = sharedList.map((d) => ({ ...d, shared: true, name: d.symbol + ' ' + d.tf, source: d.source || 'Shared market library' })).concat(csvList.map((d) => ({ ...d, shared: false })));
      if (!list.length) { box.innerHTML = '<div class="hint" style="margin:6px 0 10px">No shared datasets are available yet. Download real candles or import your own CSV below.</div>'; return; }
      box.innerHTML = '<h3 style="margin:10px 0 8px">Market Data Library</h3><div class="grid g3 keep1" style="gap:8px;margin-bottom:12px">' + list.map((d, i) => `<div class="card" style="padding:10px"><b>${esc(d.name || d.symbol + ' ' + d.tf)}</b><div class="mut" style="font-size:12px;margin:2px 0 8px">${esc(d.symbol)} · ${esc(d.tf)} · ${esc(d.source || 'library')}</div>${d.shared ? '<span class="tag">Shared · 5y daily</span>' : ''}<button class="btn sm pri" data-lib="${i}" type="button" style="margin-top:8px">Load & use</button></div>`).join('') + '</div><div id="libmsg"></div>';
      $$('[data-lib]', box).forEach((b) => (b.onclick = async () => {
        const d = list[+b.dataset.lib], m = $('#libmsg', box); b.disabled = true; m.innerHTML = U.loading('Loading ' + d.symbol + ' ' + d.tf + '…');
        try {
          if (d.shared) {
            const cs = await DB.loadCandles(d.id);
            if (cs.length < 200) throw new Error('Shared dataset has fewer than 200 candles.');
            U.toast(d.symbol + ' ' + d.tf + ': ' + cs.length.toLocaleString() + ' shared candles ready');
            A.pendingSel = { market: d.market, symbol: d.symbol, ds: d.id }; A.route(); return;
          }
          const r = await fetch('data/' + encodeURIComponent(d.file).replace(/%2F/g, '/')); if (!r.ok) throw new Error('File data/' + d.file + ' not found (HTTP ' + r.status + ').');
          const pr = F.parseCSV(await r.text(), { tz: d.tz_offset_minutes || 0 }), cs = pr.candles; if (cs.length < 200) throw new Error('Only ' + cs.length + ' valid candles found; at least 200 are needed.');
          const mk = d.market || 'forex', sec = F.TF[d.tf], all = await DB.list('datasets'), same = all.find((x) => x.symbol === d.symbol && x.market === mk && x.tfSec === sec), id = same ? same.id : F.uid(), qq = F.dataQuality(cs, sec, mk);
          await DB.put('datasets', { id, symbol: d.symbol, market: mk, tf: d.tf, tfSec: sec, rows: cs.length, from: cs[0].t, to: cs[cs.length - 1].t, source: d.source || 'Data Library', quality: { gaps: qq.gaps, missing: qq.missing }, imported_at: new Date().toISOString() }); await DB.saveCandles(id, cs);
          await DB.put('imports', { id: F.uid(), kind: 'import', at: new Date().toISOString(), filename: 'Library: ' + d.file, symbol: d.symbol, tf: d.tf, rows: cs.length, skipped: pr.skipped || 0, dups: pr.dups || 0, gaps: qq.gaps });
          U.toast(d.symbol + ' ' + d.tf + ': ' + cs.length.toLocaleString() + ' candles ready'); A.pendingSel = { market: mk, symbol: d.symbol, ds: id }; A.route();
        } catch (er) { m.innerHTML = `<div class="alert err">${esc(er.message)}</div>`; b.disabled = false; }
      }));
    })();
    const setRange = () => {
      const market = q('#dm').value, tf = q('#dt2').value;
      let days = 31;
      if (tf === '1m') days = 5;
      else if (['5m', '15m', '30m'].includes(tf)) days = market === 'crypto' ? 180 : 31;
      else if (['1h', '4h'].includes(tf)) days = 730;
      else if (tf === '1d') days = 1826;
      const to = new Date(), from = new Date(Date.now() - days * 864e5);
      q('#dto').value = to.toISOString().slice(0, 10); q('#dfr').value = from.toISOString().slice(0, 10);
    };
    const est = () => { const tf = q('#dt2').value, d = (Date.parse(q('#dto').value) - Date.parse(q('#dfr').value)) / 1000; const n = d > 0 ? Math.round(d / F.TF[tf] * (q('#dm').value === 'crypto' ? 1 : 5 / 7)) : 0; q('#dest').textContent = n ? `≈ ${n.toLocaleString()} candles${n > 400000 ? ' — too many, shorten the range' : ''}` : ''; };
    const fill = () => { const m = q('#dm').value; q('#ds2').innerHTML = (F.MARKETS[m] || []).map((x) => `<option>${x}</option>`).join(''); q('#dsrc').textContent = m === 'crypto' ? 'Binance public API (free)' : 'Yahoo Finance via Supabase (free)'; setRange(); est(); };
    q('#dm').onchange = fill; q('#dt2').onchange = () => { setRange(); est(); }; q('#dfr').onchange = q('#dto').onchange = est;
    fill(); q('#tvb').onclick = A.tvModal;
    q('#dgo').onclick = async () => {
      const b = q('#dgo'), m = q('#dmsg'), mk = q('#dm').value, sym = q('#ds2').value, tf = q('#dt2').value, from = Date.parse(q('#dfr').value) / 1000, to = Date.parse(q('#dto').value) / 1000 + 86399;
      if (!(to > from)) return (m.innerHTML = '<div class="alert err">Invalid date range (From must be before To).</div>');
      if ((to - from) / F.TF[tf] > 600000) return (m.innerHTML = '<div class="alert err">Too many candles — use a larger timeframe or a shorter range.</div>');
      b.disabled = true; m.innerHTML = U.loading('Downloading…'); const prog = $('.loading span:last-child', m);
      try {
        const cs = await F.providers[PROV(mk)].fetch({ symbol: sym, tf, from, to }, (p, n) => { if (prog) prog.textContent = `Download… ${Math.round(p * 100)}% (${n.toLocaleString()} candles)`; });
        if (cs.length < 200) throw new Error(`Only ${cs.length} candles found — at least 200 are required for a backtest. Extend the range.`);
        const sec = F.TF[tf], all = await DB.list('datasets'), same = all.find((d) => !d.is_public && d.symbol === sym && d.market === mk && d.tfSec === sec); let merged = cs;
        if (same) { const old = await DB.loadCandles(same.id), map = new Map(old.map((c) => [c.t, c])); cs.forEach((c) => map.set(c.t, c)); merged = Array.from(map.values()).sort((a, b) => a.t - b.t); }
        const id = same ? same.id : F.uid(), qq = F.dataQuality(merged, sec, mk), src = mk === 'crypto' ? 'Binance public API' : 'Yahoo Finance (Supabase Edge Function)';
        await DB.put('datasets', { id, symbol: sym, market: mk, tf, tfSec: sec, rows: merged.length, from: merged[0].t, to: merged[merged.length - 1].t, source: src, quality: { gaps: qq.gaps, missing: qq.missing }, imported_at: new Date().toISOString() }); await DB.saveCandles(id, merged);
        await DB.put('imports', { id: F.uid(), kind: 'import', at: new Date().toISOString(), filename: `${src} ${sym} ${tf}`, symbol: sym, tf, rows: cs.length, skipped: 0, dups: 0, gaps: qq.gaps });
        U.toast(`${sym} ${tf}: ${merged.length.toLocaleString()} real candles ready`); A.pendingSel = { market: mk, symbol: sym, ds: id }; A.route();
      } catch (er) { m.innerHTML = `<div class="alert err">${esc(er.message)}</div>`; b.disabled = false; }
    };
  };

  F.pages.new = async function (el) {
    const [dsAll, strats, props, S] = await Promise.all([DB.list('datasets'), DB.list('strategies'), DB.list('prop_configs'), A.settingsGet()]), strat = strats.filter((s) => s.kind !== 'pattern');
    if (!dsAll.length) { el.innerHTML = `<div class="pagehead"><div><h1>New Backtest</h1><p>Load your real historical data first, then start the backtest.</p></div></div>${A.dataCard(el, dsAll, S)}`; A.bindDataCard(el); return; }
    const markets = ['forex', 'crypto', 'metals', 'indices', 'stocks'], mlabel = { forex: 'Forex', crypto: 'Crypto', metals: 'Commodities / Metals', indices: 'Indices', stocks: 'Stocks' };
    const dsM = (m) => dsAll.filter((d) => d.market === m);
    const firstM = (markets.find((m) => dsM(m).length && dsM(m).some((d) => d.symbol === S.symbol)) || markets.find((m) => dsM(m).length));
    el.innerHTML = `<div class="pagehead"><div><h1>New Backtest</h1><p>Choose the market, instrument, dates and account rules. Only imported data can be used.</p></div></div>
    ${A.dataCard(el, dsAll, S)}
    <form id="nf" class="grid g2 keep1" style="align-items:start" novalidate>
    <div class="card"><h3>1 · Market & data</h3><div class="frm c2">
      <div class="full"><label class="f">Backtest name</label><input class="in" id="nm" placeholder="e.g. London breakout test"></div>
      <div><label class="f">Market</label><select class="in" id="mk">${markets.map((m) => `<option value="${m}" ${m === firstM ? 'selected' : ''}>${mlabel[m]}${dsM(m).length ? '' : ' (no data)'}</option>`).join('')}</select></div>
      <div><label class="f">Instrument</label><select class="in" id="sy"></select></div>
      <div class="full"><label class="f">Dataset</label><select class="in" id="dsel"></select><div class="hint" id="dinfo"></div></div>
      <div><label class="f">Chart timeframe</label><select class="in" id="tf"></select><div class="hint">Higher timeframes are aggregated from the dataset (not synthetic).</div></div>
      <div><label class="f">Replay speed</label><select class="in" id="sp">${[1, 2, 5, 10, 20, 50].map((x) => `<option ${x === S.speed ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div><label class="f">Start date</label><input class="in" id="sd" type="date"></div><div><label class="f">End date</label><input class="in" id="ed" type="date"></div>
      <div class="full hint" id="range"></div></div></div>
    <div class="card"><h3>2 · Account simulation</h3><div class="frm c2">
      <div><label class="f">Initial balance (USD)</label><input class="in" id="bal" type="number" min="1" step="any" value="${S.balance}"></div><div><label class="f">Account currency</label><select class="in" id="cur"><option>USD</option></select><div class="hint">P/L is calculated in USD.</div></div>
      <div><label class="f">Position sizing</label><select class="in" id="szm"><option value="risk">Risk-based (% of balance)</option><option value="fixed">Fixed size</option></select></div><div><label class="f" id="szl">Risk per trade (%)</label><input class="in" id="rk" type="number" min="0.01" step="any" value="${S.riskPct}"></div>
      <div><label class="f">Leverage (1:x)</label><input class="in" id="lev" type="number" min="1" step="1" value="${S.leverage}"></div><div><label class="f">Max open positions</label><input class="in" id="mo" type="number" min="1" step="1" value="${S.maxOpen}"></div></div>
      <h3 style="margin-top:16px">3 · Trading costs</h3><div class="frm c2">
      <div><label class="f">Spread <span id="u1"></span></label><input class="in" id="spr" type="number" min="0" step="any" value="${S.spread}"></div><div><label class="f">Slippage <span id="u2"></span></label><input class="in" id="slp" type="number" min="0" step="any" value="${S.slippage}"></div>
      <div><label class="f">Commission ($ per <span class="u3">lot</span>, charged on close)</label><input class="in" id="com" type="number" min="0" step="any" value="${S.commission}"></div><div><label class="f">Swap ($ per <span class="u3">lot</span> per night)</label><input class="in" id="swp" type="number" min="0" step="any" value="${S.swap}"></div></div>
      <h3 style="margin-top:16px">4 · Strategy & rules</h3><div class="frm c2"><div><label class="f">Strategy</label><select class="in" id="stg"><option value="">Manual trading</option>${strat.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      <div><label class="f">Prop-firm rules (optional)</label><select class="in" id="prp"><option value="">None</option>${props.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div></div></div>
    <div class="full" style="grid-column:1/-1"><div id="nerr"></div><button class="btn pri" id="go" type="submit" style="min-width:220px">${icon('play')} Create & open replay</button></div></form>`;
    const q = (id) => $(id, el); let ds = null; A.bindDataCard(el); const msg = (t) => (q('#nerr').innerHTML = t ? `<div class="alert err">${t}</div>` : '');
    const fillSym = () => { const m = q('#mk').value, have = dsM(m).map((d) => d.symbol), all = Array.from(new Set((F.MARKETS[m] || []).concat(have))); q('#sy').innerHTML = all.map((s) => `<option value="${s}" ${have.includes(s) ? '' : 'disabled'}>${s}${have.includes(s) ? '' : ' — no data'}</option>`).join(''); const pref = have.includes(S.symbol) ? S.symbol : have[0]; if (pref) q('#sy').value = pref; fillDs(); };
    const fillDs = () => { const list = dsAll.filter((d) => d.market === q('#mk').value && d.symbol === q('#sy').value); q('#dsel').innerHTML = list.map((d) => `<option value="${d.id}">${esc(d.tf || 'custom')} · ${F.fmtDate(d.from)} → ${F.fmtDate(d.to)} · ${d.rows.toLocaleString()} candles · ${esc(d.source || '')}</option>`).join('') || '<option value="">— no datasets —</option>'; pick(); };
    const pick = () => {
      ds = dsAll.find((d) => d.id === q('#dsel').value) || null; q('#go').disabled = !ds; if (!ds) { q('#dinfo').textContent = 'No data imported for this instrument. Import it from the Market Data page.'; return; }
      const spec = F.specFor(ds.symbol, ds.market); q('#dinfo').textContent = `Base timeframe ${ds.tf || ds.tfSec + 's'} · ${ds.rows.toLocaleString()} candles`; const opts = A.tfOptions(ds.tfSec); q('#tf').innerHTML = opts.map((k) => `<option>${k}</option>`).join(''); q('#tf').value = opts.includes(S.tf) ? S.tf : opts[0];
      const pip = spec.pip ? `${spec.pip === 0.01 && spec.base !== 'XAG' && spec.kind !== 'metal' ? 'pips (1 pip = ' + spec.pip + ')' : 'pips (1 pip = ' + spec.pip + ')'}` : 'price units'; q('#u1').textContent = '(' + pip + ')'; q('#u2').textContent = '(' + pip + ')'; $$('.u3', el).forEach((x) => (x.textContent = spec.unit.replace(/s$/, '')));
      q('#sd').min = q('#ed').min = F.fmtDate(ds.from); q('#sd').max = q('#ed').max = F.fmtDate(ds.to); const span = ds.to - ds.from; q('#sd').value = F.fmtDate(ds.from + span * 0.3); q('#ed').value = F.fmtDate(ds.to); q('#range').textContent = `Available data: ${F.fmtDT(ds.from)} → ${F.fmtDT(ds.to)} (UTC). Data before the start date is shown on the chart as "past context".`;
    };
    q('#mk').onchange = fillSym; q('#sy').onchange = fillDs; q('#dsel').onchange = pick; q('#szm').onchange = () => { const f = q('#szm').value === 'fixed'; q('#szl').textContent = f ? 'Fixed size' : 'Risk per trade (%)'; q('#rk').value = f ? (ds ? F.specFor(ds.symbol, ds.market).min : 0.01) : S.riskPct; };
    if (A.pendingSel) { const ps = A.pendingSel; A.pendingSel = null; q('#mk').value = ps.market; S.symbol = ps.symbol; }
    fillSym();
    if (window.__sel) window.__sel = null;
    let busy = false;
    q('#nf').onsubmit = async (e) => {
      e.preventDefault(); if (busy) return; msg(''); $$('.in', el).forEach((x) => x.classList.remove('bad')); const err = [], bad = (id, t) => { err.push(t); q(id).classList.add('bad'); };
      if (!ds) return msg('Select a dataset.'); const spec = F.specFor(ds.symbol, ds.market), n = (id) => parseFloat(q(id).value);
      const sd = Date.parse(q('#sd').value + 'T00:00:00Z') / 1000, ed = Date.parse(q('#ed').value + 'T23:59:59Z') / 1000;
      if (!isFinite(sd)) bad('#sd', 'Enter a start date.'); if (!isFinite(ed)) bad('#ed', 'Enter an end date.'); if (isFinite(sd) && isFinite(ed) && sd >= ed) bad('#ed', 'End date must be after the start date.');
      if (isFinite(sd) && sd < ds.from - 86400) bad('#sd', 'Start date is before the data range (' + F.fmtDate(ds.from) + ').'); if (isFinite(ed) && ed > ds.to + 86400) bad('#ed', 'End date is after the data range (' + F.fmtDate(ds.to) + ').');
      if (!(n('#bal') > 0)) bad('#bal', 'Balance must be greater than 0.'); if (q('#szm').value === 'risk' && !(n('#rk') > 0 && n('#rk') <= 100)) bad('#rk', 'Risk must be between 0 and 100%.'); if (q('#szm').value === 'fixed' && !(n('#rk') >= spec.min)) bad('#rk', 'Fixed size must be at least ' + spec.min + '.');
      if (!(n('#lev') >= 1)) bad('#lev', 'Leverage must be at least 1.'); if (!(n('#mo') >= 1)) bad('#mo', 'Max open positions must be at least 1.');
      for (const id of ['#spr', '#slp', '#com', '#swp']) if (!(n(id) >= 0)) bad(id, 'Costs cannot be negative.');
      if (err.length) return msg(err.map(esc).join('<br>'));
      busy = true; q('#go').disabled = true;
      try {
        const candles = await DB.loadCandles(ds.id); const i0 = candles.findIndex((c) => c.t >= sd), i1 = (() => { let k = candles.length - 1; while (k >= 0 && candles[k].t > ed) k--; return k; })();
        if (i0 < 0 || i1 - i0 < 100) { msg(`The selected range has only ${Math.max(0, i1 - i0 + 1)} candles. At least 100 are required — extend the range.`); busy = false; q('#go').disabled = false; return; }
        const stg = strat.find((s) => s.id === q('#stg').value), mult = spec.pip || 1;
        const s = { id: F.uid(), name: q('#nm').value.trim() || `${ds.symbol} ${q('#tf').value} ${F.fmtDate(candles[i0].t)}`, symbol: ds.symbol, market: ds.market, dataset_id: ds.id, base_sec: ds.tfSec, tf: q('#tf').value, start_t: candles[i0].t, end_t: candles[i1].t, start_idx: i0, end_idx: i1, idx: i0,
          balance: n('#bal'), initial: n('#bal'), currency: 'USD', sizing: q('#szm').value, riskPct: q('#szm').value === 'risk' ? n('#rk') : S.riskPct, fixedSize: q('#szm').value === 'fixed' ? n('#rk') : spec.min, leverage: n('#lev'), maxOpen: n('#mo'),
          spread: n('#spr') * mult, slippage: n('#slp') * mult, commission: n('#com'), swap: n('#swp'), strategy_id: stg ? stg.id : null, strategy_name: stg ? stg.name : 'Manual', prop_id: q('#prp').value || null, speed: n('#sp'), status: 'active', log: [], progress: 0, trade_count: 0, net: 0, equity: n('#bal') };
        await DB.put('sessions', s); U.toast('Backtest created'); A.go('#/bt/workspace/' + s.id);
      } catch (er) { msg(esc(er.message)); busy = false; q('#go').disabled = false; }
    };
  };

  /* ================= REPORT EXPORT ================= */
  A.sessionReport = function (s, trades) {
    const cl = A.closed(trades), st = F.stats(cl, s.initial), E = st.curve; const W = 640, H = 200; const ys = E.map((p) => p.eq), lo = Math.min(...ys), hi = Math.max(...ys), sx = (i) => (E.length < 2 ? 0 : (i / (E.length - 1)) * W), sy = (v) => H - 10 - ((v - lo) / (hi - lo || 1)) * (H - 20);
    const row = (t) => `<tr><td>${esc(F.fmtDT(t.entry_time))}</td><td>${t.side}</td><td>${t.size}</td><td>${F.fmtP(t.entry_price)}</td><td>${F.fmtP(t.exit_price)}</td><td>${t.sl != null ? F.fmtP(t.sl) : ''}</td><td>${t.tp != null ? F.fmtP(t.tp) : ''}</td><td>${esc(t.exit_reason || '')}</td><td style="color:${t.pnl >= 0 ? '#15803d' : '#b91c1c'}">${t.pnl}</td><td>${t.r_multiple != null ? t.r_multiple : ''}</td></tr>`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>FX WOLVER report – ${esc(s.name)}</title><style>body{font:14px Inter,Arial,sans-serif;margin:32px;color:#111}h1{margin:0}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border-bottom:1px solid #ddd;padding:5px 8px;text-align:left}.k{display:inline-block;margin:0 22px 10px 0}.k b{display:block;font-size:18px}.m{color:#666}@media print{body{margin:10mm}}</style></head><body><h1>FX WOLVER – Backtest report</h1><p class="m">${esc(s.name)} · ${esc(s.symbol)} · ${esc(s.tf)} · ${F.fmtDate(s.start_t)} → ${F.fmtDate(s.end_t)} · generated ${new Date().toISOString().slice(0, 16)}Z<br>Historical educational simulation (candle-based fills, spread ${s.spread}, slippage ${s.slippage}, commission ${s.commission}/unit, swap ${s.swap}/unit/night). Not live trading; past simulated results do not guarantee future performance.</p>
    <div>${[['Trades', st.n], ['Win rate', F.round(st.wr, 1) + '%'], ['Net P/L', F.fmtMoney(st.net)], ['Profit factor', U.pf(st.pf)], ['Expectancy', F.fmtMoney(st.expectancy)], ['Avg R', F.round(st.avgR, 2)], ['Max DD', F.round(st.maxDDpct, 2) + '%'], ['Start → End', F.fmtMoney(s.initial) + ' → ' + F.fmtMoney(st.final)]].map((k) => `<span class="k">${k[0]}<b>${k[1]}</b></span>`).join('')}</div>
    <svg width="100%" viewBox="0 0 ${W} ${H}" style="background:#f6f8fb;border:1px solid #ddd"><polyline fill="none" stroke="#2563eb" stroke-width="2" points="${E.map((p, i) => sx(i).toFixed(1) + ',' + sy(p.eq).toFixed(1)).join(' ')}"/></svg>
    <h3>Trades</h3><table><tr><th>Entry time</th><th>Side</th><th>Size</th><th>Entry</th><th>Exit</th><th>SL</th><th>TP</th><th>Exit</th><th>Net P/L</th><th>R</th></tr>${cl.map(row).join('')}</table></body></html>`;
  };
  A.tradesCSV = (trades) => U.csv([['id', 'session', 'symbol', 'tf', 'strategy', 'side', 'type', 'size', 'entry_time', 'entry', 'exit_time', 'exit', 'sl', 'tp', 'exit_reason', 'gross', 'commission', 'swap', 'net_pnl', 'R', 'mfe', 'mae', 'status']].concat(trades.map((t) => [t.id, t.session_id, t.symbol, t.tf, t.strategy, t.side, t.order_type, t.size, F.fmtDT(t.entry_time), t.entry_price, F.fmtDT(t.exit_time), t.exit_price, t.sl, t.tp, t.exit_reason, t.gross_pnl, t.commission, t.swap_cost, t.pnl, t.r_multiple, t.mfe, t.mae, t.status])));

  /* ================= MY BACKTESTS ================= */
  F.pages.sessions = async function (el) {
    let ses = await A.sessions(), q = '';
    const draw = () => {
      const list = ses.filter((s) => !q || (A.sessionName(s) + s.symbol).toLowerCase().includes(q));
      el.innerHTML = `<div class="pagehead"><div><h1>My Backtests</h1><p>Saved sessions — resume, duplicate or export a report.</p></div><div class="acts"><input class="in" id="q" placeholder="Search…" value="${esc(q)}" style="width:200px"><a class="btn pri" href="#/bt/new">${icon('plus')} New</a></div></div>
      ${!ses.length ? `<div class="card">${U.empty('list', 'No saved backtests', 'Create a New Backtest — progress, trades and drawings are saved automatically.', '<a class="btn pri" href="#/bt/new">New Backtest</a>')}</div>` : `<div class="tw"><table class="t"><thead><tr><th>Name</th><th>Symbol</th><th>TF</th><th>Range</th><th>Progress</th><th>Trades</th><th>Net P/L</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${list.map((s) => `<tr data-id="${s.id}"><td><a href="#/bt/workspace/${s.id}">${esc(A.sessionName(s))}</a></td><td>${esc(s.symbol)}</td><td>${esc(s.tf)}</td><td class="mut">${F.fmtDate(s.start_t)} → ${F.fmtDate(s.end_t)}</td><td style="min-width:110px"><div class="prog"><i style="width:${Math.round((s.progress || 0) * 100)}%"></i></div></td><td>${s.trade_count || 0}</td><td>${U.money(s.net || 0)}</td><td><span class="tag ${s.status === 'completed' ? 'g' : ''}">${s.status === 'completed' ? 'completed' : 'active'}</span></td><td class="mut">${esc((s.updated_at || '').slice(0, 16).replace('T', ' '))}</td>
        <td style="white-space:nowrap"><a class="btn sm pri" href="#/bt/workspace/${s.id}">${s.status === 'completed' ? 'Open' : 'Resume'}</a> <button class="btn sm" data-a="ren" title="Rename">${icon('edit')}</button> <button class="btn sm" data-a="dup" title="Duplicate settings">${icon('copy')}</button> <button class="btn sm" data-a="rep" title="Report">${icon('dl')}</button> <button class="btn sm danger" data-a="del" title="Delete">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>${list.length ? '' : '<div class="empty">No matches found</div>'}`}`;
      if ($('#q', el)) $('#q', el).oninput = (e) => { q = e.target.value.toLowerCase(); const p = e.target.selectionStart; draw(); const i = $('#q', el); i.focus(); i.setSelectionRange(p, p); };
      $$('button[data-a]', el).forEach((b) => (b.onclick = async () => {
        const id = b.closest('tr').dataset.id, s = ses.find((x) => x.id === id), a = b.dataset.a;
        try {
          if (a === 'ren') { const v = await U.prompt('Rename backtest', 'Name', s.name); if (v) { s.name = v; await DB.put('sessions', s); draw(); U.toast('Renamed'); } }
          else if (a === 'dup') { const c = Object.assign({}, s, { id: F.uid(), name: s.name + ' (copy)', idx: s.start_idx, balance: s.initial, equity: s.initial, log: [], progress: 0, trade_count: 0, net: 0, status: 'active', created_at: null }); await DB.put('sessions', c); ses = await A.sessions(); draw(); U.toast('Session duplicated (same settings, fresh start)'); }
          else if (a === 'rep') { const tr = await A.trades(id); const ch = await U.modal({ title: 'Export report', html: '<p class="mut" style="margin:0">Which format?</p>', buttons: [{ label: 'Cancel', value: null, cls: 'ghost' }, { label: 'CSV (trades)', value: 'csv' }, { label: 'HTML / PDF report', value: 'html', cls: 'pri' }] }); if (ch === 'csv') U.download(`${s.symbol}-trades.csv`, A.tradesCSV(tr), 'text/csv'); if (ch === 'html') { const h = A.sessionReport(s, tr); const w = window.open('', '_blank'); if (w) { w.document.write(h); w.document.close(); U.toast('Report opened. Use Print → Save as PDF'); } else U.download(`${s.symbol}-report.html`, h, 'text/html'); } }
          else if (a === 'del') { if (await U.confirm(`"${A.sessionName(s)}" and all its trades, journal entries and drawings will be deleted. This cannot be undone.`, 'Delete', true)) { for (const t of ['trades', 'journal', 'drawings', 'layouts', 'zones', 'screenshots']) await DB.delBySession(t, id); await DB.del('sessions', id); ses = await A.sessions(); draw(); U.toast('Deleted'); } }
        } catch (e) { U.toast(e.message, 'err'); }
      }));
    }; draw();
  };

  /* ================= JOURNAL EDITOR (shared) ================= */
  const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Trend continuation', 'Range', 'Liquidity sweep', 'Order block', 'FVG', 'News', 'Other'];
  const MISTAKES = ['Early entry', 'Late entry', 'Moved SL', 'No SL', 'Oversized', 'Revenge trade', 'FOMO', 'Ignored plan', 'Exited early', 'Held loser'];
  const EMOS = ['Calm', 'Confident', 'Anxious', 'Greedy', 'Fearful', 'Impatient', 'Frustrated', 'Bored'];
  A.openJournal = async function (tradeId) {
    const t = await DB.get('trades', tradeId); if (!t) return U.toast('Trade not found', 'err');
    const j = (await DB.get('journal', tradeId)) || { id: tradeId, session_id: t.session_id, trade_id: tradeId, setup: '', mistakes: [], emotions: [], rating: 0, tags: [], notes: '' }, shot = await DB.get('screenshots', tradeId) || { id: tradeId, session_id: t.session_id };
    const chips = (arr, sel, id) => `<div class="chips" id="${id}">${arr.map((x) => `<span class="chip ${sel.includes(x) ? 'on' : ''}" data-v="${esc(x)}">${esc(x)}</span>`).join('')}</div>`;
    const res = await U.modal({ title: `${t.symbol} ${t.side.toUpperCase()} · ${t.pnl != null ? F.fmtMoney(t.pnl) : t.status}`, wide: true, html: `<div class="grid g2 keep1"><div class="frm">
      <div class="grid g3" style="font-size:12.5px"><div><span class="mut">Entry</span><br><b class="mono">${F.fmtP(t.entry_price)}</b><br><span class="mut">${F.fmtDT(t.entry_time)}</span></div><div><span class="mut">Exit</span><br><b class="mono">${F.fmtP(t.exit_price)}</b><br><span class="mut">${F.fmtDT(t.exit_time)}</span></div><div><span class="mut">SL / TP</span><br><b class="mono">${F.fmtP(t.sl)} / ${F.fmtP(t.tp)}</b><br><span class="mut">R ${t.r_multiple != null ? t.r_multiple : '–'} · ${esc(t.tf || '')}</span></div></div>
      <div><label class="f">Setup type</label><select class="in" id="js">${['', ...SETUPS].map((x) => `<option ${x === j.setup ? 'selected' : ''} value="${x}">${x || '— select —'}</option>`).join('')}</select></div>
      <div><label class="f">Mistakes</label>${chips(MISTAKES, j.mistakes, 'jm')}</div><div><label class="f">Emotions</label>${chips(EMOS, j.emotions, 'je')}</div>
      <div><label class="f">Rating</label><div class="chips" id="jr">${[1, 2, 3, 4, 5].map((n) => `<span class="chip ${j.rating >= n ? 'on' : ''}" data-v="${n}">★ ${n}</span>`).join('')}</div></div>
      <div><label class="f">Tags (comma separated)</label><input class="in" id="jt" value="${esc((j.tags || []).join(', '))}"></div><div><label class="f">Notes</label><textarea class="in" id="jn" rows="4">${esc(j.notes)}</textarea></div></div>
      <div class="frm"><div><label class="f">Chart screenshot (captured automatically on close)</label>${shot.auto ? `<img src="${shot.auto}" style="width:100%;border-radius:8px;border:1px solid var(--line)" alt="auto screenshot">` : '<div class="mut">No auto screenshot.</div>'}</div><div><label class="f">Attach your own screenshot</label><input type="file" id="jf" accept="image/*" class="in">${shot.user ? `<img id="jup" src="${shot.user}" style="width:100%;margin-top:8px;border-radius:8px;border:1px solid var(--line)" alt="attached">` : ''}</div></div></div>`,
      onOpen: (b) => { b.querySelectorAll('#jm .chip,#je .chip').forEach((c) => (c.onclick = () => c.classList.toggle('on'))); b.querySelectorAll('#jr .chip').forEach((c) => (c.onclick = () => { const v = +c.dataset.v; j.rating = j.rating === v ? v - 1 : v; b.querySelectorAll('#jr .chip').forEach((x) => x.classList.toggle('on', +x.dataset.v <= j.rating)); })); },
      buttons: [{ label: 'Cancel', value: null, cls: 'ghost' }, { label: 'Save journal', cls: 'pri', validate: async (b) => { try { j.setup = b.querySelector('#js').value; j.mistakes = [...b.querySelectorAll('#jm .chip.on')].map((x) => x.dataset.v); j.emotions = [...b.querySelectorAll('#je .chip.on')].map((x) => x.dataset.v); j.tags = b.querySelector('#jt').value.split(',').map((x) => x.trim()).filter(Boolean); j.notes = b.querySelector('#jn').value; const f = b.querySelector('#jf').files[0]; if (f) { shot.user = await U.imgToDataURL(f, 900); await DB.put('screenshots', shot); } await DB.put('journal', j); U.toast('Journal saved'); return true; } catch (e) { U.toast(e.message, 'err'); return false; } } }] });
    return res;
  };

  /* ================= TRADING HISTORY ================= */
  F.pages.history = async function (el) {
    const [trades, ses] = await Promise.all([A.trades(), A.sessions()]); const sn = Object.fromEntries(ses.map((s) => [s.id, A.sessionName(s)]));
    let f = { q: '', sid: '', side: '', res: '', from: '', to: '' }, page = 0, sel = new Set(); const PS = 25;
    const draw = () => {
      let list = trades.filter((t) => t.status !== 'cancelled').sort((a, b) => (b.exit_time || b.entry_time || b.created_time || 0) - (a.exit_time || a.entry_time || a.created_time || 0));
      list = list.filter((t) => (!f.q || (t.symbol + ' ' + (t.strategy || '')).toLowerCase().includes(f.q)) && (!f.sid || t.session_id === f.sid) && (!f.side || t.side === f.side) && (!f.res || (f.res === 'win' ? t.pnl > 0 : f.res === 'loss' ? t.pnl < 0 : t.status === f.res)) && (!f.from || (t.exit_time || 0) >= Date.parse(f.from) / 1000) && (!f.to || (t.exit_time || 0) <= Date.parse(f.to) / 1000 + 86400));
      const pages = Math.max(1, Math.ceil(list.length / PS)); page = Math.min(page, pages - 1); const rows = list.slice(page * PS, page * PS + PS);
      el.innerHTML = `<div class="pagehead"><div><h1>Trading History</h1><p>All simulated trades (${list.length}).</p></div><div class="acts"><button class="btn" id="cmp" ${sel.size === 2 ? '' : 'disabled'}>Compare 2 trades</button><button class="btn" id="exp" ${list.length ? '' : 'disabled'}>${icon('dl')} CSV</button></div></div>
      <div class="card" style="margin-bottom:12px"><div class="frm c4 k"><div><label class="f">Search</label><input class="in" id="fq" value="${esc(f.q)}" placeholder="symbol / strategy"></div><div><label class="f">Session</label><select class="in" id="fs"><option value="">All</option>${ses.map((s) => `<option value="${s.id}" ${f.sid === s.id ? 'selected' : ''}>${esc(A.sessionName(s))}</option>`).join('')}</select></div><div><label class="f">Side</label><select class="in" id="fd"><option value="">All</option><option value="buy" ${f.side === 'buy' ? 'selected' : ''}>Buy</option><option value="sell" ${f.side === 'sell' ? 'selected' : ''}>Sell</option></select></div><div><label class="f">Result</label><select class="in" id="fr"><option value="">All</option><option value="win" ${f.res === 'win' ? 'selected' : ''}>Winners</option><option value="loss" ${f.res === 'loss' ? 'selected' : ''}>Losers</option><option value="open" ${f.res === 'open' ? 'selected' : ''}>Open</option><option value="pending" ${f.res === 'pending' ? 'selected' : ''}>Pending</option></select></div><div><label class="f">From</label><input type="date" class="in" id="ff" value="${f.from}"></div><div><label class="f">To</label><input type="date" class="in" id="ft" value="${f.to}"></div></div></div>
      ${!trades.length ? `<div class="card">${U.empty('clock', 'No trades yet', 'Place a trade in the Replay Workspace — every trade is saved here.', '<a class="btn pri" href="#/bt/workspace">Open workspace</a>')}</div>` : !list.length ? '<div class="card"><div class="empty">No trades match the filters.</div></div>' : `<div class="tw"><table class="t"><thead><tr><th></th><th>Session</th><th>Symbol</th><th>Side</th><th>Size</th><th>Entry</th><th>Exit</th><th>SL</th><th>TP</th><th>Exit by</th><th>Gross</th><th>Costs</th><th>Net</th><th>R</th><th>Status</th></tr></thead><tbody>${rows.map((t) => `<tr class="click" data-id="${t.id}"><td><input type="checkbox" class="sk" ${sel.has(t.id) ? 'checked' : ''}></td><td class="mut">${esc(sn[t.session_id] || '–')}</td><td>${esc(t.symbol)}</td><td><span class="tag ${t.side === 'buy' ? 'g' : 'r'}">${t.side}</span></td><td class="mono">${t.size}</td><td class="mono">${F.fmtP(t.entry_price)}</td><td class="mono">${F.fmtP(t.exit_price)}</td><td class="mono">${F.fmtP(t.sl)}</td><td class="mono">${F.fmtP(t.tp)}</td><td>${esc(t.exit_reason || '')}</td><td class="mono">${t.gross_pnl != null ? t.gross_pnl : '–'}</td><td class="mono">${t.status === 'closed' ? F.round((t.commission || 0) + (t.swap_cost || 0), 2) : '–'}</td><td class="mono">${t.pnl != null ? U.money(t.pnl) : '–'}</td><td class="mono">${t.r_multiple != null ? t.r_multiple : '–'}</td><td><span class="tag ${t.status === 'closed' ? '' : 'a'}">${t.status}</span></td></tr>`).join('')}</tbody></table></div>
      <div style="display:flex;gap:10px;align-items:center;justify-content:center;margin-top:12px"><button class="btn sm" id="pp" ${page ? '' : 'disabled'}>‹ Prev</button><span class="mut">Page ${page + 1} / ${pages}</span><button class="btn sm" id="pn" ${page < pages - 1 ? '' : 'disabled'}>Next ›</button></div>`}`;
      const bind = (id, k) => { const e = $(id, el); if (e) e.onchange = () => { f[k] = e.value.toLowerCase && k === 'q' ? e.value.toLowerCase() : e.value; page = 0; draw(); }; }; bind('#fq', 'q'); bind('#fs', 'sid'); bind('#fd', 'side'); bind('#fr', 'res'); bind('#ff', 'from'); bind('#ft', 'to');
      $$('tbody tr', el).forEach((r) => (r.onclick = async (e) => { const id = r.dataset.id; if (e.target.classList.contains('sk')) { e.target.checked ? sel.add(id) : sel.delete(id); if (sel.size > 2) { sel.delete(id); e.target.checked = false; U.toast('Only 2 trades can be compared', 'warn'); } $('#cmp', el).disabled = sel.size !== 2; return; } const t = trades.find((x) => x.id === id); if (t.status === 'closed') { await A.openJournal(id); } }));
      if ($('#pp', el)) { $('#pp', el).onclick = () => { page--; draw(); }; $('#pn', el).onclick = () => { page++; draw(); }; }
      if ($('#exp', el)) $('#exp', el).onclick = () => U.download('fxwolver-trades.csv', A.tradesCSV(list), 'text/csv');
      $('#cmp', el).onclick = async () => { const [a, b] = [...sel].map((id) => trades.find((t) => t.id === id)); const sa = await DB.get('screenshots', a.id), sb = await DB.get('screenshots', b.id); const col = (t, s) => `<div><h3>${esc(t.symbol)} ${t.side}</h3><table class="t">${[['Entry', F.fmtP(t.entry_price)], ['Exit', F.fmtP(t.exit_price)], ['SL', F.fmtP(t.sl)], ['TP', F.fmtP(t.tp)], ['Size', t.size], ['Net P/L', t.pnl], ['R', t.r_multiple], ['MFE', t.mfe], ['MAE', t.mae], ['Duration', U.dur(t.exit_time - t.entry_time)], ['Exit by', t.exit_reason], ['Timeframe', t.tf]].map((r) => `<tr><td class="mut">${r[0]}</td><td class="mono">${esc(r[1] == null ? '–' : r[1])}</td></tr>`).join('')}</table>${s && (s.auto || s.user) ? `<img src="${s.user || s.auto}" style="width:100%;margin-top:8px;border-radius:8px" alt="">` : ''}</div>`; U.modal({ title: 'Trade comparison', wide: true, html: `<div class="grid g2 keep1">${col(a, sa)}${col(b, sb)}</div>`, buttons: [{ label: 'Close', value: 1 }] }); };
    }; draw();
  };

  /* ================= JOURNAL ================= */
  F.pages.journal = async function (el) {
    const [trades, js] = await Promise.all([A.trades(), DB.list('journal')]); const tm = Object.fromEntries(trades.map((t) => [t.id, t])), list0 = js.filter((j) => tm[j.trade_id]);
    let f = { q: '', setup: '', rating: '', res: '' };
    const draw = () => {
      const list = list0.filter((j) => { const t = tm[j.trade_id]; return (!f.q || (j.notes + ' ' + (j.tags || []).join(' ') + ' ' + j.setup + ' ' + t.symbol).toLowerCase().includes(f.q)) && (!f.setup || j.setup === f.setup) && (!f.rating || j.rating >= +f.rating) && (!f.res || (f.res === 'win' ? t.pnl > 0 : t.pnl < 0)); }).sort((a, b) => (tm[b.trade_id].exit_time || 0) - (tm[a.trade_id].exit_time || 0));
      el.innerHTML = `<div class="pagehead"><div><h1>Trading Journal</h1><p>An automatic record of every closed trade. Add notes, mistakes and emotions.</p></div></div>
      <div class="card" style="margin-bottom:12px"><div class="frm c4"><div><label class="f">Search</label><input class="in" id="q" value="${esc(f.q)}" placeholder="notes, tags, symbol"></div><div><label class="f">Setup</label><select class="in" id="s"><option value="">All</option>${SETUPS.map((x) => `<option ${f.setup === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div><label class="f">Min rating</label><select class="in" id="r"><option value="">Any</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${f.rating == n ? 'selected' : ''}>${n}+</option>`).join('')}</select></div><div><label class="f">Result</label><select class="in" id="w"><option value="">All</option><option value="win" ${f.res === 'win' ? 'selected' : ''}>Winners</option><option value="loss" ${f.res === 'loss' ? 'selected' : ''}>Losers</option></select></div></div></div>
      ${!list0.length ? `<div class="card">${U.empty('book', 'Journal is empty', 'Whenever a simulated trade is closed, its journal entry is created here automatically.', '<a class="btn pri" href="#/bt/workspace">Replay Workspace</a>')}</div>` : !list.length ? '<div class="card"><div class="empty">No entries match.</div></div>' : `<div class="grid g3 keep1">${list.map((j) => { const t = tm[j.trade_id]; return `<div class="card click" data-id="${j.trade_id}" style="cursor:pointer"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(t.symbol)} <span class="tag ${t.side === 'buy' ? 'g' : 'r'}">${t.side}</span></b><b class="mono">${U.money(t.pnl)}</b></div><div class="mut" style="font-size:12px;margin:3px 0 8px">${F.fmtDT(t.entry_time)} → ${F.fmtDT(t.exit_time)} · R ${t.r_multiple != null ? t.r_multiple : '–'} · ${esc(t.tf || '')}</div><div>${stars(j.rating)}</div><div style="margin:6px 0">${j.setup ? `<span class="tag">${esc(j.setup)}</span> ` : ''}${(j.mistakes || []).map((m) => `<span class="tag r">${esc(m)}</span> `).join('')}${(j.tags || []).map((m) => `<span class="tag a">#${esc(m)}</span> `).join('')}</div><div class="mut" style="font-size:13px">${esc((j.notes || 'No notes — click to add.').slice(0, 130))}</div></div>`; }).join('')}</div>`}`;
      const b = (id, k) => { const e = $(id, el); if (e) e.oninput = e.onchange = () => { f[k] = e.value; if (k === 'q') { const p = e.selectionStart; draw(); const n = $('#q', el); n.focus(); n.setSelectionRange(p, p); } else draw(); }; }; b('#q', 'q'); b('#s', 'setup'); b('#r', 'rating'); b('#w', 'res');
      $$('.card[data-id]', el).forEach((c) => (c.onclick = async () => { if (await A.openJournal(c.dataset.id)) { const nj = await DB.get('journal', c.dataset.id); const i = list0.findIndex((x) => x.id === c.dataset.id); if (i >= 0) list0[i] = nj; draw(); } }));
    }; draw();
  };

  /* ================= ANALYTICS ================= */
  F.pages.analytics = async function (el) {
    const [trades, ses, S] = await Promise.all([A.trades(), A.sessions(), A.settingsGet()]), all = A.closed(trades);
    if (!all.length) { el.innerHTML = `<div class="pagehead"><div><h1>Analytics</h1></div></div><div class="card">${U.empty('bar', 'Trades required for analytics', 'At least one closed trade is required. All figures are calculated directly from saved trade records.', '<a class="btn pri" href="#/bt/workspace">Replay Workspace</a>')}</div>`; return; }
    const uniq = (fn) => Array.from(new Set(all.map(fn).filter(Boolean))).sort(); let f = { sym: '', tf: '', str: '', ses: '', side: '', sid: '', from: '', to: '', base: S.balance };
    const draw = () => {
      const cl = all.filter((t) => (!f.sym || t.symbol === f.sym) && (!f.tf || t.tf === f.tf) && (!f.str || (t.strategy || 'Manual') === f.str) && (!f.ses || tradeSession(t) === f.ses) && (!f.side || t.side === f.side) && (!f.sid || t.session_id === f.sid) && (!f.from || t.exit_time >= Date.parse(f.from) / 1000) && (!f.to || t.exit_time <= Date.parse(f.to) / 1000 + 86400));
      const sel = (id, k, opts, lbl) => `<div><label class="f">${lbl}</label><select class="in" id="${id}"><option value="">All</option>${opts.map((o) => `<option ${f[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
      const st = F.stats(cl, f.base);
      el.innerHTML = `<div class="pagehead"><div><h1>Analytics</h1><p>${cl.length} trades · all figures are computed from your saved trade records.</p></div></div>
      <div class="card" style="margin-bottom:14px"><div class="frm c4">${sel('fy', 'sym', uniq((t) => t.symbol), 'Instrument')}${sel('ft', 'tf', uniq((t) => t.tf), 'Timeframe')}${sel('fst', 'str', uniq((t) => t.strategy || 'Manual'), 'Strategy')}${sel('fse', 'ses', F.SESSIONS.map((s) => s.k), 'Trading session')}${sel('fd', 'side', ['buy', 'sell'], 'Direction')}<div><label class="f">Backtest</label><select class="in" id="fb"><option value="">All</option>${ses.map((s) => `<option value="${s.id}" ${f.sid === s.id ? 'selected' : ''}>${esc(A.sessionName(s))}</option>`).join('')}</select></div><div><label class="f">From</label><input type="date" class="in" id="ff" value="${f.from}"></div><div><label class="f">To</label><input type="date" class="in" id="ftt" value="${f.to}"></div><div><label class="f">Base balance (for % drawdown)</label><input type="number" class="in" id="fbase" value="${f.base}"></div></div></div>
      ${!cl.length ? '<div class="card"><div class="empty">No trades in this filter.</div></div>' : `
      <div class="grid g6 k2" style="margin-bottom:12px">${U.kpi('Total trades', st.n)}${U.kpi('Win rate', F.round(st.wr, 1) + '%')}${U.kpi('Loss rate', F.round(100 - st.wr, 1) + '%')}${U.kpi('Profit factor', U.pf(st.pf))}${U.kpi('Expectancy', F.fmtMoney(st.expectancy), 'per trade')}${U.kpi('Net P/L', U.money(st.net))}</div>
      <div class="grid g6 k2" style="margin-bottom:14px">${U.kpi('Avg win', U.money(st.avgWin))}${U.kpi('Avg loss', U.money(st.avgLoss))}${U.kpi('Avg R', F.round(st.avgR, 2))}${U.kpi('Max drawdown', F.round(st.maxDDpct, 2) + '%', F.fmtMoney(st.maxDD))}${U.kpi('Max win streak', st.maxWinStreak)}${U.kpi('Max loss streak', st.maxLossStreak)}</div>
      <div class="grid g4 k2" style="margin-bottom:14px">${U.kpi('Long', F.round(st.long.wr, 0) + '% WR', st.long.n + ' trades · ' + F.fmtMoney(st.long.net))}${U.kpi('Short', F.round(st.short.wr, 0) + '% WR', st.short.n + ' trades · ' + F.fmtMoney(st.short.net))}${U.kpi('Avg MFE / MAE', F.fmtMoney(cl.reduce((a, t) => a + (t.mfe || 0), 0) / cl.length) + ' / ' + F.fmtMoney(cl.reduce((a, t) => a + (t.mae || 0), 0) / cl.length), 'max favourable / adverse excursion')}${U.kpi('Avg holding', U.dur(cl.reduce((a, t) => a + (t.exit_time - (t.entry_time || t.exit_time)), 0) / cl.length), 'win ' + U.dur(st.avgDurWin) + ' · loss ' + U.dur(st.avgDurLoss))}</div>
      <div class="grid g2" style="margin-bottom:14px"><div class="card"><h3>Equity curve</h3><div class="chartbox"><canvas id="a1"></canvas></div></div><div class="card"><h3>Drawdown curve (%)</h3><div class="chartbox"><canvas id="a2"></canvas></div></div></div>
      <div class="grid g2" style="margin-bottom:14px"><div class="card"><h3>Daily performance (weekday)</h3><div class="chartbox"><canvas id="a3"></canvas></div></div><div class="card"><h3>Hourly performance (UTC)</h3><div class="chartbox"><canvas id="a4"></canvas></div></div></div>
      <div class="grid g2" style="margin-bottom:14px"><div class="card"><h3>Win / loss distribution ($)</h3><div class="chartbox"><canvas id="a5"></canvas></div></div><div class="card"><h3>Risk/reward (R-multiple) distribution</h3><div class="chartbox"><canvas id="a6"></canvas></div></div></div>
      <div class="card" style="margin-bottom:14px"><h3>Monthly heatmap (net P/L $)</h3><div style="overflow:auto">${U.heatMonths(cl)}</div></div>
      <div class="grid g2 keep1">${[['Instrument', (t) => t.symbol], ['Strategy', (t) => t.strategy || 'Manual'], ['Session', tradeSession], ['Timeframe', tfLabel]].map(([n, fn]) => { const o = group(cl, fn); return `<div class="card"><h3>By ${n}</h3><table class="t"><thead><tr><th>${n}</th><th>Trades</th><th>Win %</th><th>Net</th></tr></thead><tbody>${Object.keys(o).sort((a, b) => o[b].net - o[a].net).map((k) => `<tr><td>${esc(k)}</td><td>${o[k].n}</td><td>${F.round((o[k].w / o[k].n) * 100, 0)}%</td><td>${U.money(F.round(o[k].net, 2))}</td></tr>`).join('')}</tbody></table></div>`; }).join('')}</div>`}`;
      const sel2 = (id, k) => { const e = $(id, el); if (e) e.onchange = () => { f[k] = e.value; draw(); }; }; sel2('#fy', 'sym'); sel2('#ft', 'tf'); sel2('#fst', 'str'); sel2('#fse', 'ses'); sel2('#fd', 'side'); sel2('#fb', 'sid'); sel2('#ff', 'from'); sel2('#ftt', 'to'); sel2('#fbase', 'base'); if ($('#fbase', el)) $('#fbase', el).onchange = (e) => { f.base = parseFloat(e.target.value) || S.balance; draw(); };
      if (!cl.length) return; const C = st.curve; U.lineChart($('#a1'), [{ data: C.map((p, i) => ({ x: i, y: p.eq })), color: '#3b82f6', fill: true }], { fmt: (v) => F.round(v, 0), xfmt: (x) => '#' + Math.round(x) }); U.lineChart($('#a2'), [{ data: C.map((p, i) => ({ x: i, y: -p.dd })), color: '#ef4444', fill: true }], { fillBase: 0, fmt: (v) => F.round(v, 1) + '%', xfmt: (x) => '#' + Math.round(x) });
      U.barChart($('#a3'), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], st.byWeekday.map((v) => F.round(v, 2))); U.barChart($('#a4'), st.byHour.map((_, i) => i), st.byHour.map((v) => F.round(v, 2)));
      const h = hist(cl.map((t) => t.pnl), 14); U.barChart($('#a5'), h.labels, h.counts, { color: (v, i) => (h.mid[i] >= 0 ? '#22c55e' : '#ef4444'), fmt: (v) => v }); const rs = st.rs, hr = hist(rs, 12); U.barChart($('#a6'), hr.labels, hr.counts, { color: (v, i) => (hr.mid[i] >= 0 ? '#22c55e' : '#ef4444'), fmt: (v) => v });
    }; draw(); const rs = () => draw(); let tm; const dbn = () => { clearTimeout(tm); tm = setTimeout(rs, 150); }; window.addEventListener('resize', dbn); return () => window.removeEventListener('resize', dbn);
  };

  /* ================= SCREENSHOT GALLERY ================= */
  F.pages.gallery = async function (el) {
    const [shots, trades] = await Promise.all([DB.list('screenshots'), A.trades()]), tm = Object.fromEntries(trades.map((t) => [t.id, t])), list = shots.filter((s) => (s.auto || s.user) && tm[s.id]).sort((a, b) => (tm[b.id].exit_time || 0) - (tm[a.id].exit_time || 0));
    el.innerHTML = `<div class="pagehead"><div><h1>Screenshot Gallery</h1><p>An automatic chart screenshot on every trade close, plus your attached images.</p></div></div>${list.length ? `<div class="grid g4">${list.map((s) => { const t = tm[s.id]; return `<div class="card" data-id="${s.id}" style="padding:8px;cursor:pointer"><img src="${s.user || s.auto}" style="width:100%;border-radius:8px;display:block" alt="${esc(t.symbol)}"><div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12.5px"><b>${esc(t.symbol)} ${t.side}</b><span class="mono">${U.money(t.pnl)}</span></div><div class="mut" style="font-size:11.5px">${F.fmtDT(t.exit_time)}</div></div>`; }).join('')}</div>` : `<div class="card">${U.empty('img', 'No screenshots', 'A chart screenshot is added here automatically when a trade closes (toggle in Settings). You can also attach your own image in the Journal.', '')}</div>`}`;
    $$('.card[data-id]', el).forEach((c) => (c.onclick = () => A.openJournal(c.dataset.id)));
  };
})(window);
