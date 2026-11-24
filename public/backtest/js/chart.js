/* FX WOLVER – canvas chart engine: candles, indicators, drawings (create/select/move/resize), SMC overlays, trade lines (draggable SL/TP) */
(function (g) {
  const F = g.FXW;
  const AXW = 66, AXH = 22;

  /* drawing type registry: need = number of points; cat = render category */
  F.DRAW_TYPES = {
    trend: { need: 2, cat: 'line', name: 'Trendline', color: '#3b82f6' },
    ray: { need: 2, cat: 'ray', name: 'Ray', color: '#7aa7f7' },
    hline: { need: 1, cat: 'hline', name: 'Horizontal line', color: '#f5b942' },
    vline: { need: 1, cat: 'vline', name: 'Vertical line', color: '#8795ad' },
    rect: { need: 2, cat: 'rect', name: 'Rectangle', color: '#3b82f6' },
    zone: { need: 2, cat: 'band', name: 'Support / Resistance zone', color: '#a78bfa' },
    fibret: { need: 2, cat: 'fib', name: 'Fibonacci retracement', color: '#f5b942' },
    fibext: { need: 3, cat: 'fibx', name: 'Fibonacci extension', color: '#fb923c' },
    text: { need: 1, cat: 'text', name: 'Text', color: '#e6ebf5' },
    longpos: { need: 3, cat: 'pos', name: 'Long position', color: '#22c55e', dir: 1 },
    shortpos: { need: 3, cat: 'pos', name: 'Short position', color: '#ef4444', dir: -1 },
    ob: { need: 2, cat: 'rect', name: 'Order Block', color: '#3b82f6', label: 'OB', smc: 1 },
    fvg: { need: 2, cat: 'rect', name: 'Fair Value Gap', color: '#a78bfa', label: 'FVG', smc: 1 },
    mit: { need: 2, cat: 'rect', name: 'Mitigation zone', color: '#64748b', label: 'MIT', smc: 1 },
    pd: { need: 2, cat: 'pd', name: 'Premium / Discount', color: '#8795ad', label: 'P/D', smc: 1 },
    liq: { need: 1, cat: 'hline', name: 'Liquidity level', color: '#f472b6', label: 'LIQ', dash: 1, smc: 1 },
    eqh: { need: 2, cat: 'line', name: 'Equal highs', color: '#f472b6', label: 'EQH', dash: 1, smc: 1 },
    eql: { need: 2, cat: 'line', name: 'Equal lows', color: '#f472b6', label: 'EQL', dash: 1, smc: 1 },
    bos: { need: 2, cat: 'line', name: 'BOS', color: '#22d3ee', label: 'BOS', smc: 1 },
    choch: { need: 2, cat: 'line', name: 'CHoCH', color: '#fb923c', label: 'CHoCH', smc: 1 },
    swing: { need: 1, cat: 'text', name: 'Swing point', color: '#e6ebf5', label: 'HH', smc: 1 },
  };
  const FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const FIBX = [0, 0.618, 1, 1.272, 1.618, 2, 2.618];

  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const niceStep = (range, n) => { const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; };
  const dist2seg = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy; let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); };

  class Chart {
    constructor(el, o) {
      this.el = el; this.o = Object.assign({ digits: 5, up: '#22c55e', down: '#ef4444', bg: '#070d1a', grid: true, volume: true, magnet: false, tfSec: 60 }, o || {});
      this.cv = document.createElement('canvas'); el.appendChild(this.cv); this.ctx = this.cv.getContext('2d');
      this.data = { arr: [], n: 0, last: null }; this.barW = 9; this.viewStart = 0; this.follow = true; this.rightPad = 8;
      this.events = []; this.inds = []; this.indCalc = []; this.trades = []; this.drawings = []; this.auto = null; this.tool = null; this.sel = null; this.pending = null; this.yMan = null;
      this.mouse = null; this.W = 0; this.H = 0; this.dpr = 1; this.layout = null; this.hoverIdx = null; this.ptrs = new Map(); this.drag = null; this.dirty = false; this.activeTradeDrag = null;
      this._bind(); this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(el); this.resize();
    }
    destroy() { this._ro.disconnect(); this.cv.remove(); }
    /* ----- data ----- */
    bar(i) { const d = this.data; return i === d.n - 1 ? d.last : d.arr[i]; }
    get n() { return this.data.n; }
    setData(data, tfSec) {
      const prevN = this.data.n; this.data = data; if (tfSec) this.o.tfSec = tfSec;
      if (this.follow && prevN > 0 && data.n !== prevN) { /* keep right edge stuck to last bar */ this.viewStart = data.n - this.visBars() + this.rightPad; }
      else if (prevN === 0) this.scrollToEnd();
      this._recalc(); this.draw();
    }
    visBars() { return Math.max(5, (this.W - AXW) / this.barW); }
    setVisBars(n) { n = Math.max(10, n); this.barW = Math.min(60, Math.max(0.6, (this.W - AXW) / n)); this.follow = true; this.scrollToEnd(); }
    scrollToEnd() { this.follow = true; this.viewStart = this.n - this.visBars() + this.rightPad; this.draw(); }
    setIndicators(list) { this.inds = list; this._recalc(); this.draw(); }
    _recalc() {
      const n = this.n, W = Math.min(n, 3000), off = n - W; this.iOff = off; const cs = new Array(W);
      for (let i = 0; i < W; i++) cs[i] = this.bar(off + i);
      this.indCalc = this.inds.filter((x) => x.visible !== false).map((ind) => ({ ind, r: F.computeIndicator(ind, cs), cs }));
    }
    setTrades(t) { this.trades = t; this.draw(); }
    setEvents(e) { this.events = e || []; this.draw(); }
    setDrawings(d) { this.drawings = d; this.draw(); }
    setAuto(a) { this.auto = a; this.draw(); }
    setOptions(o) { Object.assign(this.o, o); this.draw(); }
    setTool(t) { this.tool = t; this.pending = null; this.cv.style.cursor = t ? 'crosshair' : 'default'; this.draw(); }
    resize() { const r = this.el.getBoundingClientRect(); this.dpr = Math.min(2, window.devicePixelRatio || 1); this.W = Math.max(50, r.width); this.H = Math.max(50, r.height); this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr; this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); if (this.follow) this.viewStart = this.n - this.visBars() + this.rightPad; this.draw(); }
    draw() { if (this.dirty) return; this.dirty = true; requestAnimationFrame(() => { this.dirty = false; try { this._paint(); } catch (e) { console.error('chart paint', e); } }); }

    /* ----- coordinate maps ----- */
    idxOfT(t) {
      const n = this.n; if (!n) return 0; const first = this.bar(0).t;
      if (t <= first) return (t - first) / this.o.tfSec;
      let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.bar(m).t <= t) lo = m; else hi = m - 1; }
      if (lo === n - 1) return lo + (t - this.bar(lo).t) / this.o.tfSec;
      const a = this.bar(lo).t, b = this.bar(lo + 1).t; return lo + (t - a) / (b - a);
    }
    tOfIdx(f) {
      const n = this.n; if (!n) return 0; const i = Math.floor(f);
      if (i < 0) return this.bar(0).t + f * this.o.tfSec; if (i >= n - 1) return this.bar(n - 1).t + (f - (n - 1)) * this.o.tfSec;
      return this.bar(i).t + (f - i) * (this.bar(i + 1).t - this.bar(i).t);
    }
    xOfI(i) { return (i - this.viewStart) * this.barW + this.barW / 2; }
    iOfX(x) { return (x - this.barW / 2) / this.barW + this.viewStart; }
    xOfT(t) { return this.xOfI(this.idxOfT(t)); }
    tOfX(x) { return this.tOfIdx(this.iOfX(x)); }
    yOfP(p, pane) { const L = pane || this.layout.price; return L.top + ((L.hi - p) / (L.hi - L.lo)) * L.h; }
    pOfY(y, pane) { const L = pane || this.layout.price; return L.hi - ((y - L.top) / L.h) * (L.hi - L.lo); }
    getRightTime() { return this.tOfIdx(this.viewStart + (this.W - AXW) / this.barW - 1); }
    setRightTime(t) { this.follow = false; this.viewStart = this.idxOfT(t) - (this.W - AXW) / this.barW + 1; this.draw(); }

    /* ----- layout & scale ----- */
    _layout() {
      const subs = this.indCalc.filter((c) => c.r.sub), H = this.H - AXH, subH = subs.length ? Math.min(0.42 * H, subs.length * 0.2 * H) / subs.length : 0, priceH = H - subH * subs.length;
      const i0 = Math.max(0, Math.floor(this.viewStart) - 1), i1 = Math.min(this.n - 1, Math.ceil(this.viewStart + this.visBars()));
      let hi = -Infinity, lo = Infinity;
      for (let i = i0; i <= i1; i++) { const b = this.bar(i); if (b.h > hi) hi = b.h; if (b.l < lo) lo = b.l; }
      if (!isFinite(hi)) { hi = 1; lo = 0; }
      if (hi === lo) { hi += 0.0005; lo -= 0.0005; }
      if (this.yMan) { hi = this.yMan.hi; lo = this.yMan.lo; } else { const pad = (hi - lo) * 0.08; hi += pad; lo -= pad; if (this.o.volume) lo -= (hi - lo) * 0.12; }
      const price = { top: 0, h: priceH, hi, lo, kind: 'price' }, panes = [price]; let y = priceH;
      for (const c of subs) { panes.push({ top: y, h: subH, c, kind: 'sub' }); y += subH; }
      this.layout = { price, panes, i0, i1, plotW: this.W - AXW, H };
    }

    /* ----- paint ----- */
    _paint() {
      const ctx = this.ctx, W = this.W, H = this.H; ctx.fillStyle = this.o.bg; ctx.fillRect(0, 0, W, H);
      if (!this.n) { ctx.fillStyle = '#5a6a86'; ctx.font = '13px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Loading data…', W / 2, H / 2); return; }
      this._layout(); const L = this.layout, P = L.price, plotW = L.plotW;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, plotW, H - AXH); ctx.clip();
      // grid + price axis ticks
      const step = niceStep(P.hi - P.lo, Math.max(3, P.h / 70)), d = this.o.digits;
      ctx.font = '11px "JetBrains Mono",monospace'; ctx.lineWidth = 1;
      if (this.o.grid) { ctx.strokeStyle = '#0f1c36'; ctx.beginPath(); for (let p = Math.ceil(P.lo / step) * step; p < P.hi; p += step) { const y = Math.round(this.yOfP(p)) + 0.5; ctx.moveTo(0, y); ctx.lineTo(plotW, y); } ctx.stroke(); }
      // time grid
      const tl = this._timeTicks(); if (this.o.grid) { ctx.strokeStyle = '#0c1830'; ctx.beginPath(); for (const k of tl) { ctx.moveTo(Math.round(k.x) + 0.5, 0); ctx.lineTo(Math.round(k.x) + 0.5, H - AXH); } ctx.stroke(); }
      // volume overlay
      if (this.o.volume && !this.indCalc.some((c) => c.r.volume)) { let mv = 0; for (let i = L.i0; i <= L.i1; i++) mv = Math.max(mv, this.bar(i).v || 0); if (mv > 0) for (let i = L.i0; i <= L.i1; i++) { const b = this.bar(i), h = ((b.v || 0) / mv) * P.h * 0.12, x = this.xOfI(i); ctx.fillStyle = hexA(b.c >= b.o ? this.o.up : this.o.down, 0.28); ctx.fillRect(x - this.barW * 0.35, P.h - h, Math.max(1, this.barW * 0.7), h); } }
      if (this.o.symbol) { const Lp = this.layout.price; ctx.save(); ctx.font = `800 ${Math.max(28, Math.min(120, Lp.h * 0.2))}px Sora, Inter, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(160,185,235,0.05)'; ctx.fillText(this.o.symbol, this.layout.plotW / 2, Lp.top + Lp.h / 2); ctx.restore(); }
      // SMC auto overlay beneath candles
      if (this.auto) this._paintAuto(ctx, P);
      this._paintDrawings(ctx, true);
      // candles
      const w = Math.max(1, Math.floor(this.barW * 0.72)), up = this.o.up, dn = this.o.down, sty = this.o.style || 'candle';
      if (sty === 'line' || sty === 'area') {
        ctx.beginPath(); let fx = null, lx = null;
        for (let i = L.i0; i <= L.i1; i++) { const x = this.xOfI(i) + 0.5, y = this.yOfP(this.bar(i).c); if (fx === null) { fx = x; ctx.moveTo(x, y); } else ctx.lineTo(x, y); lx = x; }
        ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.lineWidth = 1;
        if (sty === 'area' && fx !== null) { ctx.lineTo(lx, (P.top + P.h)); ctx.lineTo(fx, (P.top + P.h)); ctx.closePath(); const g = ctx.createLinearGradient(0, 0, 0, P.top + P.h); g.addColorStop(0, '#3b82f655'); g.addColorStop(1, '#3b82f600'); ctx.fillStyle = g; ctx.fill(); }
      } else {
        let ha = null; if (sty === 'ha') { const st = Math.max(0, L.i0 - 150); for (let i = st; i <= L.i1; i++) { const b = this.bar(i), c = (b.o + b.h + b.l + b.c) / 4, o = ha ? (ha.o + ha.c) / 2 : (b.o + b.c) / 2; ha = { o, c, h: Math.max(b.h, o, c), l: Math.min(b.l, o, c) }; if (i >= L.i0) (this._ha || (this._ha = {}))[i] = ha; } }
        for (let i = L.i0; i <= L.i1; i++) {
          const b = sty === 'ha' ? this._ha[i] : this.bar(i), x = Math.round(this.xOfI(i)), isUp = b.c >= b.o, col = isUp ? up : dn;
          ctx.strokeStyle = col; ctx.fillStyle = col; const yh = this.yOfP(b.h), yl = this.yOfP(b.l), yo = this.yOfP(b.o), yc = this.yOfP(b.c);
          ctx.beginPath(); ctx.moveTo(x + 0.5, yh); ctx.lineTo(x + 0.5, yl); ctx.stroke();
          if (sty === 'bars') { const t = Math.max(2, w / 2); ctx.beginPath(); ctx.moveTo(x - t, yo); ctx.lineTo(x + 0.5, yo); ctx.moveTo(x + 0.5, yc); ctx.lineTo(x + t, yc); ctx.stroke(); }
          else if (this.barW >= 3) { const top = Math.min(yo, yc), bh = Math.max(1, Math.abs(yc - yo)), lx2 = Math.round(x - w / 2); if (sty === 'hollow' && isUp) { ctx.fillStyle = this.o.bg; ctx.fillRect(lx2, top, w, bh); ctx.strokeRect(lx2 + 0.5, top + 0.5, w - 1, Math.max(1, bh - 1)); } else ctx.fillRect(lx2, top, w, bh); }
        }
      }
      // overlay indicators
      for (const c of this.indCalc) if (!c.r.sub) this._paintOverlay(ctx, c, P);
      this._paintTrades(ctx, P);
      this._paintEvents(ctx, P);
      this._paintDrawings(ctx, false);
      // last price line
      const lb = this.bar(this.n - 1), ly = this.yOfP(lb.c); ctx.setLineDash([2, 3]); ctx.strokeStyle = lb.c >= lb.o ? up : dn; ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(plotW, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      // sub panes
      for (let k = 1; k < L.panes.length; k++) this._paintSub(ctx, L.panes[k]);
      // axes
      ctx.fillStyle = '#060c19'; ctx.fillRect(plotW, 0, AXW, H); ctx.fillRect(0, H - AXH, W, AXH); ctx.strokeStyle = '#16264a'; ctx.beginPath(); ctx.moveTo(plotW + 0.5, 0); ctx.lineTo(plotW + 0.5, H); ctx.moveTo(0, H - AXH + 0.5); ctx.lineTo(W, H - AXH + 0.5); ctx.stroke();
      ctx.fillStyle = '#8795ad'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (let p = Math.ceil(P.lo / step) * step; p < P.hi; p += step) { const y = this.yOfP(p); if (y > 8 && y < P.h - 8) ctx.fillText(F.fmtP(p, d), plotW + 6, y); }
      ctx.textAlign = 'center'; for (const k of tl) ctx.fillText(k.label, k.x, H - AXH / 2 + 1);
      for (let k = 1; k < L.panes.length; k++) { ctx.strokeStyle = '#16264a'; ctx.beginPath(); ctx.moveTo(0, L.panes[k].top + 0.5); ctx.lineTo(W, L.panes[k].top + 0.5); ctx.stroke(); }
      this._tag(ctx, plotW, ly, F.fmtP(lb.c, d), lb.c >= lb.o ? up : dn, '#fff');
      this._paintLegend(ctx);
      this._paintCross(ctx);
    }
    _tag(ctx, x, y, text, bg, fg) { ctx.fillStyle = bg; ctx.fillRect(x, y - 9, AXW, 18); ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '11px "JetBrains Mono",monospace'; ctx.fillText(text, x + 6, y + 0.5); }
    _timeTicks() {
      const out = [], L = this.layout, minGap = 90, i0 = L.i0, i1 = L.i1; let lastX = -999; const tf = this.o.tfSec;
      for (let i = i0; i <= i1; i++) {
        const b = this.bar(i), d = new Date(b.t * 1000), pv = i > 0 ? new Date(this.bar(i - 1).t * 1000) : null; let major = false, label = '';
        const z = (x) => String(x).padStart(2, '0');
        if (!pv || d.getUTCDate() !== pv.getUTCDate()) { major = true; label = tf >= 86400 * 28 ? d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) : tf >= 86400 ? z(d.getUTCDate()) + '/' + z(d.getUTCMonth() + 1) : z(d.getUTCDate()) + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]; }
        else if (tf < 86400) { const step = Math.max(1, Math.round((minGap / this.barW) * tf / 60)); const mins = d.getUTCHours() * 60 + d.getUTCMinutes(); if (mins % Math.max(5, Math.ceil(step / 5) * 5) === 0) label = z(d.getUTCHours()) + ':' + z(d.getUTCMinutes()); }
        if (label) { const x = this.xOfI(i); if (x - lastX >= (major ? 50 : minGap)) { out.push({ x, label, major }); lastX = x; } }
      }
      return out;
    }
    _paintOverlay(ctx, c, P) {
      const { r, ind } = c, off = this.iOff, L = this.layout; ctx.lineWidth = 1.4;
      if (r.fill) { ctx.fillStyle = hexA(ind.color || '#8795ad', 0.07); ctx.beginPath(); let started = false; for (let i = Math.max(L.i0, off); i <= L.i1; i++) { const v = r.lines[r.fill[0]][i - off]; if (!isFinite(v)) continue; const x = this.xOfI(i), y = this.yOfP(v); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); } for (let i = L.i1; i >= Math.max(L.i0, off); i--) { const v = r.lines[r.fill[1]][i - off]; if (isFinite(v)) ctx.lineTo(this.xOfI(i), this.yOfP(v)); } ctx.fill(); }
      r.lines.forEach((arr, li) => { ctx.strokeStyle = ind.color || '#7aa7f7'; ctx.globalAlpha = r.fill && li === 1 ? 0.6 : 1; ctx.beginPath(); let st = false; for (let i = Math.max(L.i0, off); i <= L.i1; i++) { const v = arr[i - off]; if (!isFinite(v)) { st = false; continue; } const x = this.xOfI(i), y = this.yOfP(v); if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); } ctx.stroke(); ctx.globalAlpha = 1; });
    }
    _paintSub(ctx, pane) {
      const { c } = pane, { r, ind } = c, off = this.iOff, L = this.layout, plotW = L.plotW, top = pane.top, h = pane.h; let lo = Infinity, hi = -Infinity;
      const scan = (arr) => { for (let i = Math.max(L.i0, off); i <= L.i1; i++) { const v = arr[i - off]; if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } } };
      if (r.volume) { hi = 0; lo = 0; for (let i = L.i0; i <= L.i1; i++) hi = Math.max(hi, this.bar(i).v || 0); if (!hi) { hi = 1; } } else { r.lines.forEach(scan); if (r.hist) scan(r.hist); if (r.range) { lo = r.range[0]; hi = r.range[1]; } }
      if (!isFinite(lo) || lo === hi) { lo = 0; hi = 1; } const pad = r.range ? 0 : (hi - lo) * 0.1; lo -= pad; hi += pad; const y = (v) => top + 4 + ((hi - v) / (hi - lo)) * (h - 8);
      ctx.save(); ctx.beginPath(); ctx.rect(0, top, plotW, h); ctx.clip();
      if (r.levels) { ctx.strokeStyle = '#1d3260'; ctx.setLineDash([3, 3]); for (const lv of r.levels) { ctx.beginPath(); ctx.moveTo(0, y(lv)); ctx.lineTo(plotW, y(lv)); ctx.stroke(); } ctx.setLineDash([]); }
      if (r.volume) for (let i = L.i0; i <= L.i1; i++) { const b = this.bar(i); ctx.fillStyle = hexA(b.c >= b.o ? this.o.up : this.o.down, 0.55); const yy = y(b.v || 0); ctx.fillRect(this.xOfI(i) - this.barW * 0.35, yy, Math.max(1, this.barW * 0.7), top + h - 4 - yy); }
      if (r.hist) for (let i = Math.max(L.i0, off); i <= L.i1; i++) { const v = r.hist[i - off]; if (!isFinite(v)) continue; ctx.fillStyle = v >= 0 ? hexA(this.o.up, 0.6) : hexA(this.o.down, 0.6); const y0 = y(0), y1 = y(v); ctx.fillRect(this.xOfI(i) - this.barW * 0.3, Math.min(y0, y1), Math.max(1, this.barW * 0.6), Math.abs(y1 - y0)); }
      const cols = [ind.color || '#a78bfa', '#f5b942', '#22d3ee']; ctx.lineWidth = 1.3;
      r.lines.forEach((arr, li) => { ctx.strokeStyle = cols[li % 3]; ctx.beginPath(); let st = false; for (let i = Math.max(L.i0, off); i <= L.i1; i++) { const v = arr[i - off]; if (!isFinite(v)) { st = false; continue; } const px = this.xOfI(i), py = y(v); if (!st) { ctx.moveTo(px, py); st = true; } else ctx.lineTo(px, py); } ctx.stroke(); });
      ctx.restore();
      ctx.fillStyle = '#8795ad'; ctx.font = '10.5px "JetBrains Mono",monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const lastI = this.n - 1 - off; const vals = r.volume ? [this.bar(this.n - 1).v] : r.lines.map((a) => a[lastI]);
      ctx.fillText(F.INDICATORS[ind.type].name + ' ' + Object.values(ind.params || {}).join(',') + '  ' + vals.filter(isFinite).map((v) => F.round(v, 4)).join('  '), 8, top + 11);
      ctx.fillStyle = '#6b7c99'; ctx.fillText(F.round(hi, 3), L.plotW + 6, top + 10); ctx.fillText(F.round(lo, 3), L.plotW + 6, top + h - 8);
      pane.y = y; pane.lo = lo; pane.hi = hi;
    }
    _paintLegend(ctx) {
      const i = this.hoverIdx != null ? this.hoverIdx : this.n - 1; if (i < 0 || i >= this.n) return; const b = this.bar(i), d = this.o.digits, chg = b.o ? ((b.c - b.o) / b.o) * 100 : 0;
      ctx.font = '11.5px "JetBrains Mono",monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; let x = 8; const y = 34;
      const col = b.c >= b.o ? this.o.up : this.o.down;
      [['O', b.o], ['H', b.h], ['L', b.l], ['C', b.c]].forEach(([k, v]) => { ctx.fillStyle = '#5a6a86'; ctx.fillText(k, x, y); x += 10; ctx.fillStyle = col; const t = F.fmtP(v, d); ctx.fillText(t, x, y); x += ctx.measureText(t).width + 8; });
      ctx.fillStyle = col; ctx.fillText((chg >= 0 ? '+' : '') + chg.toFixed(2) + '%', x, y);
      x = 8; let yy = 50; const off = this.iOff;
      for (const c of this.indCalc) { if (c.r.sub) continue; const arr = c.r.lines, v = arr.map((a) => a[i - off]).filter(isFinite); if (!v.length) continue; ctx.fillStyle = c.ind.color || '#7aa7f7'; const t = F.INDICATORS[c.ind.type].name + ' ' + Object.values(c.ind.params || {}).join(',') + '  ' + v.map((q) => F.fmtP(q, d)).join(' '); ctx.fillText(t, x, yy); yy += 14; }
    }
    _paintCross(ctx) {
      const m = this.mouse; if (!m || this.drag && this.drag.type === 'pan' && this.ptrs.size > 1) return; const L = this.layout, plotW = L.plotW; if (m.x > plotW || m.y > this.H - AXH || m.x < 0 || m.y < 0) return;
      const i = Math.round(this.iOfX(m.x)); ctx.strokeStyle = '#4a6aa8'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); const sx = this.xOfI(i); ctx.moveTo(sx + 0.5, 0); ctx.lineTo(sx + 0.5, this.H - AXH); ctx.moveTo(0, m.y + 0.5); ctx.lineTo(plotW, m.y + 0.5); ctx.stroke(); ctx.setLineDash([]);
      const pane = L.panes.find((p) => m.y >= p.top && m.y < p.top + p.h) || L.price;
      if (pane.kind === 'price') this._tag(ctx, plotW, m.y, F.fmtP(this.pOfY(m.y), this.o.digits), '#1b3b78', '#fff');
      const t = this.tOfIdx(i); const lbl = F.fmtDT(t); ctx.font = '11px "JetBrains Mono",monospace'; const tw = ctx.measureText(lbl).width + 12; ctx.fillStyle = '#1b3b78'; ctx.fillRect(Math.max(0, Math.min(plotW - tw, sx - tw / 2)), this.H - AXH, tw, AXH); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lbl, Math.max(tw / 2, Math.min(plotW - tw / 2, sx)), this.H - AXH / 2 + 1);
    }

    _paintEvents(ctx, P) {
      if (!this.events.length) return; const plotW = this.layout.plotW; ctx.font = '600 10px Inter,sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; let lastX = -99;
      for (const e of this.events) { const x = this.xOfT(e.t); if (x < 0 || x > plotW) continue; const col = e.imp === 'high' ? '#ef4444' : e.imp === 'medium' ? '#f59e0b' : '#64748b'; ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, P.h); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, 6, 3, 0, 7); ctx.fill(); if (e.imp === 'high' && x - lastX > 60) { ctx.fillStyle = '#fca5a5'; ctx.fillText((e.cur ? e.cur + ' ' : '') + e.title.slice(0, 22), x + 5, 12); lastX = x; } }
    }
    /* ----- trades ----- */
    _paintTrades(ctx, P) {
      const plotW = this.layout.plotW, d = this.o.digits, tr = this.trades || [];
      const line = (y, col, text, dash) => { if (y < -20 || y > P.h + 20) return; ctx.strokeStyle = col; ctx.setLineDash(dash || []); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(plotW, Math.round(y) + 0.5); ctx.stroke(); ctx.setLineDash([]); ctx.font = '11px "JetBrains Mono",monospace'; const w = ctx.measureText(text).width + 12; ctx.fillStyle = col; ctx.fillRect(plotW - w - 6, y - 9, w, 18); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, plotW - w, y + 0.5); };
      for (const t of tr) {
        const drag = this.activeTradeDrag && this.activeTradeDrag.t === t ? this.activeTradeDrag : null;
        if (t.status === 'closed') {
          if (t.entry_time == null) continue; const x1 = this.xOfT(t.entry_time), x2 = this.xOfT(t.exit_time); if (x2 < -20 || x1 > plotW + 20) continue; const y1 = this.yOfP(t.entry_price), y2 = this.yOfP(t.exit_price), col = t.pnl >= 0 ? '#22c55e' : '#ef4444';
          ctx.strokeStyle = col; ctx.globalAlpha = 0.8; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
          ctx.fillStyle = t.side === 'buy' ? '#22c55e' : '#ef4444'; ctx.beginPath(); if (t.side === 'buy') { ctx.moveTo(x1, y1 + 3); ctx.lineTo(x1 - 5, y1 + 11); ctx.lineTo(x1 + 5, y1 + 11); } else { ctx.moveTo(x1, y1 - 3); ctx.lineTo(x1 - 5, y1 - 11); ctx.lineTo(x1 + 5, y1 - 11); } ctx.fill();
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x2, y2, 3.5, 0, 7); ctx.fill(); continue;
        }
        if (t.status === 'cancelled') continue;
        const ex = this.yOfP(t.entry_price), side = t.side === 'buy' ? 'BUY' : 'SELL', ic = t.side === 'buy' ? '#2563eb' : '#c2410c';
        if (t.status === 'open') { const pnl = t._float; line(ex, ic, side + ' ' + t.size + ' @' + F.fmtP(t.entry_price, d) + (pnl != null ? '  ' + (pnl >= 0 ? '+' : '') + F.round(pnl, 2) : ''), []); if (t.entry_time != null) { const x1 = this.xOfT(t.entry_time); ctx.fillStyle = ic; ctx.beginPath(); ctx.arc(x1, ex, 4, 0, 7); ctx.fill(); } }
        else line(ex, '#b45309', t.order_type.toUpperCase() + ' ' + side + ' ' + t.size + ' @' + F.fmtP(t.entry_price, d), [5, 4]);
        const slp = drag && drag.k === 'sl' ? drag.p : t.sl, tpp = drag && drag.k === 'tp' ? drag.p : t.tp;
        if (slp != null) line(this.yOfP(slp), '#b91c1c', 'SL ' + F.fmtP(slp, d), [6, 3]);
        if (tpp != null) line(this.yOfP(tpp), '#15803d', 'TP ' + F.fmtP(tpp, d), [6, 3]);
      }
    }

    /* ----- drawings ----- */
    _pts(dw) { return dw.points.map((q) => ({ x: this.xOfT(q.t), y: this.yOfP(q.p) })); }
    _paintDrawings(ctx, under) {
      const plotW = this.layout.plotW, P = this.layout.price;
      const list = this.drawings.slice(); if (this.pending && this.pending.preview) list.push(this.pending.preview);
      for (const dw of list) {
        const T = F.DRAW_TYPES[dw.type]; if (!T) continue; if (dw.visible === false) continue; const isBg = T.cat === 'rect' || T.cat === 'band' || T.cat === 'pd' || T.cat === 'pos'; if (under !== isBg) continue;
        const pts = this._pts(dw), col = dw.color || T.color, sel = this.sel === dw.id; ctx.lineWidth = dw.width || 1.5; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.setLineDash(T.dash ? [6, 4] : []); ctx.font = '11.5px Inter,sans-serif';
        const label = (txt, x, y) => { ctx.setLineDash([]); ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = '600 11px Inter,sans-serif'; ctx.fillText(txt, x, y); };
        switch (T.cat) {
          case 'line': case 'ray': { if (pts.length < 2) { if (pts[0]) { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 3, 0, 7); ctx.fill(); } break; } let [a, b] = pts; if (T.cat === 'ray') { const dx = b.x - a.x, dy = b.y - a.y; if (dx !== 0) { const k = (plotW + 50 - a.x) / dx; if (k > 0) b = { x: a.x + dx * k, y: a.y + dy * k }; } } ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); if (T.label || dw.text) label(dw.text || T.label, (a.x + b.x) / 2 - 12, Math.min(a.y, b.y) - 3); break; }
          case 'hline': { const y = pts[0].y; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(plotW, y); ctx.stroke(); label((dw.text || T.label || '') + ' ' + F.fmtP(dw.points[0].p, this.o.digits), 8, y - 2); break; }
          case 'vline': { const x = pts[0].x; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.layout.H); ctx.stroke(); if (dw.text) label(dw.text, x + 4, 14); break; }
          case 'rect': case 'band': case 'pd': { if (pts.length < 2) break; let x1 = Math.min(pts[0].x, pts[1].x), x2 = Math.max(pts[0].x, pts[1].x); const y1 = Math.min(pts[0].y, pts[1].y), y2 = Math.max(pts[0].y, pts[1].y); if (T.cat === 'band' || T.smc && dw.extend) x2 = plotW; ctx.setLineDash([]);
            if (T.cat === 'pd') { const mid = (y1 + y2) / 2; ctx.fillStyle = hexA('#ef4444', 0.12); ctx.fillRect(x1, y1, x2 - x1, mid - y1); ctx.fillStyle = hexA('#22c55e', 0.12); ctx.fillRect(x1, mid, x2 - x1, y2 - mid); ctx.strokeStyle = '#8795ad'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x1, mid); ctx.lineTo(x2, mid); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#fca5a5'; ctx.font = '600 10px Inter'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText('PREMIUM', x1 + 4, y1 + 3); ctx.fillStyle = '#86efac'; ctx.textBaseline = 'bottom'; ctx.fillText('DISCOUNT', x1 + 4, y2 - 3); ctx.fillStyle = '#8795ad'; ctx.fillText('EQ 50%', x1 + 4, mid - 2); }
            else { ctx.fillStyle = hexA(col, 0.16); ctx.fillRect(x1, y1, x2 - x1, y2 - y1); ctx.strokeStyle = hexA(col, 0.9); ctx.strokeRect(x1 + 0.5, y1 + 0.5, x2 - x1, y2 - y1); if (T.label || dw.text) label(dw.text || T.label, x1 + 4, y1 + 13); }
            break; }
          case 'fib': case 'fibx': { const lv = T.cat === 'fib' ? FIB : FIBX; if (pts.length < 2) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1] ? pts[1].x : pts[0].x, pts[1] ? pts[1].y : pts[0].y); ctx.stroke(); break; }
            const p0 = dw.points[0].p, p1 = dw.points[1].p, p2 = dw.points[2] ? dw.points[2].p : null; const xA = Math.min(pts[0].x, pts[1].x), xB = Math.max(pts[0].x, pts[1].x, T.cat === 'fibx' && pts[2] ? pts[2].x : 0);
            ctx.setLineDash([3, 4]); ctx.strokeStyle = hexA(col, 0.6); ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); if (pts[2]) ctx.lineTo(pts[2].x, pts[2].y); ctx.stroke(); ctx.setLineDash([]);
            const priceAt = (r) => (T.cat === 'fib' ? p1 + (p0 - p1) * r : (p2 != null ? p2 : p1) + (p1 - p0) * r);
            lv.forEach((r, k) => { const pr = priceAt(r), y = this.yOfP(pr); ctx.strokeStyle = hexA(col, 0.85); ctx.beginPath(); ctx.moveTo(xA, y); ctx.lineTo(xB, y); ctx.stroke(); ctx.fillStyle = col; ctx.font = '10.5px "JetBrains Mono"'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText((r * 100).toFixed(1) + '%  ' + F.fmtP(pr, this.o.digits), xA + 4, y - 2); if (k < lv.length - 1) { const y2 = this.yOfP(priceAt(lv[k + 1])); ctx.fillStyle = hexA(col, k % 2 ? 0.05 : 0.09); ctx.fillRect(xA, Math.min(y, y2), xB - xA, Math.abs(y2 - y)); } });
            break; }
          case 'text': { const p = pts[0]; ctx.setLineDash([]); ctx.fillStyle = col; ctx.font = '600 13px Inter,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(dw.text || (T.label || 'Text'), p.x, p.y); if (sel) { const w = ctx.measureText(dw.text || T.label || 'Text').width; ctx.strokeStyle = '#3b82f6'; ctx.strokeRect(p.x - 3, p.y - 10, w + 6, 20); } break; }
          case 'pos': { if (pts.length < 2) break; const long = T.dir > 0, e = dw.points[0].p, s = dw.points[1].p, tg = dw.points[2] ? dw.points[2].p : e + (e - s) * 2; const x1 = Math.min(pts[0].x, pts[1].x), x2 = Math.max(x1 + 60, pts[2] ? Math.max(pts[0].x, pts[1].x, pts[2].x) : x1 + 140), ye = this.yOfP(e), ys = this.yOfP(s), yt = this.yOfP(tg);
            ctx.setLineDash([]); ctx.fillStyle = hexA('#ef4444', 0.2); ctx.fillRect(x1, Math.min(ye, ys), x2 - x1, Math.abs(ys - ye)); ctx.fillStyle = hexA('#22c55e', 0.2); ctx.fillRect(x1, Math.min(ye, yt), x2 - x1, Math.abs(yt - ye)); ctx.strokeStyle = '#8795ad'; ctx.beginPath(); ctx.moveTo(x1, ye); ctx.lineTo(x2, ye); ctx.stroke();
            const risk = Math.abs(e - s), rew = Math.abs(tg - e), rr = risk ? rew / risk : 0, okSide = long ? s < e && tg > e : s > e && tg < e; ctx.fillStyle = '#e6ebf5'; ctx.font = '600 11px "JetBrains Mono"'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText((long ? 'LONG' : 'SHORT') + '  RR ' + rr.toFixed(2) + (okSide ? '' : '  ⚠ invalid sides'), x1 + 5, ye - 9);
            const spec = this.o.spec, mul = spec ? spec.contract : 1; ctx.fillStyle = '#fca5a5'; ctx.fillText('Stop ' + F.fmtP(s, this.o.digits) + '  (' + F.round(risk / (spec && spec.pip ? spec.pip : 1), 1) + (spec && spec.pip ? ' pips' : '') + ')', x1 + 5, ys + (ys > ye ? -9 : 9)); ctx.fillStyle = '#86efac'; ctx.fillText('Target ' + F.fmtP(tg, this.o.digits) + '  (' + F.round(rew / (spec && spec.pip ? spec.pip : 1), 1) + (spec && spec.pip ? ' pips' : '') + ')', x1 + 5, yt + (yt > ye ? -9 : 9)); break; }
        }
        ctx.setLineDash([]);
        if (sel) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; for (const p of pts) { ctx.beginPath(); ctx.rect(p.x - 4, p.y - 4, 8, 8); ctx.fill(); ctx.stroke(); } }
      }
      // pending first-click markers
      if (this.pending && !under) { ctx.fillStyle = '#3b82f6'; for (const q of this.pending.points) { ctx.beginPath(); ctx.arc(this.xOfT(q.t), this.yOfP(q.p), 4, 0, 7); ctx.fill(); } }
    }
    _paintAuto(ctx, P) {
      const a = this.auto, plotW = this.layout.plotW, d = this.o.digits; if (!a) return; const lbl = (txt, x, y, col) => { ctx.fillStyle = col; ctx.font = '600 10px Inter'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(txt, x, y); };
      const zone = (z, col, text) => { const x1 = this.xOfT(z.t), x2 = z.mitigated ? this.xOfT(z.mitT) : plotW; if (x2 < 0 || x1 > plotW) return; const y1 = this.yOfP(z.hi), y2 = this.yOfP(z.lo); ctx.fillStyle = hexA(col, z.mitigated ? 0.06 : 0.17); ctx.fillRect(x1, y1, x2 - x1, y2 - y1); ctx.strokeStyle = hexA(col, z.mitigated ? 0.25 : 0.7); ctx.setLineDash(z.mitigated ? [3, 3] : []); ctx.lineWidth = 1; ctx.strokeRect(x1 + 0.5, y1 + 0.5, x2 - x1, y2 - y1); ctx.setLineDash([]); lbl(text + (z.mitigated ? ' ✓' : ''), x1 + 3, y1 + 12, col); };
      if (a.fvg) for (const z of a.fvg) zone(z, z.dir === 'bull' ? '#22c55e' : '#ef4444', 'FVG');
      if (a.ob) for (const z of a.ob) zone(z, z.dir === 'bull' ? '#3b82f6' : '#f97316', 'OB');
      const ev = (list, name, col) => { if (list) for (const e of list) { const x1 = this.xOfT(e.fromT), x2 = this.xOfT(e.t), y = this.yOfP(e.level); if (x2 < 0 || x1 > plotW) continue; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.setLineDash([]); lbl(name, (x1 + x2) / 2 - 10, y - 2, col); } };
      ev(a.bos, 'BOS', '#22d3ee'); ev(a.choch, 'CHoCH', '#fb923c');
      if (a.eq) for (const e of a.eq) { const x1 = this.xOfT(e.t1), x2 = this.xOfT(e.t2), y = this.yOfP(e.p); ctx.strokeStyle = '#f472b6'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.setLineDash([]); lbl('EQ' + e.type, (x1 + x2) / 2 - 8, y - 2, '#f472b6'); }
      if (a.swings && a.showSwings) for (const s of a.swings) { const x = this.xOfT(s.t), y = this.yOfP(s.p); ctx.fillStyle = '#e6ebf5'; ctx.font = '9px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = s.type === 'H' ? 'bottom' : 'top'; ctx.fillText(s.type === 'H' ? '▲' : '▼', x, s.type === 'H' ? y - 2 : y + 2); }
      if (a.pd) { const y1 = this.yOfP(a.pd.hi), y2 = this.yOfP(a.pd.lo), ym = this.yOfP(a.pd.mid), x1 = Math.max(0, this.xOfT(a.pd.t)); ctx.fillStyle = hexA('#ef4444', 0.07); ctx.fillRect(x1, y1, plotW - x1, ym - y1); ctx.fillStyle = hexA('#22c55e', 0.07); ctx.fillRect(x1, ym, plotW - x1, y2 - ym); ctx.strokeStyle = '#64748b'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x1, ym); ctx.lineTo(plotW, ym); ctx.stroke(); ctx.setLineDash([]); lbl('EQ', plotW - 24, ym - 2, '#8795ad'); }
    }

    /* ----- hit testing / interaction ----- */
    _hitDrawing(x, y) {
      const tol = 7, plotW = this.layout.plotW;
      for (let k = this.drawings.length - 1; k >= 0; k--) {
        const dw = this.drawings[k], T = F.DRAW_TYPES[dw.type]; if (!T || dw.visible === false || dw.locked) continue; const pts = this._pts(dw);
        const sel = this.sel === dw.id; if (sel) for (let i = 0; i < pts.length; i++) if (Math.hypot(x - pts[i].x, y - pts[i].y) <= 10) return { dw, handle: i };
        let hit = false;
        switch (T.cat) {
          case 'line': hit = pts.length > 1 && dist2seg(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) <= tol; break;
          case 'ray': { if (pts.length < 2) break; const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y, kx = dx ? (plotW + 50 - pts[0].x) / dx : 1; hit = dist2seg(x, y, pts[0].x, pts[0].y, pts[0].x + dx * Math.max(1, kx), pts[0].y + dy * Math.max(1, kx)) <= tol; break; }
          case 'hline': hit = Math.abs(y - pts[0].y) <= tol; break; case 'vline': hit = Math.abs(x - pts[0].x) <= tol; break;
          case 'rect': case 'pd': case 'band': { if (pts.length < 2) break; let x1 = Math.min(pts[0].x, pts[1].x), x2 = Math.max(pts[0].x, pts[1].x); if (T.cat === 'band') x2 = plotW; hit = x >= x1 - tol && x <= x2 + tol && y >= Math.min(pts[0].y, pts[1].y) - tol && y <= Math.max(pts[0].y, pts[1].y) + tol; break; }
          case 'fib': case 'fibx': { if (pts.length < 2) break; const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); hit = x >= Math.min(...xs) - tol && x <= Math.max(...xs) + tol && y >= Math.min(...ys) - tol && y <= Math.max(...ys) + tol; if (!hit) for (let i = 0; i < pts.length - 1; i++) if (dist2seg(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= tol) hit = true; break; }
          case 'text': hit = Math.abs(y - pts[0].y) <= 11 && x >= pts[0].x - 4 && x <= pts[0].x + 8 + 7 * ((dw.text || T.label || 'Text').length); break;
          case 'pos': { if (pts.length < 2) break; const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), x1 = Math.min(pts[0].x, pts[1].x), x2 = Math.max(x1 + 60, Math.max(...xs)); hit = x >= x1 && x <= x2 && y >= Math.min(...ys) && y <= Math.max(...ys); break; }
        }
        if (hit) return { dw, handle: -1 };
      }
      return null;
    }
    _hitTradeLine(y, x) {
      if (x > this.layout.plotW) return null; for (const t of this.trades) { if (t.status !== 'open' && t.status !== 'pending') continue; for (const k of ['sl', 'tp']) if (t[k] != null && Math.abs(this.yOfP(t[k]) - y) <= 6) return { t, k }; } return null;
    }
    _snap(x, y) {
      let t = this.tOfX(x), p = this.pOfY(y);
      if (this.o.magnet && this.n) { const i = Math.max(0, Math.min(this.n - 1, Math.round(this.iOfX(x)))), b = this.bar(i); t = b.t; let best = p, bd = 1e9; for (const v of [b.o, b.h, b.l, b.c]) { const dd = Math.abs(this.yOfP(v) - y); if (dd < bd) { bd = dd; best = v; } } if (bd < 16) p = best; }
      return { t, p };
    }
    _pos(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    _bind() {
      const cv = this.cv;
      cv.addEventListener('pointerdown', (e) => {
        cv.setPointerCapture(e.pointerId); const m = this._pos(e); this.ptrs.set(e.pointerId, m); this.mouse = m; if (this.onFocus) this.onFocus();
        if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.drag = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), bw0: this.barW }; return; }
        const plotW = this.layout ? this.layout.plotW : this.W - AXW;
        if (m.x > plotW && m.y < this.H - AXH) { const P = this.layout.price; this.drag = { type: 'yaxis', y0: m.y, hi: P.hi, lo: P.lo }; return; }
        if (m.y > this.H - AXH) { this.drag = { type: 'xaxis', x0: m.x, bw0: this.barW }; return; }
        if (this.tool) { const s = this._snap(m.x, m.y), T = F.DRAW_TYPES[this.tool]; if (!this.pending) { this.pending = { type: this.tool, points: [s], t0: Date.now(), x0: m.x, y0: m.y }; } else { this.pending.points.push(s); } this.drag = { type: 'drawing', moved: false, x0: m.x, y0: m.y }; this._updatePreview(m); if (this.pending.points.length >= T.need) this._finishDrawing(); this.draw(); return; }
        const th = this._hitTradeLine(m.y, m.x); if (th) { this.drag = { type: 'trade', th }; this.activeTradeDrag = { t: th.t, k: th.k, p: th.t[th.k] }; return; }
        const h = this._hitDrawing(m.x, m.y);
        if (h) { this.sel = h.dw.id; if (this.onSelect) this.onSelect(h.dw); this.drag = { type: h.handle >= 0 ? 'handle' : 'move', dw: h.dw, handle: h.handle, start: this._snap(m.x, m.y), orig: JSON.parse(JSON.stringify(h.dw.points)), changed: false }; this.draw(); return; }
        if (this.sel) { this.sel = null; if (this.onSelect) this.onSelect(null); }
        this.drag = { type: 'pan', x0: m.x, vs0: this.viewStart, moved: false }; this.draw();
      });
      cv.addEventListener('pointermove', (e) => {
        const m = this._pos(e); if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, m); this.mouse = m;
        const idx = Math.round(this.iOfX(m.x)); this.hoverIdx = idx >= 0 && idx < this.n && m.x < this.W - AXW ? idx : null; if (this.onCross) this.onCross(this.hoverIdx != null ? this.tOfIdx(idx) : null);
        const d = this.drag;
        if (d) {
          if (d.type === 'pinch' && this.ptrs.size >= 2) { const [a, b] = [...this.ptrs.values()]; const nb = Math.max(1.5, Math.min(60, d.bw0 * (Math.hypot(a.x - b.x, a.y - b.y) / d.d0))); this._zoomTo(nb, (a.x + b.x) / 2); }
          else if (d.type === 'pan') { const dx = m.x - d.x0; if (Math.abs(dx) > 2) d.moved = true; this.viewStart = d.vs0 - dx / this.barW; this.follow = this.viewStart + this.visBars() >= this.n + this.rightPad - 2; if (this.onView) this.onView(this); }
          else if (d.type === 'yaxis') { const P = this.layout.price, f = Math.exp((m.y - d.y0) / 180), mid = (d.hi + d.lo) / 2, half = ((d.hi - d.lo) / 2) * f; this.yMan = { hi: mid + half, lo: mid - half }; }
          else if (d.type === 'xaxis') { this._zoomTo(Math.max(1.5, Math.min(60, d.bw0 * Math.exp((m.x - d.x0) / 160))), this.W - AXW); }
          else if (d.type === 'trade') { const p = this.pOfY(m.y); this.activeTradeDrag.p = p; }
          else if (d.type === 'drawing') { if (Math.hypot(m.x - d.x0, m.y - d.y0) > 6) d.moved = true; this._updatePreview(m); }
          else if (d.type === 'move' || d.type === 'handle') { const s = this._snap(m.x, m.y); const dt = s.t - d.start.t, dp = s.p - d.start.p; d.changed = true; if (d.type === 'move') d.dw.points = d.orig.map((q) => ({ t: q.t + dt, p: q.p + dp })); else { d.dw.points = d.orig.map((q, i) => (i === d.handle ? { t: s.t, p: s.p } : q)); } }
        } else if (this.pending) this._updatePreview(m);
        else if (!this.tool) { const th = this._hitTradeLine(m.y, m.x), h = !th && this._hitDrawing(m.x, m.y); cv.style.cursor = th ? 'ns-resize' : h ? (h.handle >= 0 ? 'crosshair' : 'move') : (m.x > this.W - AXW ? 'ns-resize' : 'default'); }
        this.draw();
      });
      const up = (e) => {
        const m = this._pos(e); this.ptrs.delete(e.pointerId); const d = this.drag;
        if (d && d.type === 'trade') { const at = this.activeTradeDrag; this.activeTradeDrag = null; if (this.onTradeLine) this.onTradeLine(at.t, at.k, at.p); }
        else if (d && d.type === 'drawing' && d.moved && this.pending && this.pending.points.length === 1 && F.DRAW_TYPES[this.pending.type].need >= 2) { const s = this._snap(m.x, m.y); this.pending.points.push(s); if (this.pending.points.length >= F.DRAW_TYPES[this.pending.type].need) this._finishDrawing(); }
        else if (d && (d.type === 'move' || d.type === 'handle') && d.changed) { if (this.onDrawings) this.onDrawings(this.drawings, d.dw); }
        else if (d && d.type === 'pan' && !d.moved && this.onClickChart) this.onClickChart(this.tOfX(m.x), this.pOfY(m.y));
        if (this.ptrs.size < 2 && d && d.type === 'pinch') this.drag = null; if (this.ptrs.size === 0) this.drag = null; this.draw();
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', () => { if (!this.drag) { this.mouse = null; this.hoverIdx = null; if (this.onCross) this.onCross(null); this.draw(); } });
      cv.addEventListener('dblclick', (e) => { const m = this._pos(e); if (m.x > this.W - AXW) { this.yMan = null; this.draw(); return; } const h = this._hitDrawing(m.x, m.y); if (h && this.onEdit) this.onEdit(h.dw); });
      cv.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!this.layout || !this.n) return; const m = this._pos(e); if (m.x > this.W - AXW || m.y > this.layout.price.h) return; if (this.onContext) this.onContext({ price: this.pOfY(m.y), cx: e.clientX, cy: e.clientY }); });
      cv.addEventListener('wheel', (e) => { e.preventDefault(); const m = this._pos(e); if (m.x > this.W - AXW) { const P = this.layout.price, f = Math.exp(e.deltaY * 0.0015), mid = (P.hi + P.lo) / 2, half = ((P.hi - P.lo) / 2) * f; this.yMan = { hi: mid + half, lo: mid - half }; this.draw(); return; } if (e.shiftKey) { this.viewStart += e.deltaY / this.barW; this.follow = false; this.draw(); return; } this._zoomTo(Math.max(1.5, Math.min(60, this.barW * Math.exp(-e.deltaY * 0.0015))), m.x); }, { passive: false });
    }
    _zoomTo(bw, anchorX) { const iA = this.iOfX(anchorX); this.barW = bw; this.viewStart = iA - (anchorX - bw / 2) / bw; this.follow = this.viewStart + this.visBars() >= this.n + this.rightPad - 2; if (this.onView) this.onView(this); this.draw(); }
    zoom(f) { this._zoomTo(Math.max(1.5, Math.min(60, this.barW * f)), (this.W - AXW) / 2); }
    _updatePreview(m) { if (!this.pending) return; const T = F.DRAW_TYPES[this.pending.type], pts = this.pending.points.slice(); if (pts.length < T.need) { const s = this._snap(m.x, m.y); pts.push(s); } this.pending.preview = { id: '_pv', type: this.pending.type, points: pts.length < T.need && T.need === 3 && pts.length === 2 ? pts.concat([{ t: pts[1].t, p: pts[1].p }]) : pts, color: T.color }; }
    _finishDrawing() {
      const T = F.DRAW_TYPES[this.pending.type]; let pts = this.pending.points.slice(0, T.need);
      if ((T.cat === 'pos') && pts.length === 3) { /* ok */ }
      const dw = { id: F.uid(), type: this.pending.type, points: pts, color: T.color, width: 1.5, text: T.cat === 'text' ? (T.label || 'Text') : '', visible: true };
      this.pending = null; this.drawings.push(dw); this.sel = dw.id; if (this.onDrawings) this.onDrawings(this.drawings, dw, true); if (this.onSelect) this.onSelect(dw); if (this.onToolDone) this.onToolDone(dw); this.draw();
    }
    deleteSelected() { if (!this.sel) return false; const dw = this.drawings.find((d) => d.id === this.sel); this.drawings = this.drawings.filter((d) => d.id !== this.sel); this.sel = null; if (this.onDrawings) this.onDrawings(this.drawings, dw, false, true); if (this.onSelect) this.onSelect(null); this.draw(); return true; }
    cancelTool() { this.pending = null; this.tool = null; this.cv.style.cursor = 'default'; this.draw(); }
    snapshot() { return this.cv.toDataURL('image/jpeg', 0.8); }
  }
  F.Chart = Chart;
})(window);
