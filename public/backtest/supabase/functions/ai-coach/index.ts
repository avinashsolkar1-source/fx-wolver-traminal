// UNTESTED — deploy to YOUR Supabase project, then: supabase secrets set ANTHROPIC_API_KEY=xxxx
// Receives aggregate statistics only (no raw account data). Key never reaches the browser.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY"); if (!key) throw new Error("ANTHROPIC_API_KEY secret not set");
    const stats = await req.json();
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 900, messages: [{ role: "user", content: "You are a trading performance coach. Using ONLY these statistics from the trader's simulated trades, give 5 concise, specific observations and 3 actionable experiments. Do not invent numbers, do not promise profits.\n" + JSON.stringify(stats).slice(0, 8000) }] }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || "Anthropic error");
    return new Response(JSON.stringify({ text: j.content?.[0]?.text ?? "" }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } }); }
});
