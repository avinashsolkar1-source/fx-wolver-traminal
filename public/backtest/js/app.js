/* FX WOLVER – app shell: auth, sidebar, router, shared data helpers */
(function (g) {
  const F = g.FXW, U = F.ui, DB = F.DB, { $, $$, esc, icon } = { $: U.$, $$: U.$$, esc: U.esc, icon: U.icon };
  const A = (F.App = { page: null, cleanup: null, settings: null });
  F.pages = {};

  /* ---------- navigation model ---------- */
  const NAV = [
    { k: 'home', label: 'Dashboard', ic: 'home', hash: '#/home' },
    { grp: 'BACKTESTING', ic: 'chart', items: [
      ['workspace', 'Trading Terminal', 'play'], ['tv', 'TradingView', 'layers'], ['new', 'New Backtest', 'plus'], ['overview', 'Overview', 'home'], ['sessions', 'My Backtests', 'list'], ['history', 'Trading History', 'clock'], ['journal', 'Trading Journal', 'book'],
      ['analytics', 'Analytics', 'bar'], ['strategies', 'Strategy Lab', 'flask'], ['risk', 'Risk Lab', 'shield'], ['prop', 'Prop Firm Simulator', 'trophy'], ['calendar', 'Economic Calendar', 'cal'],
      ['gallery', 'Screenshot Gallery', 'img'], ['patterns', 'Pattern Library', 'pat'], ['coach', 'AI Trading Coach', 'brain'], ['data', 'Market Data (CSV)', 'db'], ['settings', 'Settings', 'gear'] ] },
    { k: 'site', label: 'Website', ic: 'home', hash: 'index.html', ext: true },
  ];
  const TITLES = { home: 'Dashboard' }; NAV[1].items.forEach((i) => (TITLES[i[0]] = i[1]));

  /* ---------- shared data access ---------- */
  A.settingsGet = async () => (A.settings = await DB.getSettings());
  A.sessions = async () => (await DB.list('sessions')).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  A.trades = async (sid) => DB.list('trades', sid ? { session_id: sid } : undefined);
  A.sessionName = (s) => s.name || s.symbol;
  A.tfOptions = (baseSec) => F.tfKeys.filter((k) => F.TF[k] >= baseSec && (F.TF[k] % baseSec === 0 || (k === '1mo' && baseSec <= 86400)));
  A.closed = (trades) => trades.filter((t) => t.status === 'closed' && t.pnl != null);

  /* ---------- boot ---------- */
  A.boot = async function () {
    try { await DB.init(); } catch (e) { document.body.innerHTML = `<div class="authbox"><div class="card"><h2>Startup error</h2><p>${esc(e.message)}</p><p class="mut">Your browser must allow IndexedDB/storage (it may be disabled in private windows).</p></div></div>`; return; }
    if (DB.mode === 'cloud' && !DB.user) return A.authScreen();
    A.shell();
  };

  A.authScreen = function () {
    document.body.innerHTML = `<div class="authbox"><div class="card"><div style="text-align:center;margin-bottom:14px"><span class="lfx big" style="--s:96px"><img src="assets/logo.png" alt="FX Wolver"></span><h2 style="margin:12px 0 2px;letter-spacing:.2em">FX WOLVER</h2><div class="mut" style="letter-spacing:.3em;font-size:10px">TRADING TERMINAL</div></div>
      <button class="btn gbtn" id="ag" type="button"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg> Continue with Google</button><div class="or"><span>or use email</span></div><div class="tabs" id="at"><button class="on" data-m="in">Login</button><button data-m="up">Sign up</button><button data-m="rs">Forgot</button></div>
      <div id="amsg"></div><form id="af" class="frm"><div id="nm" class="hide"><label class="f">Name</label><input class="in" id="an" autocomplete="name"></div><div><label class="f">Email</label><input class="in" id="ae" type="email" required autocomplete="email"></div><div id="pw"><label class="f">Password</label><input class="in" id="ap" type="password" minlength="6" autocomplete="current-password"></div><button class="btn pri" id="ab" type="submit">Login</button></form>
      <p class="hint" style="margin-top:12px">Same FX Wolver account as on the website. Your data is visible only to you (Row Level Security).</p></div></div>`;
    let mode = 'in'; const msg = (t, c) => ($('#amsg').innerHTML = t ? `<div class="alert ${c}">${esc(t)}</div>` : '');
    $$('#at button').forEach((b) => (b.onclick = () => { mode = b.dataset.m; $$('#at button').forEach((x) => x.classList.toggle('on', x === b)); $('#nm').classList.toggle('hide', mode !== 'up'); $('#pw').classList.toggle('hide', mode === 'rs'); $('#ab').textContent = { in: 'Login', up: 'Create account', rs: 'Send reset link' }[mode]; msg(''); }));
    $('#ag').onclick = async () => { try { await DB.signInGoogle(); } catch (er) { msg(er.message, 'err'); } };
    $('#af').onsubmit = async (e) => { e.preventDefault(); const btn = $('#ab'); btn.disabled = true; msg(''); try { const em = $('#ae').value.trim(), pw = $('#ap').value; if (mode === 'in') { await DB.signIn(em, pw); location.reload(); } else if (mode === 'up') { const r = await DB.signUp(em, pw, $('#an').value.trim()); if (r.session) location.reload(); else msg('Account created. Check your email to confirm it, then log in.', 'ok'); } else { await DB.reset(em); msg('Reset link sent by email (if the account exists).', 'ok'); } } catch (er) { msg(er.message, 'err'); } btn.disabled = false; };
  };

  A.shell = function () {
    const mini = (() => { try { return localStorage.getItem('fxw_mini') === '1'; } catch (e) { return false; } })();
    const open = (() => { try { return localStorage.getItem('fxw_grp') !== '0'; } catch (e) { return true; } })();
    document.body.innerHTML = `<div class="shell ${mini ? 'mini' : ''}" id="shell">
      <aside class="side" id="side"><div class="brand"><span class="lfx"><img src="assets/logo.png" alt="FX Wolver"></span><div><b>FXWOLVER</b><small>Trading Terminal</small></div></div>
      <nav class="nav" id="nav" aria-label="Main">${NAV.map((n) => n.grp ? `<div class="grp ${open ? 'open' : ''}" id="grp"><button type="button" aria-expanded="${open}">${icon(n.ic)}<span>${n.grp}</span><svg class="chev" viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><path d="M9 6l6 6-6 6"/></svg></button><div class="sub">${n.items.map((i) => `<a href="#/bt/${i[0]}" data-k="${i[0]}">${icon(i[2])}<span>${i[1]}</span></a>`).join('')}</div></div>` : `<a href="${n.hash}" data-k="${n.k}" ${n.ext ? '' : ''}>${icon(n.ic)}<span>${n.label}</span></a>`).join('')}</nav>
      <div class="sidefoot"><button class="btn sm ghost" id="mini" style="width:100%">${icon('layout')}<span>Collapse sidebar</span></button></div></aside>
      <div class="main"><header class="top"><button class="btn ic ghost burger" id="burger" aria-label="Menu">${icon('menu')}</button><div class="crumbs" id="crumbs"></div>
        <div class="tools"><span class="modebadge ${DB.mode}" id="mb" title="${DB.mode === 'cloud' ? 'Supabase cloud database' : 'Saved in this browser on this device'}">${DB.mode === 'cloud' ? '● Cloud synced' : '● Local mode'}</span>
          <div class="dd"><button class="btn ic ghost" id="bell" aria-label="Notifications">${icon('bell')}<span class="dot hide" id="bdot">0</span></button><div class="ddm hide" id="bellm"><div class="hd">Notifications</div><div class="notif" id="notif"></div></div></div>
          <div class="dd"><button class="avatar" id="av" aria-label="User menu">${esc((DB.user.email || 'U')[0].toUpperCase())}</button><div class="ddm hide" id="avm"><div class="hd">${esc(DB.user.email)}<br><span class="mut">${DB.mode === 'cloud' ? 'Cloud account' : 'Local device account'}</span></div><a class="it" href="#/bt/settings">Settings</a><button class="it" id="exp">Download full backup (JSON)</button>${DB.mode === 'cloud' ? '<button class="it" id="so">Sign out</button>' : ''}<a class="it" href="index.html">Website home</a></div></div>
        </div></header>
      <div class="content" id="content"></div></div></div>`;
    if (DB.warn) U.toast(DB.warn, 'warn');
    $('#grp > button').onclick = () => { const gp = $('#grp'); gp.classList.toggle('open'); try { localStorage.setItem('fxw_grp', gp.classList.contains('open') ? '1' : '0'); } catch (e) {} };
    $('#mini').onclick = () => { const s = $('#shell'); s.classList.toggle('mini'); try { localStorage.setItem('fxw_mini', s.classList.contains('mini') ? '1' : '0'); } catch (e) {} setTimeout(() => window.dispatchEvent(new Event('resize')), 250); };
    $('#burger').onclick = () => { $('#side').classList.toggle('open'); let sc = $('.scrim'); if ($('#side').classList.contains('open')) { sc = document.createElement('div'); sc.className = 'scrim'; sc.onclick = closeSide; document.body.appendChild(sc); } else if (sc) sc.remove(); };
    const closeSide = () => { $('#side').classList.remove('open'); const sc = $('.scrim'); if (sc) sc.remove(); };
    $('#nav').addEventListener('click', (e) => { if (e.target.closest('a')) closeSide(); });
    const dd = (btn, menu) => { $(btn).onclick = (e) => { e.stopPropagation(); const m = $(menu), was = m.classList.contains('hide'); $$('.ddm').forEach((x) => x.classList.add('hide')); if (was) m.classList.remove('hide'); }; };
    dd('#bell', '#bellm'); dd('#av', '#avm'); document.addEventListener('click', () => $$('.ddm').forEach((x) => x.classList.add('hide')));
    const renderNotes = () => { const n = U.notes; $('#notif').innerHTML = n.length ? n.map((x) => `<div class="n ${x.type === 'err' ? 'dn' : ''}">${esc(x.msg)}<div class="mut" style="font-size:11px">${new Date(x.t).toLocaleTimeString()}</div></div>`).join('') : '<div class="n mut">No notifications</div>'; const d = $('#bdot'); d.textContent = n.length; d.classList.toggle('hide', !n.length); }; U.onNotes = renderNotes; renderNotes();
    $('#exp').onclick = async () => { try { const o = await DB.exportAll(); U.download('fxwolver-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(o), 'application/json'); U.toast('Backup downloaded'); } catch (e) { U.toast(e.message, 'err'); } };
    if ($('#so')) $('#so').onclick = async () => { await DB.signOut(); location.reload(); };
    window.addEventListener('hashchange', A.route); if (!location.hash) location.hash = '#/bt/workspace'; A.route();
  };

  /* ---------- router ---------- */
  A.route = async function () {
    const h = location.hash.replace(/^#\/?/, '').split('/'), grp = h[0], key = grp === 'bt' ? h[1] || 'overview' : grp || 'home', arg = h[2];
    if (!location.hash || location.hash === '#' || location.hash === '#/') { location.hash = '#/bt/workspace'; return; }
    if (!(key in TITLES)) { location.hash = '#/bt/workspace'; return; }
    if (A.cleanup) { try { await A.cleanup(); } catch (e) { console.error(e); } A.cleanup = null; }
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.k === key));
    $('#crumbs').innerHTML = `<span class="hm">FX WOLVER</span><span class="hm">›</span>${grp === 'bt' ? '<span class="hm">Backtesting</span><span class="hm">›</span>' : ''}<b>${esc(TITLES[key])}</b>`;
    document.title = TITLES[key] + ' · FX WOLVER';
    const el = $('#content'); el.classList.toggle('flush', key === 'workspace' && !!arg); el.innerHTML = U.loading(); const my = (A.token = (A.token || 0) + 1);
    try { const fn = F.pages[key]; if (!fn) throw new Error('Page "' + key + '" failed to load'); const c = await fn(el, { arg, token: my, isStale: () => A.token !== my }); if (A.token === my) A.cleanup = c || null; else if (c) c(); }
    catch (e) { console.error(e); if (A.token === my) el.innerHTML = `<div class="card">${U.errorBox(e)}<button class="btn" onclick="location.reload()">Reload</button></div>`; }
  };
  A.go = (h) => { if (location.hash === h) A.route(); else location.hash = h; };

  /* ---------- home dashboard ---------- */
  F.pages.home = async function (el) {
    const [ses, ds, trades] = await Promise.all([A.sessions(), DB.list('datasets'), A.trades()]), cl = A.closed(trades), st = F.stats(cl, 0), last = ses[0];
    el.innerHTML = `<div class="pagehead"><div><h1>Welcome, ${esc(DB.user.email.split('@')[0])}</h1><p>FX WOLVER trading terminal — historical replay, journal and analytics in one place.</p></div><div class="acts"><a class="btn pri" href="#/bt/new">${icon('plus')} New Backtest</a>${last ? `<a class="btn" href="#/bt/workspace/${last.id}">${icon('play')} Resume last session</a>` : ''}</div></div>
      <div class="grid g4" style="margin-bottom:16px">${U.kpi('Backtests', ses.length)}${U.kpi('Closed trades', cl.length)}${U.kpi('Net P/L', U.money(st.net))}${U.kpi('Datasets', ds.length, ds.length ? '' : 'Import data')}</div>
      ${ds.length ? '' : `<div class="alert info"><b>Import data first.</b> Backtesting requires real historical candles. <a href="#/bt/data">Market Data</a> page, import a CSV (MT5 / Dukascopy / Binance export) or download crypto data from Binance.</div>`}
      <div class="card"><h3>Recent sessions</h3>${ses.length ? `<div class="tw"><table class="t"><thead><tr><th>Name</th><th>Symbol</th><th>Updated</th><th></th></tr></thead><tbody>${ses.slice(0, 6).map((s) => `<tr class="click" onclick="location.hash='#/bt/workspace/${s.id}'"><td>${esc(A.sessionName(s))}</td><td>${esc(s.symbol)}</td><td class="mut">${esc((s.updated_at || '').slice(0, 16).replace('T', ' '))}</td><td><span class="tag">${s.status === 'completed' ? 'completed' : 'active'}</span></td></tr>`).join('')}</tbody></table></div>` : U.empty('chart', 'No backtests yet', 'Create your first backtest and start a historical replay.', '<a class="btn pri" href="#/bt/new">New Backtest</a>')}</div>`;
  };
  document.addEventListener('DOMContentLoaded', () => A.boot());
})(window);
