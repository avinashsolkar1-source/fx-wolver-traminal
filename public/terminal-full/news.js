/* FX WOLVER news (v4.5): real headlines from /api/news (Yahoo Finance, no key). If the feed is not reachable, clearly labelled SAMPLE placeholders are shown instead. */
(function(){try{
var d=document,$=function(s){return d.querySelector(s)},API=((window.FXW_CONFIG||{}).API||'');
var mode='sym',cache={},boxes=[],curSym='';
var CLS={forex:'forex',comm:'commodities',index:'stock market',crypto:'bitcoin',stocks:'stock market'};
function ago(ts){if(!ts)return'';var s=Math.max(0,Date.now()/1000-ts),m=Math.floor(s/60);return m<1?'now':m<60?m+' min ago':m<1440?Math.floor(m/60)+' h ago':Math.floor(m/1440)+' d ago'}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function query(){var i=typeof active!=='undefined'?active:null;if(!i)return'forex';return mode==='sym'?(typeof ysym==='function'?ysym(i):i.symbol):(CLS[i.cat]||'markets')}
function sample(){var i=typeof active!=='undefined'?active:{symbol:'the market'};return[['Sample headline: price action for '+i.symbol+' will appear here once the news feed is connected'],['Sample headline: central bank decisions and economic data move currencies'],['Sample headline: company results and market news'],['Sample headline: how to connect real news: run the FX WOLVER server or deploy with Netlify / Vercel functions']].map(function(a){return{t:a[0],src:'SAMPLE',url:'',ts:0,smp:1}})}
function load(q,cb){var c=cache[q];if(c&&Date.now()-c.at<120000)return cb(c.d,c.ok);
 fetch(API+'/api/news?s='+encodeURIComponent(q),{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){if(!j||!j.length)throw 0;cache[q]={d:j,ok:1,at:Date.now()};cb(j,1)}).catch(function(){var s=sample();cache[q]={d:s,ok:0,at:Date.now()-90000};cb(s,0)})}
function draw(el){var q=query();load(q,function(items,ok){var h='<div class="nbar"><button data-m="sym" class="'+(mode==='sym'?'on':'')+'">'+(typeof active!=='undefined'?active.symbol:'Symbol')+'</button><button data-m="mkt" class="'+(mode==='mkt'?'on':'')+'">Market</button><span class="nst '+(ok?'ok':'sm')+'">'+(ok?'LIVE NEWS':'SAMPLE')+'</span></div>';
 h+=items.slice(0,12).map(function(n){var tag=n.url?'a href="'+esc(n.url)+'" target="_blank" rel="noopener noreferrer"':'div';var end=n.url?'a':'div';return'<'+tag+' class="nit'+(n.smp?' smp':'')+'"><b>'+esc(n.t)+'</b><small><i>'+esc(n.src||'')+'</i><span>'+ago(n.ts)+'</span></small></'+end+'>'}).join('');
 if(!items.length)h+='<div class="nemp">No headlines right now.</div>';el.innerHTML=h;
 [].forEach.call(el.querySelectorAll('[data-m]'),function(b){b.onclick=function(){mode=b.dataset.m;refresh()}})})}
function refresh(){boxes.forEach(function(b){if(b.offsetParent!==null||b.closest('#newsOv.show'))draw(b)})}
/* panel under the watchlist: a News tab next to Calendar / Heatmap / Instrument */
var tabs=$('.tabs2'),ib=$('#ibody');
if(tabs&&ib){var nb=d.createElement('button');nb.dataset.a='news';nb.className='on';nb.innerHTML='📰 News';tabs.insertBefore(nb,tabs.firstChild);
 var nbody=d.createElement('div');nbody.className='nbody';nbody.id='nbody';ib.parentNode.insertBefore(nbody,ib);boxes.push(nbody);
 var ins=[].filter.call(tabs.children,function(b){return/Instrument/.test(b.textContent)})[0];
 function show(w){nbody.style.display=w==='news'?'':'none';ib.style.display=w==='news'?'none':'';nb.classList.toggle('on',w==='news');if(ins)ins.classList.toggle('on',w!=='news');if(w==='news')refresh()}
 ib.style.display='none';if(ins)ins.classList.remove('on');
 tabs.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b===nb)show('news');else if(b===ins)show('ins')});
 /* the old Instrument tab opened nothing, so the i dialog is the main info; keep the grid here too */}
/* phones: News in the side menu opens an overlay */
var ov=d.createElement('div');ov.className='ov';ov.id='newsOv';ov.innerHTML='<div class="nwrap"><div class="nh"><b>📰 News</b><button aria-label="Close">×</button></div><div class="nbody" id="nbody2"></div></div>';d.body.appendChild(ov);boxes.push($('#nbody2'));
ov.onclick=function(e){if(e.target===ov||e.target.closest('.nh button'))ov.classList.remove('show')};
var sm=$('#fxwSide'),lo=$('#fxwLogoutBtn');if(sm&&lo){var x=d.createElement('button');x.className='fxx';x.textContent='📰 News';x.onclick=function(){var c=$('#fxwSideClose');if(c)c.click();ov.classList.add('show');refresh()};sm.insertBefore(x,lo)}
setInterval(function(){var s=($('#tSym')||{}).textContent||'';if(s&&s!==curSym){curSym=s;refresh()}},800);
setInterval(function(){cache={};refresh()},120000);
setTimeout(refresh,1500);
window.FXWNEWS={refresh:refresh,open:function(){ov.classList.add('show');refresh()}};
}catch(e){console.error('FXW news',e)}})();
