/* FX WOLVER data layer. Two backends behind one API:
   - "cloud": Supabase (auth + Postgres with RLS). Used when SUPABASE_ANON_KEY is set and supabase-js loaded.
   - "local": IndexedDB on this device (works offline, no login). Used otherwise.
   Candles are cached in IndexedDB in both modes; in cloud mode the source of truth is bt_dataset_chunks. */
(function (g) {
  const F = g.FXW, cfg = g.FXW_CONFIG || {};
  const DB = (F.DB = { mode: 'local', user: null, sb: null, warn: null });
  const TABLES = ['sessions', 'trades', 'journal', 'strategies', 'drawings', 'layouts', 'indicator_templates', 'settings', 'datasets', 'prop_configs', 'zones', 'imports', 'screenshots'];
  const CHUNK = 5000;

  /* ---- IndexedDB ---- */
  let idb = null;
  const open = () => idb ? Promise.resolve(idb) : new Promise((res, rej) => {
    const r = indexedDB.open('fxwolver', 2);
    r.onupgradeneeded = () => { const d = r.result; for (const t of TABLES) if (!d.objectStoreNames.contains(t)) { const s = d.createObjectStore(t, { keyPath: 'id' }); s.createIndex('session_id', 'session_id'); } if (!d.objectStoreNames.contains('candles')) d.createObjectStore('candles', { keyPath: 'id' }); };
    r.onsuccess = () => { idb = r.result; res(idb); }; r.onerror = () => rej(r.error || new Error('IndexedDB open failed'));
  });
  const tx = async (store, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(store, mode), s = t.objectStore(store); let out; const rq = fn(s); if (rq) rq.onsuccess = () => (out = rq.result); t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Transaction aborted')); }); };
  const L = {
    list: (t, f) => tx(t, 'readonly', (s) => (f && f.session_id ? s.index('session_id').getAll(f.session_id) : s.getAll())),
    get: (t, id) => tx(t, 'readonly', (s) => s.get(id)),
    put: (t, o) => tx(t, 'readwrite', (s) => s.put(o)),
    del: (t, id) => tx(t, 'readwrite', (s) => s.delete(id)),
  };

  /* ---- init / auth ---- */
  DB.init = async function () {
    await open();
    if (cfg.SUPABASE_ANON_KEY) {
      if (g.supabase && g.supabase.createClient) {
        DB.sb = g.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
        DB.mode = 'cloud';
        const { data } = await DB.sb.auth.getSession(); DB.user = data && data.session ? data.session.user : null;
        DB.sb.auth.onAuthStateChange((_e, s) => { DB.user = s ? s.user : null; if (DB.onAuth) DB.onAuth(DB.user); });
      } else { DB.warn = 'Supabase library failed to load (check your internet connection). Running in local mode — data will be saved on this device only.'; }
    }
    if (DB.mode === 'local') DB.user = { id: 'local', email: 'Local (this device)', local: true };
    return DB.mode;
  };
  DB.signIn = async (email, password) => { const { data, error } = await DB.sb.auth.signInWithPassword({ email, password }); if (error) throw new Error(error.message); DB.user = data.user; return data.user; };
  DB.signInGoogle = async () => { const { error } = await DB.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + 'app.html#/bt/workspace' } }); if (error) throw new Error(error.message); };
  DB.signUp = async (email, password, name) => { const { data, error } = await DB.sb.auth.signUp({ email, password, options: { data: { full_name: name || '' } } }); if (error) throw new Error(error.message); return data; };
  DB.reset = async (email) => { const { error } = await DB.sb.auth.resetPasswordForEmail(email); if (error) throw new Error(error.message); };
  DB.signOut = async () => { if (DB.mode === 'cloud') await DB.sb.auth.signOut(); DB.user = null; };

  /* ---- generic rows. cloud tables: bt_<name>(id uuid, user_id uuid, session_id uuid null, data jsonb, updated_at) ---- */
  const tn = (t) => 'bt_' + t;
  DB.list = async function (t, f) {
    if (DB.mode === 'local') return L.list(t, f);
    let all = [], from = 0; const step = 1000;
    for (;;) { let q = DB.sb.from(tn(t)).select('data').range(from, from + step - 1); if (f && f.session_id) q = q.eq('session_id', f.session_id); const { data, error } = await q; if (error) throw new Error(error.message); all = all.concat(data.map((r) => r.data)); if (data.length < step) break; from += step; }
    if (t === 'datasets') {
      const { data, error } = await DB.sb.from('market_datasets').select('id,symbol,market,tf,tf_sec,rows,from_ts,to_ts,source,is_public,created_at').eq('is_public', true).order('market').order('symbol');
      if (error) throw new Error('Shared market library: ' + error.message);
      const ownIds = new Set(all.map((x) => x.id));
      for (const x of (data || [])) if (!ownIds.has(x.id)) all.push({ id: x.id, symbol: x.symbol, market: x.market, tf: x.tf, tfSec: x.tf_sec, rows: x.rows, from: Number(x.from_ts), to: Number(x.to_ts), source: x.source, is_public: true, imported_at: x.created_at });
    }
    return all;
  };
  DB.get = async function (t, id) {
    if (DB.mode === 'local') return L.get(t, id);
    const { data, error } = await DB.sb.from(tn(t)).select('data').eq('id', id).maybeSingle(); if (error) throw new Error(error.message); return data ? data.data : undefined;
  };
  DB.put = async function (t, o) {
    if (!o.id) o.id = F.uid(); o.updated_at = new Date().toISOString(); if (!o.created_at) o.created_at = o.updated_at;
    if (DB.mode === 'local') { await L.put(t, o); return o; }
    const row = { id: o.id, user_id: DB.user.id, data: o, updated_at: o.updated_at }; if (o.session_id) row.session_id = o.session_id;
    const { error } = await DB.sb.from(tn(t)).upsert(row); if (error) throw new Error(error.message); return o;
  };
  DB.putMany = async function (t, arr) { if (DB.mode === 'cloud') { const now = new Date().toISOString(); const rows = arr.map((o) => { if (!o.id) o.id = F.uid(); o.updated_at = now; if (!o.created_at) o.created_at = now; const r = { id: o.id, user_id: DB.user.id, data: o, updated_at: now }; if (o.session_id) r.session_id = o.session_id; return r; }); for (let i = 0; i < rows.length; i += 200) { const { error } = await DB.sb.from(tn(t)).upsert(rows.slice(i, i + 200)); if (error) throw new Error(error.message); } return arr; } for (const o of arr) await DB.put(t, o); return arr; };
  DB.del = async function (t, id) { if (DB.mode === 'local') return L.del(t, id); const { error } = await DB.sb.from(tn(t)).delete().eq('id', id); if (error) throw new Error(error.message); };
  DB.delBySession = async function (t, sid) { if (DB.mode === 'local') { const a = await L.list(t, { session_id: sid }); for (const o of a) await L.del(t, o.id); return; } const { error } = await DB.sb.from(tn(t)).delete().eq('session_id', sid); if (error) throw new Error(error.message); };

  /* ---- candles ---- */
  const mem = new Map();
  DB.saveCandles = async function (dsId, candles) {
    const arr = new Float64Array(candles.length * 6); candles.forEach((c, i) => { arr.set([c.t, c.o, c.h, c.l, c.c, c.v || 0], i * 6); });
    await tx('candles', 'readwrite', (s) => s.put({ id: dsId, buf: arr.buffer, n: candles.length }));
    mem.delete(dsId);
    if (DB.mode === 'cloud') {
      await DB.sb.from('bt_dataset_chunks').delete().eq('dataset_id', dsId);
      for (let i = 0, k = 0; i < candles.length; i += CHUNK, k++) {
        const part = candles.slice(i, i + CHUNK).map((c) => [c.t, c.o, c.h, c.l, c.c, c.v || 0]);
        const { error } = await DB.sb.from('bt_dataset_chunks').insert({ dataset_id: dsId, user_id: DB.user.id, idx: k, data: part });
        if (error) throw new Error('Cloud upload fail: ' + error.message);
      }
    }
  };
  DB.loadCandles = async function (dsId) {
    if (mem.has(dsId)) return mem.get(dsId);
    let rec = await tx('candles', 'readonly', (s) => s.get(dsId)), out;
    if (rec) { const a = new Float64Array(rec.buf); out = new Array(rec.n); for (let i = 0; i < rec.n; i++) { const j = i * 6; out[i] = { t: a[j], o: a[j + 1], h: a[j + 2], l: a[j + 3], c: a[j + 4], v: a[j + 5] }; } }
    else if (DB.mode === 'cloud') {
      out = []; for (let k = 0; ; k++) { const { data, error } = await DB.sb.from('bt_dataset_chunks').select('data').eq('dataset_id', dsId).eq('idx', k).maybeSingle(); if (error) throw new Error(error.message); if (!data) break; for (const r of data.data) out.push({ t: r[0], o: r[1], h: r[2], l: r[3], c: r[4], v: r[5] }); }
      if (!out.length) {
        const { data, error } = await DB.sb.from('market_dataset_chunks').select('data').eq('dataset_id', dsId).order('idx');
        if (error) throw new Error('Shared market data: ' + error.message);
        for (const chunk of (data || [])) for (const r of chunk.data) out.push({ t: r[0], o: r[1], h: r[2], l: r[3], c: r[4], v: r[5] });
      }
      if (out.length) await DB.saveCandlesLocalOnly(dsId, out);
    }
    if (!out || !out.length) throw new Error('No candles found for this dataset. Re-import it from the Market Data page.');
    mem.set(dsId, out); return out;
  };
  DB.saveCandlesLocalOnly = async (dsId, candles) => { const arr = new Float64Array(candles.length * 6); candles.forEach((c, i) => arr.set([c.t, c.o, c.h, c.l, c.c, c.v || 0], i * 6)); await tx('candles', 'readwrite', (s) => s.put({ id: dsId, buf: arr.buffer, n: candles.length })); };
  DB.deleteCandles = async (dsId) => { mem.delete(dsId); await tx('candles', 'readwrite', (s) => s.delete(dsId)); if (DB.mode === 'cloud') await DB.sb.from('bt_dataset_chunks').delete().eq('dataset_id', dsId); };

  /* ---- settings (one row per user) ---- */
  F.DEFAULT_SETTINGS = { id: 'settings', balance: 10000, riskPct: 1, symbol: 'EURUSD', market: 'forex', tf: '15m', speed: 5, spread: 0, commission: 0, slippage: 0, swap: 0, currency: 'USD', timezone: 'UTC', leverage: 100, maxOpen: 5, chart: { grid: true, volume: true, upColor: '#22c55e', downColor: '#ef4444', bg: '#070d1a' }, notify: { sound: false, toast: true } };
  const sid = () => 'settings:' + (DB.user ? DB.user.id : 'local'); // namespaced so two users never share a primary key
  DB.getSettings = async () => Object.assign({}, F.DEFAULT_SETTINGS, (await DB.get('settings', sid())) || {}, { id: sid() });
  DB.saveSettings = (s) => DB.put('settings', Object.assign({}, s, { id: sid() }));

  /* ---- full backup (JSON) ---- */
  DB.exportAll = async () => { const o = { app: 'fxwolver', version: 1, exported: new Date().toISOString() }; for (const t of TABLES) if (t !== 'screenshots') o[t] = await DB.list(t); return o; };
  DB.TABLES = TABLES;
})(window);
