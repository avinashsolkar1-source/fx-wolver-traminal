// UNTESTED — deploy to YOUR Supabase project, then: supabase secrets set TWELVEDATA_API_KEY=xxxx
// The key lives only here (server side). Requires a logged-in user (JWT verified by Supabase).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const key = Deno.env.get("TWELVEDATA_API_KEY");
    if (!key) throw new Error("TWELVEDATA_API_KEY secret not set");
    const { symbol, interval, start, end } = await req.json();
    if (!/^[A-Za-z0-9/._-]{1,20}$/.test(symbol) || !/^(1min|5min|15min|30min|1h|4h|1day|1week|1month)$/.test(interval)) throw new Error("bad params");
    const u = new URL("https://api.twelvedata.com/time_series");
    u.search = new URLSearchParams({ symbol, interval, start_date: start ?? "", end_date: end ?? "", outputsize: "5000", timezone: "UTC", order: "ASC", apikey: key }).toString();
    const r = await fetch(u); const j = await r.json();
    if (j.status === "error") throw new Error(j.message);
    return new Response(JSON.stringify({ values: j.values }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } }); }
});
