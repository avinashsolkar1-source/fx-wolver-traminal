/* FX WOLVER look v4.6: wolf rail, watchlist sparklines, and the chart switch (Pro chart / TradingView) with a trade strip (SL, TP, risk). Look and extras only; trading code is untouched. */
(function(){try{
var d=document,$=function(s){return d.querySelector(s)},$$=function(s){return[].slice.call(d.querySelectorAll(s))};
function click(s){var e=$(s);if(e)e.click()}
function sg(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
/* ---------- wolf rail ---------- */
var body=$('.body');
if(body){var R=d.createElement('div');R.id='rail';
 var I=function(p){return'<svg viewBox="0 0 24 24">'+p+'</svg>'};
 var items=[['trade','Trade',I('<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7"/>')],['mk','Market overview',I('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>')],['news','News',I('<path d="M5 5h11v14H7a2 2 0 01-2-2zM16 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5"/>')],['cal','Calendar',I('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>')],['an','Analytics',I('<path d="M12 3v9h9"/><path d="M20 15a9 9 0 11-11-11"/>')],['jr','Journal',I('<path d="M6 4h11a1 1 0 011 1v15H7a1 1 0 01-1-1zM9 8h6M9 12h6"/>')],['pro','Pro order',I('<path d="M12 8a4 4 0 100 8 4 4 0 000-8zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>')],['gap'],['help','Quick tour',I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2M12 17h.01"/>')]];
 R.innerHTML=items.map(function(a){return a[0]==='gap'?'<span class="gap"></span>':'<button data-a="'+a[0]+'" data-tip="'+a[1]+'" aria-label="'+a[1]+'">'+a[2]+'</button>'}).join('');
 body.insertBefore(R,body.firstChild);
 R.querySelector('[data-a=trade]').classList.add('on');
 R.onclick=function(e){var b=e.target.closest('button');if(!b)return;var a=b.dataset.a;
  if(a==='mk')click('#ovBtn');else if(a==='news')click('.tabs2 [data-a=news]');else if(a==='cal')click('[data-ov="fxwCal"]');else if(a==='an')click('[data-ov="fxwAnalytics"]');else if(a==='jr')click('[data-ov="fxwJournal"]');else if(a==='pro')click('#qA');else if(a==='help')click('#helpBtn');else{var op=$('#oppanel');if(op)op.classList.remove('open')}}}
/* ---------- sparklines in the watchlist ---------- */
var mc=$('.mw-cols');if(mc&&mc.children[0]){mc.children[0].insertAdjacentHTML('afterend','<span></span>')}
var H={};
function spark(){if(typeof INSTRUMENTS==='undefined')return;INSTRUMENTS.forEach(function(i){if(!i.live)return;var a=H[i.symbol]||(H[i.symbol]=[]);a.push(i.mid);if(a.length>40)a.shift()});paintSpark()}
function paintSpark(){$$('.mw-row').forEach(function(r){var s=r.dataset.sym,a=H[s],sp=r.querySelector('.spk');if(!sp){sp=d.createElement('div');sp.className='spk';var bid=r.querySelector('.bid');if(bid)r.insertBefore(sp,bid)}
 if(!a||a.length<3){sp.innerHTML='';return}var mn=Math.min.apply(0,a),mx=Math.max.apply(0,a),rg=(mx-mn)||1,pts=a.map(function(v,k){return(k/(a.length-1)*46).toFixed(1)+','+(24-(v-mn)/rg*22).toFixed(1)}).join(' ');
 sp.innerHTML='<svg viewBox="0 0 46 26"><polyline class="'+(a[a.length-1]>=a[0]?'u':'d')+'" points="'+pts+'"/></svg>'})}
var c0=0,iv0=setInterval(function(){spark();if(++c0>4)clearInterval(iv0)},700);
setInterval(spark,3000);
/* ---------- chart switch: Pro chart / TradingView ---------- */
var cw=$('#cwrap'),cp=$('.chartpane'),ct=$('.ctool');
if(cw&&cp&&ct){
 var sw=d.createElement('div');sw.className='cmode';sw.innerHTML='<button data-m="pro" class="on">◢ Pro chart</button><button data-m="tv">TradingView</button>';ct.insertBefore(sw,ct.firstChild);
 var TV=d.createElement('div');TV.id='tvwrap';TV.innerHTML='<div id="tvc"><div id="tvmsg"></div></div>';cw.appendChild(TV);
 var MAP={XAUUSD:'OANDA:XAUUSD',XAGUSD:'OANDA:XAGUSD',XPTUSD:'OANDA:XPTUSD',XPDUSD:'OANDA:XPDUSD',USOIL:'TVC:USOIL',UKOIL:'TVC:UKOIL',NATGAS:'NYMEX:NG1!',COPPER:'COMEX:HG1!',US30:'TVC:DJI',US500:'FOREXCOM:SPXUSD',NAS100:'FOREXCOM:NSXUSD',US2000:'TVC:RUT',GER40:'TVC:DAX',UK100:'TVC:UKX',FRA40:'TVC:CAC40',EU50:'TVC:SX5E',ESP35:'TVC:IBEX35',JP225:'TVC:NI225',AUS200:'TVC:XJO',HK50:'TVC:HSI'};
 var IVM={'1m':'1','5m':'5','15m':'15','1H':'60','4H':'240','1D':'D'};
 function tvSym(i){return i.cat==='forex'?'FX:'+i.symbol:i.cat==='crypto'?'BINANCE:'+i.symbol:MAP[i.symbol]||i.symbol}
 var mode=sg('fxw.cmode')==='tv'?'tv':'pro',built='',loading=false,lib=null;
 function msg(h){var m=$('#tvmsg');m.innerHTML=h;m.style.display='flex'}
 function loadLib(cb){if(window.TradingView)return cb(1);if(lib){lib.push(cb);return}lib=[cb];var s=d.createElement('script');s.src='https://s3.tradingview.com/tv.js';s.async=true;s.onload=function(){var q=lib;lib=null;q.forEach(function(f){f(1)})};s.onerror=function(){var q=lib;lib=null;q.forEach(function(f){f(0)})};d.head.appendChild(s)}
 function build(force){if(mode!=='tv'||typeof active==='undefined')return;var sym=tvSym(active),ivl=IVM[(typeof tf!=='undefined'&&tf[0])||'1H']||'60',key=sym+'|'+ivl;if(!force&&key===built)return;
  var host=$('#tvc'),old=host.querySelector('.tvh');if(old)old.remove();$('#tvmsg').style.display='none';
  loadLib(function(ok){if(mode!=='tv')return;if(!ok||!window.TradingView){msg('<div><b>TradingView chart could not load</b>It needs an internet connection and TradingView must not be blocked on this network or browser.<br>Your Pro chart still works.<br><button id="tvBack">Back to Pro chart</button></div>');var b=$('#tvBack');if(b)b.onclick=function(){setMode('pro')};return}
   var o=d.createElement('div');o.className='tvh';o.id='tvh'+Date.now();o.style.cssText='position:absolute;inset:0';host.insertBefore(o,host.firstChild);
   try{new TradingView.widget({container_id:o.id,autosize:true,symbol:sym,interval:ivl,timezone:'Etc/UTC',theme:'dark',style:'1',locale:'en',toolbar_bg:'#0b1220',enable_publishing:false,allow_symbol_change:false,hide_side_toolbar:false,withdateranges:true,save_image:true,backgroundColor:'#060a12',gridColor:'rgba(42,60,96,0.35)'});built=key}catch(e){msg('<div><b>TradingView chart error</b>'+String(e.message||e)+'<br><button id="tvBack">Back to Pro chart</button></div>');var b=$('#tvBack');if(b)b.onclick=function(){setMode('pro')}}})}
 function setMode(m){mode=m;sg('fxw.cmode',m);$$('.cmode button').forEach(function(b){b.classList.toggle('on',b.dataset.m===m)});cw.classList.toggle('tvmode',m==='tv');cp.classList.toggle('tvmode',m==='tv');if(m==='tv'){built='';build(true)}strip();if(m==='tv'){}else{setTimeout(function(){dispatchEvent(new Event('resize'))},60)}}
 sw.onclick=function(e){var b=e.target.closest('button');if(b&&b.dataset.m!==mode)setMode(b.dataset.m)};
 /* trade strip: SELL / lots / BUY, Stop Loss, Take Profit, risk and reward, open positions of this symbol */
 var S=d.createElement('div');S.id='tvstrip';S.className='dock';var ob=$('#orderbar');if(ob)cp.insertBefore(S,ob);else cp.appendChild(S);S.innerHTML='<button class="tb s" id="tS"><small>SELL</small><b id="tSp">—</b></button><div class="lt"><button id="tM">−</button><input id="tL" type="number" step="0.01" min="0.01"><button id="tP">+</button></div><div class="lc" id="tLC"><button data-l="0.01">0.01</button><button data-l="0.10">0.1</button><button data-l="0.50">0.5</button><button data-l="1">1</button></div><button class="tb b" id="tB"><small>BUY</small><b id="tBp">—</b></button><label class="fl sl"><span>SL</span><input id="tSL" type="number" step="any" placeholder="price"></label><label class="fl tp"><span>TP</span><input id="tTP" type="number" step="any" placeholder="price"></label><div class="rr" id="tRR"></div><div class="xb"><button id="tBL" title="Long box on the chart: entry, SL and target">▲ Long</button><button id="tBS" title="Short box on the chart">▼ Short</button><button id="tCS" title="Close every open position of this symbol (asks first)">Close all</button><button id="tPO" title="Limit / stop orders, risk manager">⚙ Pro</button></div><div class="pz" id="tPZ"></div><div class="nt">TradingView draws its own chart and cannot show your SL / TP lines on it. Set them here. On the Pro chart you can also drag them on the chart.</div>';
 $('#tBL').onclick=function(){setMode('pro');click('#boxL')};$('#tBS').onclick=function(){setMode('pro');click('#boxS')};$('#tPO').onclick=function(){click('#qA')};
 $('#tCS').onclick=function(){if(typeof askClose==='function'&&typeof acct!=='undefined')askClose(acct.positions.filter(function(p){return p.sym===active.symbol}).map(function(p){return p.id}))};
 var L=$('#lots'),SL=$('#sl'),TP=$('#tp');
 function setV(el,v){if(!el)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
 function step(up){var v=parseFloat(L.value)||0.1,s=v<0.1-1e-9||(!up&&v<=0.1+1e-9)?0.01:(v<1-1e-9||(!up&&v<=1+1e-9))?0.05:0.1;setV(L,(Math.max(0.01,Math.round((v+(up?s:-s))*100)/100)).toFixed(2))}
 $('#tM').onclick=function(){step(false)};$('#tLC').onclick=function(e){var b=e.target.closest('[data-l]');if(b)setV(L,(+b.dataset.l).toFixed(2))};$('#tP').onclick=function(){step(true)};$('#tS').onclick=function(){click('#bSell')};$('#tB').onclick=function(){click('#bBuy')};
 $('#tL').onchange=function(){setV(L,(Math.max(0.01,parseFloat(this.value)||0.01)).toFixed(2))};$('#tSL').oninput=function(){if(SL)SL.value=this.value};$('#tTP').oninput=function(){if(TP)TP.value=this.value};
 function strip(){if(typeof active==='undefined'||!S.offsetParent)return;var i=active,v=parseFloat(L.value)||0.1,fx=function(x){return x.toFixed(i.digits)};
  $('#tSp').textContent=i.live?fx(i.bid):'—';$('#tBp').textContent=i.live?fx(i.ask):'—';
  var a=d.activeElement;if(a!==$('#tL'))$('#tL').value=v.toFixed(2);if(a!==$('#tSL'))$('#tSL').value=SL?SL.value:'';if(a!==$('#tTP'))$('#tTP').value=TP?TP.value:'';
  var sl=+(SL&&SL.value)||0,tp=+(TP&&TP.value)||0,U=0;try{U=i.contract*v*qRate(i)}catch(e){}var px=i.mid,rk=sl?Math.abs(px-sl)*U:0,rw=tp?Math.abs(tp-px)*U:0;
  $('#tRR').innerHTML='<span>Risk <b class="n">'+(sl?money(-rk):'—')+'</b></span><span>Reward <b class="p">'+(tp?money(rw,true):'—')+'</b></span><span>R:R <b>'+(sl&&tp&&rk?'1 : '+(rw/rk).toFixed(2):'—')+'</b></span>';
  var ps=(typeof acct!=='undefined'?acct.positions:[]).filter(function(p){return p.sym===i.symbol});
  $('#tPZ').innerHTML=ps.map(function(p){var r=0;try{r=pnl(p)}catch(e){}return'<span><b class="'+p.type.toLowerCase()+'">'+p.type+'</b> '+p.vol.toFixed(2)+' @ '+fx(p.open)+' · SL '+(p.sl?fx(p.sl):'—')+' · TP '+(p.tp?fx(p.tp):'—')+' · <b class="'+(r>=0?'buy':'sell')+'">'+money(r,true)+'</b></span>'}).join('')}
 setInterval(function(){strip();if(mode==='tv')build(false)},700);
 setMode(mode);
}

/* ---------- maximize / minimize the chart ---------- */
var app=$('#app'),ctr=$('.center');
if(cp&&ct&&app){var mm=d.createElement('div');mm.className='cmm';mm.innerHTML='<button data-s="min" title="Minimize chart: more room for trades">▁</button><button data-s="norm" title="Normal size">▭</button><button data-s="max" title="Maximize chart (Esc to go back)">⤢</button>';ct.appendChild(mm);
 var st=sg('fxw.csize')||'norm';
 function size(v){st=v;sg('fxw.csize',v);cp.classList.toggle('max',v==='max');if(ctr)ctr.classList.toggle('cmin',v==='min');d.body.classList.toggle('chartmax',v==='max');$$('.cmm button').forEach(function(b){b.classList.toggle('on',b.dataset.s===v)});var dt=$('#dtools');if(dt)dt.classList.toggle('wide',dt.dataset.w==='1');[60,300].forEach(function(t){setTimeout(function(){dispatchEvent(new Event('resize'))},t)})}
 mm.onclick=function(e){var b=e.target.closest('button');if(b)size(b.dataset.s)};
 d.addEventListener('keydown',function(e){if(e.key==='Escape'&&st==='max')size('norm');if((e.key==='m'||e.key==='M')&&!/input|textarea|select/i.test(e.target.tagName||'')&&!e.ctrlKey&&!e.metaKey)size(st==='max'?'norm':'max')});
 size(st==='max'?'norm':st)}
/* ---------- drawing tools: labelled, grouped like a pro charting tool ---------- */
var dt=$('#dtools');
if(dt){var ic=function(p){return'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'};
 var T=[['G','Cursor'],['cursor','Cursor / select',ic('<path d="M12 3v18M3 12h18"/>'),'Esc'],
 ['G','Lines'],['t','Trend line',ic('<path d="M4 19L20 5"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="5" r="1.6"/>')],['y','Ray',ic('<circle cx="5" cy="17" r="1.6"/><path d="M5 17L21 6"/>')],['h','Horizontal line',ic('<path d="M3 12h18"/>')],['v','Vertical line',ic('<path d="M12 3v18"/>')],['w','Arrow',ic('<path d="M5 19L19 5M10 5h9v9"/>')],
 ['G','Shapes'],['r','Zone / box',ic('<rect x="4" y="6" width="16" height="12" rx="1"/>')],['f','Fibonacci retracement',ic('<path d="M3 5h18M3 10h18M3 15h18M3 20h18"/>'),'Fib'],['x','Text label',ic('<path d="M6 6h12M12 6v13M9 19h6"/>')],
 ['G','Measure'],['m','Measure: pips, %, bars',ic('<path d="M3 17L17 3l4 4L7 21z"/><path d="M8 12l2 2M11 9l2 2M14 6l2 2"/>')],
 ['G','Trade'],['bl','Long box: entry, SL, target','<b style="font:800 11px var(--mono);color:#19c37d">L▲</b>','B'],['bs','Short box: entry, SL, target','<b style="font:800 11px var(--mono);color:#f0455a">S▼</b>','S'],['a','Price alert',ic('<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 21h4"/>'),'A'],
 ['G','Edit'],['undo','Undo last drawing',ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>')],['clear','Clear all drawings',ic('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>')]];
 dt.innerHTML='<button class="dtw" id="dtW" title="Show or hide tool names"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h10M4 17h16"/></svg></button>'+T.map(function(a){return a[0]==='G'?'<hr><em>'+a[1]+'</em>':'<button data-tool="'+a[0]+'" title="'+a[1]+(a[3]?' ('+a[3]+')':'')+'"'+(a[0]==='cursor'?' class="on"':'')+'>'+a[2]+'<span class="lb">'+a[1]+(a[3]?'<kbd>'+a[3]+'</kbd>':'')+'</span></button>'}).join('');
 dt.dataset.w=sg('fxw.dtw')==='1'?'1':'0';if(dt.dataset.w==='1')dt.classList.add('wide');
 $('#dtW').onclick=function(e){e.stopPropagation();var w=dt.dataset.w==='1'?'0':'1';dt.dataset.w=w;sg('fxw.dtw',w);dt.classList.toggle('wide',w==='1')}}
[300,1200].forEach(function(t){setTimeout(function(){dispatchEvent(new Event('resize'))},t)});
}catch(e){console.error('FXW look',e)}})();
