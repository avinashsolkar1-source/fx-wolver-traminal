/* FX WOLVER – UI helpers: DOM, toast, modal, icons, mini charts */
(function (g) {
  const F = g.FXW, U = (F.ui = {});
  U.$ = (s, r) => (r || document).querySelector(s);
  U.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const esc = U.esc;
  const P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>', plus: '<path d="M12 5v14M5 12h14"/>', play: '<path d="M7 4l13 8-13 8z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', book: '<path d="M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4z"/><path d="M8 4v16"/>',
    bar: '<path d="M5 20V10M12 20V4M19 20v-8"/>', flask: '<path d="M9 3h6M10 3v6L4 19a2 2 0 002 3h12a2 2 0 002-3l-6-10V3"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>', db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.5-2.3 1a7 7 0 00-2-1.2L14 3h-4l-.6 2.6a7 7 0 00-2 1.2l-2.3-1-2 3.5 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.3-1a7 7 0 002 1.2L10 21h4l.6-2.6a7 7 0 002-1.2l2.3 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/>',
    brain: '<path d="M9 3a3 3 0 00-3 3 3 3 0 00-2 5 3 3 0 002 5 3 3 0 006 0V6a3 3 0 00-3-3zM15 3a3 3 0 013 3 3 3 0 012 5 3 3 0 01-2 5 3 3 0 01-6 0"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>', bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z"/>',
    chev: '<path d="M9 6l6 6-6 6"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', bell: '<path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12l5 5 9-10"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>', dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', up: '<path d="M12 20V9M7 13l5-5 5 5M5 4h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>', logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>', pause: '<path d="M8 5v14M16 5v14"/>', next: '<path d="M6 5l9 7-9 7zM18 5v14"/>', prev: '<path d="M18 5l-9 7 9 7zM6 5v14"/>', skip: '<path d="M5 5l8 7-8 7zM13 5l8 7-8 7z"/>', reset: '<path d="M4 12a8 8 0 108-8M4 4v5h5"/>',
    cursor: '<path d="M5 3l14 8-6 2-2 6z"/>', trend: '<path d="M4 19L20 5"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="5" r="1.6"/>', hline: '<path d="M3 12h18"/>', vline: '<path d="M12 3v18"/>', rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>', ray: '<path d="M4 18l16-12"/><path d="M16 4l4 2-2 4"/>',
    fib: '<path d="M3 5h18M3 10h18M3 15h18M3 20h18"/>', text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>', zone: '<rect x="3" y="8" width="18" height="8" fill="currentColor" fill-opacity=".2"/><path d="M3 8h18M3 16h18"/>', pos: '<rect x="4" y="4" width="16" height="7" fill="currentColor" fill-opacity=".2"/><rect x="4" y="11" width="16" height="9"/><path d="M4 11h16"/>',
    magnet: '<path d="M5 3v8a7 7 0 0014 0V3h-4v8a3 3 0 01-6 0V3z"/>', layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="4"/>', panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>', zoomin: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M11 8v6M8 11h6"/>', zoomout: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6"/>',
    swing: '<path d="M3 17l5-8 4 6 4-10 5 12"/>', bos: '<path d="M3 15h8l4-9 6 3"/>', ob: '<rect x="5" y="9" width="14" height="6"/><path d="M5 5v14"/>', fvg: '<path d="M4 18h5v-5M20 6h-5v5"/><rect x="9" y="11" width="6" height="2" fill="currentColor"/>', liq: '<path d="M3 9h18" stroke-dasharray="3 3"/><path d="M3 15h18"/>', pd: '<path d="M4 4h16v16H4zM4 12h16"/>', pat: '<path d="M4 20l5-9 4 5 7-12"/><circle cx="20" cy="4" r="1.5"/>',
  };
  U.icon = (n, cls) => `<svg viewBox="0 0 24 24" class="${cls || ''}" aria-hidden="true">${P[n] || P.chart}</svg>`;

  /* ---------- toast + notification log ---------- */
  U.notes = []; U.onNotes = null;
  U.toast = function (msg, type) {
    type = type || 'ok'; U.notes.unshift({ t: Date.now(), msg, type }); if (U.notes.length > 40) U.notes.pop(); if (U.onNotes) U.onNotes();
    let box = U.$('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const d = document.createElement('div'); d.className = 'toast ' + type; d.textContent = msg; d.setAttribute('role', 'status'); box.appendChild(d); setTimeout(() => d.remove(), type === 'err' ? 6500 : 3200);
  };

  /* ---------- modal ---------- */
  U.modal = function (o) {
    return new Promise((resolve) => {
      const bg = document.createElement('div'); bg.className = 'modalbg';
      bg.innerHTML = `<div class="modal ${o.wide ? 'wide' : ''}" role="dialog" aria-modal="true"><h2>${esc(o.title || '')}</h2><div class="mb">${o.html || ''}</div><div class="foot"></div></div>`;
      document.body.appendChild(bg); const foot = bg.querySelector('.foot'), box = bg.querySelector('.modal'); let done = false;
      const close = (v) => { if (done) return; done = true; bg.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onKey);
      (o.buttons || [{ label: 'OK', value: true, cls: 'pri' }]).forEach((b) => { const el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label; el.onclick = async () => { if (b.validate) { const r = await b.validate(box); if (r === false) return; close(r === undefined ? b.value : r); } else close(b.value); }; foot.appendChild(el); });
      bg.addEventListener('mousedown', (e) => { if (e.target === bg && !o.sticky) close(null); });
      if (o.onOpen) o.onOpen(box, close); const f = box.querySelector('input,select,textarea'); if (f && !o.noFocus) f.focus();
    });
  };
  U.confirm = (msg, label, danger) => U.modal({ title: 'Confirm', html: `<p style="margin:0">${esc(msg)}</p>`, buttons: [{ label: 'Cancel', value: false, cls: 'ghost' }, { label: label || 'Yes', value: true, cls: danger ? 'danger' : 'pri' }] });
  U.prompt = (title, label, val) => U.modal({ title, html: `<label class="f">${esc(label)}</label><input class="in" id="pv" value="${esc(val || '')}">`, buttons: [{ label: 'Cancel', value: null, cls: 'ghost' }, { label: 'Save', cls: 'pri', validate: (b) => { const v = b.querySelector('#pv').value.trim(); if (!v) return false; return v; } }] });

  /* ---------- states ---------- */
  U.loading = (t) => `<div class="loading"><span class="spin"></span>${esc(t || 'Loading…')}</div>`;
  U.empty = (icon, title, text, action) => `<div class="empty"><div class="ico">${U.icon(icon)}</div><h3>${esc(title)}</h3><p style="max-width:460px;margin:0 auto 14px">${text}</p>${action || ''}</div>`;
  U.errorBox = (e) => `<div class="alert err"><b>Error:</b> ${esc(e && e.message ? e.message : e)}</div>`;
  U.kpi = (l, v, s, cls) => `<div class="card kpi"><div class="l">${esc(l)}</div><div class="v ${cls || ''}">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
  U.money = (n) => `<span class="${n > 0 ? 'up' : n < 0 ? 'dn' : ''}">${F.fmtMoney(n)}</span>`;
  U.dur = (s) => { if (!s || !isFinite(s)) return '–'; const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return (d ? d + 'd ' : '') + (h ? h + 'h ' : '') + (!d ? m + 'm' : ''); };
  U.pf = (v) => (v === Infinity ? '∞' : F.round(v, 2));

  /* ---------- CSV / file download ---------- */
  U.download = (name, text, mime) => { const b = new Blob([text], { type: mime || 'text/plain' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  U.csv = (rows) => rows.map((r) => r.map((c) => { c = c == null ? '' : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',')).join('\n');
  U.readFile = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read the file')); r.readAsText(f); });
  U.imgToDataURL = (f, max) => new Promise((res, rej) => { const r = new FileReader(); r.onerror = () => rej(new Error('Image read fail')); r.onload = () => { const im = new Image(); im.onerror = () => rej(new Error('Not a valid image')); im.onload = () => { const k = Math.min(1, (max || 900) / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.78)); }; im.src = r.result; }; r.readAsDataURL(f); });

  /* ---------- canvas mini charts ---------- */
  const fit = (cv) => { const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(10, r.width * d); cv.height = Math.max(10, r.height * d); const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); return { c, w: r.width, h: r.height }; };
  const axis = (c, w, h, lo, hi, m, fmt) => { c.font = '10.5px "JetBrains Mono",monospace'; c.fillStyle = '#6b7c99'; c.strokeStyle = '#122244'; c.textAlign = 'right'; c.textBaseline = 'middle'; for (let i = 0; i <= 4; i++) { const v = lo + ((hi - lo) * i) / 4, y = m.t + (h - m.t - m.b) * (1 - i / 4); c.beginPath(); c.moveTo(m.l, y); c.lineTo(w - m.r, y); c.stroke(); c.fillText(fmt(v), m.l - 6, y); } };
  U.lineChart = function (cv, series, o) {
    o = o || {}; const { c, w, h } = fit(cv), m = { l: 56, r: 10, t: 8, b: 20 }; c.clearRect(0, 0, w, h);
    const all = series.flatMap((s) => s.data.map((p) => p.y)).filter(isFinite); if (!all.length) { c.fillStyle = '#5a6a86'; c.textAlign = 'center'; c.fillText('No data', w / 2, h / 2); return; }
    let lo = Math.min(...all), hi = Math.max(...all); if (o.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); } if (hi === lo) { hi += 1; lo -= 1; } const pad = (hi - lo) * 0.06; lo -= pad; hi += pad; const fmt = o.fmt || ((v) => F.round(v, 2));
    axis(c, w, h, lo, hi, m, fmt); const xs = series.flatMap((s) => s.data.map((p) => p.x)), x0 = Math.min(...xs), x1 = Math.max(...xs), X = (x) => m.l + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (w - m.l - m.r), Y = (y) => m.t + (1 - (y - lo) / (hi - lo)) * (h - m.t - m.b);
    if (o.zero) { c.strokeStyle = '#2a3f6e'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(m.l, Y(0)); c.lineTo(w - m.r, Y(0)); c.stroke(); c.setLineDash([]); }
    for (const s of series) { if (!s.data.length) continue; c.beginPath(); s.data.forEach((p, i) => (i ? c.lineTo(X(p.x), Y(p.y)) : c.moveTo(X(p.x), Y(p.y)))); c.strokeStyle = s.color || '#3b82f6'; c.lineWidth = s.width || 2; c.lineJoin = 'round'; c.stroke(); if (s.fill) { c.lineTo(X(s.data[s.data.length - 1].x), Y(o.fillBase != null ? o.fillBase : lo)); c.lineTo(X(s.data[0].x), Y(o.fillBase != null ? o.fillBase : lo)); c.closePath(); const gr = c.createLinearGradient(0, m.t, 0, h - m.b); gr.addColorStop(0, s.color + '44'); gr.addColorStop(1, s.color + '00'); c.fillStyle = gr; c.fill(); } }
    if (o.xfmt) { c.fillStyle = '#6b7c99'; c.textAlign = 'center'; c.textBaseline = 'top'; [0, 0.5, 1].forEach((k) => { const x = x0 + (x1 - x0) * k; c.fillText(o.xfmt(x), Math.max(m.l + 24, Math.min(w - 30, X(x))), h - m.b + 5); }); }
  };
  U.barChart = function (cv, labels, vals, o) {
    o = o || {}; const { c, w, h } = fit(cv), m = { l: 56, r: 10, t: 8, b: 26 }; c.clearRect(0, 0, w, h); if (!vals.length) { c.fillStyle = '#5a6a86'; c.textAlign = 'center'; c.fillText('No data', w / 2, h / 2); return; }
    let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals); if (hi === lo) hi = lo + 1; const fmt = o.fmt || ((v) => F.round(v, 0)); axis(c, w, h, lo, hi, m, fmt); const Y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (h - m.t - m.b), bw = (w - m.l - m.r) / vals.length;
    vals.forEach((v, i) => { const x = m.l + i * bw + bw * 0.15, bh = Math.abs(Y(v) - Y(0)); c.fillStyle = o.color ? o.color(v, i) : v >= 0 ? '#22c55e' : '#ef4444'; c.fillRect(x, Math.min(Y(v), Y(0)), bw * 0.7, Math.max(1, bh)); c.fillStyle = '#6b7c99'; c.font = '10px Inter'; c.textAlign = 'center'; c.textBaseline = 'top'; if (bw > 22 || i % Math.ceil(24 / bw) === 0) c.fillText(String(labels[i]).slice(0, Math.max(4, Math.floor(bw / 5))), x + bw * 0.35, h - m.b + 6); });
  };
  U.heatMonths = function (trades) {
    const by = {}; trades.forEach((t) => { const d = new Date(t.exit_time * 1000), y = d.getUTCFullYear(), mo = d.getUTCMonth(); by[y] = by[y] || Array(12).fill(null); by[y][mo] = (by[y][mo] || 0) + t.pnl; });
    const ys = Object.keys(by).sort(); if (!ys.length) return '<div class="mut">No data</div>'; const mx = Math.max(1, ...ys.flatMap((y) => by[y].filter((v) => v != null).map(Math.abs)));
    let h = `<div class="heat" style="grid-template-columns:50px repeat(12,1fr);overflow:auto;min-width:560px"><div></div>${['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((x) => `<div class="mut">${x}</div>`).join('')}`;
    ys.forEach((y) => { h += `<div class="mut" style="text-align:left">${y}</div>`; by[y].forEach((v) => { const a = v == null ? 0 : Math.min(1, Math.abs(v) / mx), bg = v == null ? '#0b1730' : v >= 0 ? `rgba(34,197,94,${0.15 + a * 0.6})` : `rgba(239,68,68,${0.15 + a * 0.6})`; h += `<div style="background:${bg}" title="${v == null ? '' : F.fmtMoney(v)}">${v == null ? '' : Math.round(v)}</div>`; }); });
    return h + '</div>';
  };
  U.legend = (items) => `<div class="legend">${items.map((i) => `<span><i style="background:${i[1]}"></i>${esc(i[0])}</span>`).join('')}</div>`;
})(window);
