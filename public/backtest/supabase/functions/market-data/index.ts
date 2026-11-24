// FX WOLVER free-first historical data adapter.
// Uses Yahoo Finance chart data as a no-key fallback for Forex, metals, indices and stocks.
// Yahoo is an unofficial upstream: availability/rate limits can change. For older intraday
// history, import a trusted CSV instead of assuming the free feed has five years of bars.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const INTERVALS: Record<string, { yahoo: string; maxAge: number }> = {
  "1min": { yahoo: "1m", maxAge: 5 * 86400 },
  "5min": { yahoo: "5m", maxAge: 31 * 86400 },
  "15min": { yahoo: "15m", maxAge: 31 * 86400 },
  "30min": { yahoo: "30m", maxAge: 31 * 86400 },
  "1h": { yahoo: "60m", maxAge: 730 * 86400 },
  "4h": { yahoo: "60m", maxAge: 730 * 86400 },
  "1day": { yahoo: "1d", maxAge: 1826 * 86400 },
  "1week": { yahoo: "1wk", maxAge: 5 * 366 * 86400 },
  "1month": { yahoo: "1mo", maxAge: 10 * 366 * 86400 },
};
const SYMBOLS: Record<string, string> = {
  DJI: "^DJI", IXIC: "^IXIC", SPX: "^GSPC", DAX: "^GDAXI", FTSE: "^FTSE",
  NIFTY50: "^NSEI", SENSEX: "^BSESN", JPN225: "^N225", HKG50: "^HSI", EU50: "^STOXX50E",
  "XAU/USD": "GC=F", "XAG/USD": "SI=F", "XPT/USD": "PL=F", "XPD/USD": "PA=F",
};
function yahooSymbol(input: string): string {
  const s = input.trim().toUpperCase();
  if (SYMBOLS[s]) return SYMBOLS[s];
  if (/^[A-Z]{3}\/[A-Z]{3}$/.test(s)) return s.replace("/", "") + "=X";
  if (/^[A-Z0-9.^=_-]{1,24}$/.test(s)) return s;
  throw new Error("Unsupported symbol format");
}
function parseUtc(value: string): number {
  const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const n = Date.parse(normalized);
  if (!Number.isFinite(n)) throw new Error("Invalid start/end date");
  return Math.floor(n / 1000);
}
function isoUtc(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 19).replace("T", " ");
}
const cache = new Map<string, { at: number; values: unknown[] }>();
async function getChart(symbol: string, yahooInterval: string, requestedInterval: string, start: number, end: number) {
  const key = [symbol, yahooInterval, requestedInterval, start, end].join("|");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 30_000) return hit.values;
  let lastError = "Upstream unavailable";
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const url = new URL(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}`);
      url.search = new URLSearchParams({
        period1: String(start), period2: String(end), interval: yahooInterval,
        events: "div,splits", includeAdjustedClose: "true",
      }).toString();
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 FXWOLVER/1.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) { lastError = `Yahoo Finance HTTP ${response.status}`; continue; }
      const json = await response.json();
      const result = json?.chart?.result?.[0];
      if (!result?.timestamp?.length) {
        lastError = json?.chart?.error?.description || "No candles returned by Yahoo Finance";
        continue;
      }
      const q = result.indicators?.quote?.[0];
      if (!q) { lastError = "Yahoo Finance returned no OHLC data"; continue; }
      let values = result.timestamp.flatMap((t: number, i: number) => {
        const open = q.open?.[i], high = q.high?.[i], low = q.low?.[i], close = q.close?.[i];
        if ([open, high, low, close].some((v) => v == null || !Number.isFinite(Number(v)))) return [];
        return [{
          datetime: isoUtc(t), open: Number(open), high: Number(high),
          low: Number(low), close: Number(close), volume: Number(q.volume?.[i] || 0),
        }];
      });
      if (requestedInterval === "4h") {
        const buckets = new Map<number, any>();
        for (const row of values) {
          const t = Math.floor(parseUtc(row.datetime) / 14400) * 14400;
          const old = buckets.get(t);
          if (!old) buckets.set(t, { ...row, datetime: isoUtc(t) });
          else {
            old.high = Math.max(old.high, row.high);
            old.low = Math.min(old.low, row.low);
            old.close = row.close;
            old.volume += row.volume;
          }
        }
        values = [...buckets.values()];
      }
      values.sort((a: any, b: any) => parseUtc(a.datetime) - parseUtc(b.datetime));
      cache.set(key, { at: Date.now(), values });
      if (cache.size > 80) cache.delete(cache.keys().next().value!);
      return values;
    } catch (error) {
      lastError = String((error as Error)?.message || error);
    }
  }
  throw new Error(lastError);
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "POST required" }, { status: 405, headers: cors });
  try {
    const body = await req.json();
    if (typeof body?.symbol !== "string" || typeof body?.interval !== "string") {
      throw new Error("symbol and interval are required");
    }
    const spec = INTERVALS[body.interval];
    if (!spec) throw new Error("Unsupported timeframe");
    const symbol = yahooSymbol(body.symbol);
    const start = parseUtc(String(body.start || ""));
    const end = parseUtc(String(body.end || ""));
    const now = Math.floor(Date.now() / 1000);
    if (end <= start) throw new Error("End date must be after start date");
    if (start > now + 60) throw new Error("Start date cannot be in the future");
    const earliest = now - spec.maxAge;
    if (start < earliest) {
      const days = Math.floor(spec.maxAge / 86400);
      throw new Error(`Free Yahoo history for ${body.interval} is limited to about ${days} days. Choose a recent date range or import older candles from CSV.`);
    }
    const values = await getChart(symbol, spec.yahoo, body.interval, start, Math.min(end, now + 60));
    return Response.json({ values, source: "Yahoo Finance", history_limit_days: Math.floor(spec.maxAge / 86400) }, { headers: { ...cors, "Cache-Control": "private, max-age=20" } });
  } catch (error) {
    return Response.json({ error: String((error as Error)?.message || error) }, { status: 400, headers: cors });
  }
});
