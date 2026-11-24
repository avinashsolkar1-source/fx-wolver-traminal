/* FX WOLVER terminal skin: builds the Match-Trader style layout around the existing chart, watchlist and order code. */
(function(){try{
var d=document,$=function(s){return d.querySelector(s)},app=$('#app'),body=$('.body'),mk=$('#paneMarkets'),op=$('#oppanel');
if(!app||!body||!mk)return;
function click(s){var e=$(s);if(e)e.click()}
/* left column: watchlist on top, symbol info below */
var left=d.createElement('div');left.className='leftcol';body.insertBefore(left,mk);left.appendChild(mk);
var info=d.createElement('section');info.className='infopanel';info.innerHTML='<div class="tabs2"><button data-a="cal">📅 Calendar</button><button data-a="mkt">🔥 Heatmap</button><button class="on">ⓘ Instrument</button></div><div class="ibody" id="ibody"></div>';left.appendChild(info);
info.querySelector('.tabs2').onclick=function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.a==='cal')click('[data-ov="fxwCal"]');if(b.dataset.a==='mkt')click('#ovBtn')};
var lastI='';function renderInfo(){if(typeof active==='undefined'||!active)return;var i=active,ps=0,mg=0,pv=0;try{ps=pipSize(i);mg=marginOf({sym:i.symbol,vol:1});pv=i.contract*(ps||1)*qRate(i)}catch(e){}
 var sp=i.live?(i.ask-i.bid):null,C=[['Details',i.name],['Symbol Class',typeof CAT_LABEL!=='undefined'?CAT_LABEL[i.cat]:i.cat],['Min. Position Size','0.01'],['Point Size',ps?ps:'1 point'],['Spread now',sp==null?'—':(ps?(sp/ps).toFixed(1)+' pips':sp.toFixed(i.digits))],['Margin for 1 lot',typeof money==='function'?money(mg):mg],['Nominal Value of 1 Lot',typeof money==='function'?money(mg*(typeof LEV!=='undefined'?LEV:100)):'—'],['Point Value of 1 Lot',typeof money==='function'?money(pv):pv],['Leverage','1 : '+(typeof LEV!=='undefined'?LEV:100)+' ('+(100/(typeof LEV!=='undefined'?LEV:100)).toFixed(2)+'%)']];
 var h=C.map(function(c){return'<div class="icard"><span>'+c[0]+'</span><b>'+c[1]+'</b></div>'}).join('');if(h!==lastI){lastI=h;$('#ibody').innerHTML=h}}
/* header: Trade / Analytics / Explore tabs, Profit + Equity with a caret for the rest */
var brand=$('.brand'),svg=function(p){return'<svg viewBox="0 0 24 24">'+p+'</svg>'},nav=d.createElement('div');nav.className='navtabs';
nav.innerHTML='<button class="on" data-a="t">'+svg('<path d="M5 20V10M12 20V4M19 20v-7"/>')+'<span>Trade</span></button><button data-a="an">'+svg('<path d="M12 3v9h9"/><path d="M20 15a9 9 0 11-11-11"/>')+'<span>Analytics</span></button><button data-a="ex">'+svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>')+'<span>Markets</span></button>';
if(brand)brand.after(nav);
nav.onclick=function(e){var b=e.target.closest('button');if(!b)return;var a=b.dataset.a;if(a==='an')click('[data-ov="fxwAnalytics"]');else if(a==='ex')click('#ovBtn');else if(op)op.classList.remove('open')};
[].forEach.call(d.querySelectorAll('.metric span'),function(s){if(/floating/i.test(s.textContent))s.textContent='Profit'});
var mt=$('.metrics'),car=d.createElement('button');car.className='mcaret';car.title='More account details';car.textContent='⌄';if(mt){mt.after(car);car.onclick=function(){mt.classList.toggle('all')}}
/* bottom tabs: Open Positions / Pending Orders / Closed Positions / Finance */
var nm={pos:'Positions',pend:'Orders',hist:'History',eq:'Performance'};
[].forEach.call(d.querySelectorAll('.ttab'),function(b){var t=nm[b.dataset.t];if(t&&b.firstChild&&b.firstChild.nodeType===3)b.firstChild.nodeValue=t});
var th=$('.ttab[data-t="hist"]'),tp=$('.ttab[data-t="pend"]');if(th&&tp&&th.parentNode)th.parentNode.insertBefore(tp,th);
/* quick trade card for the selected symbol (uses the existing BUY / SELL / lots controls) */
var q=d.createElement('div');q.id='qcard';
q.innerHTML='<div class="qh"><div class="qs"><b id="qSym">—</b><small id="qSpr">Spread: —</small></div></div><div class="qrow"><button class="qb s" id="qS"><small>SELL</small><b id="qSp">—</b></button><div class="ql"><b id="qL">0.10</b><small id="qU">—</small><div class="st"><button id="qM">−</button><button id="qP">+</button></div></div><button class="qb b" id="qB"><small>BUY</small><b id="qBp">—</b></button></div><div class="qf"><button class="qa" id="qA">⚙ Pro order ›</button><span class="sp"></span><button class="i" id="qI" title="Symbol information">ⓘ</button><button class="i" id="qAl" title="Price alert">🔔</button></div>';
mk.appendChild(q);
var L=$('#lots');function lotStep(v,up){var s=v<0.1-1e-9||(!up&&v<=0.1+1e-9)?0.01:(v<1-1e-9||(!up&&v<=1+1e-9))?0.05:0.1;return Math.max(0.01,Math.round((v+(up?s:-s))*100)/100)}
function setLots(v){if(!L)return;L.value=v.toFixed(2);L.dispatchEvent(new Event('input',{bubbles:true}));L.dispatchEvent(new Event('change',{bubbles:true}))}
q.querySelector('#qM').onclick=function(){if(L)setLots(lotStep(parseFloat(L.value)||0.1,false))};q.querySelector('#qP').onclick=function(){if(L)setLots(lotStep(parseFloat(L.value)||0.1,true))};
q.querySelector('#qS').onclick=function(){click('#bSell')};q.querySelector('#qB').onclick=function(){click('#bBuy')};q.querySelector('#qI').onclick=function(){click('#infoB')};q.querySelector('#qAl').onclick=function(){click('#alertB')};
function txt(s){var e=$(s);return e?e.textContent.trim():''}
function tick(){var s=txt('#tSym');if(!s)return;$('#qSym').textContent=s;var sp=txt('#chipSpread');$('#qSpr').textContent='Spread: '+(sp.replace(/^spread\s*:?\s*/i,'')||'—');$('#qSp').textContent=txt('#pSell')||'—';$('#qBp').textContent=txt('#pBuy')||'—';var v=parseFloat(L&&L.value)||0.1;$('#qL').textContent=v.toFixed(2);
 try{if(typeof active!=='undefined'&&active&&typeof marginOf==='function'&&typeof money==='function')$('#qU').textContent='≈ '+money(marginOf({sym:active.symbol,vol:v})*(typeof LEV!=='undefined'?LEV:100))}catch(e){}renderInfo()}
setInterval(tick,300);tick();
/* status bar details */
var sg=$('.status .grp2'),se=$('#sess'),sa=d.createElement('span');sa.id='stAcc';sa.className='hide-m';if(se&&se.parentNode)se.parentNode.insertBefore(sa,se.nextSibling);else if(sg)sg.appendChild(sa);
function stat(){var sd=$('#stData');if(sd)sd.classList.toggle('off',/offline|error|no data|failed|disconnect/i.test(sd.textContent));var lv=typeof LEV!=='undefined'?LEV:100;sa.textContent='PAPER · 1:'+lv+' · '+(txt('#nPos')||'0')+' open · margin '+(txt('#mLvl')||'—')}
setInterval(stat,1000);stat();
/* Advanced Order drawer */
if(op){var cl=d.createElement('button');cl.className='opclose';cl.textContent='✕';cl.title='Close';op.insertBefore(cl,op.firstChild);cl.onclick=function(){op.classList.remove('open')};
 q.querySelector('#qA').onclick=function(){op.classList.toggle('open')};d.addEventListener('keydown',function(e){if(e.key==='Escape')op.classList.remove('open')})}
/* help button + quick tour */
var ac=$('.acct'),mb=$('#fxwMenuBtn'),hb=d.createElement('button');hb.className='hbtn';hb.id='helpBtn';hb.title='Quick tour: how to use the terminal';if(ac)ac.insertBefore(hb,mb||ac.firstChild);
var T=d.createElement('div');T.id='tour';d.body.appendChild(T);var hl=[];
function steps(){var ph=innerWidth<=900,w={t:'Welcome to FX WOLVER',x:'A 30 second tour of the terminal. You can open it again any time with the ? button at the top.'},r={t:'You are ready',x:'This is a paper account with virtual money, so practice freely. Press ? any time for this tour.',end:1};
 return ph?[w,{t:'Three screens',x:'Use the bar at the bottom to switch between Markets, Chart and Trades.',s:'#mobnav',v:'markets'},{t:'Pick a market',x:'Tap a symbol. You can also set the lots and press SELL or BUY from the card at the top.',s:'#qcard',v:'markets'},{t:'Chart and orders',x:'Drag the chart to move it. Set lots, Stop Loss and Take Profit under the chart, then press SELL or BUY.',s:'#orderbar',v:'chart'},{t:'Your trades',x:'Open positions, pending orders and history are here. Close a trade with the ✕ button.',s:'.trades',v:'trades'},{t:'Menu',x:'Calendar, Journal, Analytics and the market overview are in the ☰ menu at the top.',s:'#fxwMenuBtn'},r]
 :[w,{t:'Pick a market',x:'Choose a category, type in the search box, or click any symbol in the watchlist. The chart switches to it.',s:'#paneMarkets .cats,#paneMarkets .search'},{t:'Buy or sell',x:'Set the lots with − and +, then press SELL or BUY. You always confirm before an order is placed.',s:'#qcard'},{t:'Read the chart',x:'Change the timeframe, chart type and indicators on top. Draw with the tools on the left. Drag the Stop Loss and Take Profit lines to adjust them.',s:'.chartpane'},{t:'Manage your trades',x:'Positions, orders, history and performance are here. Close a trade with the ✕ button.',s:'.trades'},{t:'More tools',x:'Analytics and Markets are in the top bar. Pro order opens limit and stop orders and the risk manager.',s:'.navtabs'},r]}
function endTour(){hl.forEach(function(e){e.classList.remove('tour-hl')});hl=[];T.classList.remove('show');try{localStorage.setItem('fxw.tour2','1')}catch(e){}if(innerWidth<=900)click('#mobnav [data-v="chart"]')}
function show(i){var S=steps(),s=S[i];hl.forEach(function(e){e.classList.remove('tour-hl')});hl=[];if(s.v)click('#mobnav [data-v="'+s.v+'"]');if(s.s)[].forEach.call(d.querySelectorAll(s.s),function(e){e.classList.add('tour-hl');hl.push(e)});
 T.innerHTML='<div class="tn">'+(i&&!s.end?'STEP '+i+' OF '+(S.length-2):'QUICK TOUR')+'</div><h4>'+s.t+'</h4><p>'+s.x+'</p><div class="tf"><div class="dots">'+S.map(function(_,k){return'<i class="'+(k===i?'on':'')+'"></i>'}).join('')+'</div>'+(i?'<button id="tB">Back</button>':'<button class="sk" id="tS">Skip</button>')+(s.end?'<button class="sk" id="tK">Shortcuts</button>':'')+'<button class="go" id="tN">'+(s.end?'Start trading':'Next')+'</button></div>';T.classList.add('show');
 var b=T.querySelector('#tB'),n=T.querySelector('#tN'),k=T.querySelector('#tS'),h=T.querySelector('#tK');if(b)b.onclick=function(){show(i-1)};if(k)k.onclick=endTour;if(h)h.onclick=function(){endTour();click('#hkBtn')};n.onclick=function(){s.end?endTour():show(i+1)}}
hb.onclick=function(){click('#fxwTourBtn')};
/* extra items in the side menu (handy on phones) */
var sm=$('#fxwSide'),lo=$('#fxwLogoutBtn');if(sm&&lo){[['🧭 Market overview','#ovBtn'],['⟳ Reset paper account','#resetTop']].forEach(function(a){var x=d.createElement('button');x.className='fxx';x.textContent=a[0];x.onclick=function(){click('#fxwSideClose');if(a[1])click(a[1]);else show(0)};sm.insertBefore(x,lo)})}
/* let the chart re-measure after the layout changed */
[60,400,1200].forEach(function(t){setTimeout(function(){dispatchEvent(new Event('resize'))},t)});
}catch(e){console.error('FXW skin',e)}})();
