// FXWOLVER on Cloudflare Pages: serves the site and the data routes /api/quotes, /api/candles, /api/news, /api/events.
// Drag-and-drop upload works: this single file is the "advanced mode" worker. Real prices come from Yahoo Finance (stooq fallback).
const H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',Accept:'application/json'};
async function yj(p){for(const h of ['query1','query2']){try{const r=await fetch('https://'+h+'.finance.yahoo.com'+p,{headers:H,signal:AbortSignal.timeout(7000)});if(r.ok)return await r.json();}catch(e){}}return null;}
const cache=new Map();
async function cached(k,ttl,fn){const c=cache.get(k);if(c&&Date.now()-c.ts<ttl)return c.d;const d=await fn();if(d){cache.set(k,{d,ts:Date.now()});if(cache.size>800)cache.delete(cache.keys().next().value);return d;}return c?c.d:null;}
const res0=j=>j&&j.chart&&j.chart.result&&j.chart.result[0];
const SQ=s=>s.endsWith('=X')?s.slice(0,-2).toLowerCase():/^[A-Z]+$/.test(s)?s.toLowerCase()+'.us':null;
async function stooq(s){const q=SQ(s);if(!q)return null;try{const r=await fetch('https://stooq.com/q/l/?s='+q+'&f=sd2t2cp&h&e=csv',{headers:H,signal:AbortSignal.timeout(6000)});const t=(await r.text()).trim().split('\n')[1];if(!t)return null;const a=t.split(','),px=parseFloat(a[3]);if(!px)return null;const ts=Date.parse(a[1]+'T'+a[2]+'Z')/1000-3600;return{p:px,prev:parseFloat(a[4])||null,t:isNaN(ts)?Math.floor(Date.now()/1000):ts};}catch(e){return null;}}
const quote=s=>cached('q'+s,s.endsWith('=X')?4000:9000,async()=>{const m=(res0(await yj('/v8/finance/chart/'+encodeURIComponent(s)+'?interval=1m&range=1d'))||{}).meta;return m&&m.regularMarketPrice?{p:m.regularMarketPrice,prev:m.chartPreviousClose||m.previousClose||null,t:m.regularMarketTime}:await stooq(s);});
// Free Yahoo chart history is provider-limited: 1m is only a few days, intraday ranges are limited, daily can reach 5y.
// For full 5y intraday backtests, import licensed/provider CSV history via the Backtest Market Data page.
const IV={'1m':['1m','5d'],'5m':['5m','1mo'],'15m':['15m','1mo'],'30m':['30m','1mo'],'1h':['60m','2y'],'4h':['60m','2y'],'1d':['1d','5y']};
const candles=(s,i)=>cached('c'+s+i,i==='1m'?10000:30000,async()=>{
  const[iv,rg]=IV[i]||IV['1h'],r=res0(await yj('/v8/finance/chart/'+encodeURIComponent(s)+'?interval='+iv+'&range='+rg));
  if(!r||!r.timestamp)return null;const q=r.indicators.quote[0];let out=[];
  r.timestamp.forEach((t,k)=>{if(q.close[k]==null||q.open[k]==null)return;out.push({time:t,open:q.open[k],high:q.high[k],low:q.low[k],close:q.close[k],volume:q.volume[k]||0});});
  if(i==='4h'){const b=new Map();out.forEach(c=>{const k=Math.floor(c.time/14400)*14400,x=b.get(k);if(!x)b.set(k,{...c,time:k});else{x.high=Math.max(x.high,c.high);x.low=Math.min(x.low,c.low);x.close=c.close;x.volume+=c.volume;}});out=[...b.values()];}
  return out.slice(-500);});
const news=q=>cached('n'+q,120000,async()=>{const j=await yj('/v1/finance/search?q='+encodeURIComponent(q)+'&quotesCount=0&newsCount=12&enableFuzzyQuery=false');const a=(j&&j.news)||[];if(!a.length)return null;const seen=new Set();return a.filter(n=>n.title&&n.link&&!seen.has(n.title)&&seen.add(n.title)).map(n=>({t:n.title,src:n.publisher||'',url:n.link,ts:n.providerPublishTime||0})).sort((x,y)=>y.ts-x.ts)});
const J=(d,status=200,cc='no-store')=>new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':cc,'Access-Control-Allow-Origin':'*'}});
export default{async fetch(req,env){
  const u=new URL(req.url),p=u.pathname.replace(/\/+$/,'');
  if(p==='/api/quotes'){const o={};await Promise.all(String(u.searchParams.get('s')||'').split(',').filter(Boolean).slice(0,150).map(async s=>{o[s]=await quote(s)}));return J(o,200,'public, max-age=3');}
  if(p==='/api/candles'){const d=await candles(String(u.searchParams.get('s')||''),String(u.searchParams.get('i')||'1h'));return J(d||[],d?200:502,'public, max-age=10');}
  if(p==='/api/news'){const d=await news(String(u.searchParams.get('s')||u.searchParams.get('q')||'forex').slice(0,40));return J(d||[],d?200:502,'public, max-age=60');}
  if(p==='/api/events'){return J(req.method==='POST'?{ok:true,stored:false}:[]);}
  if(p.startsWith('/api/'))return J({error:'not found'},404);
  return env.ASSETS.fetch(req);}};
