/* FX WOLVER v4.8: phone quick-nav icons, sound for fills / SL / TP (can be switched off). */
(function(){try{
var d=document,$=function(s){return d.querySelector(s)},$$=function(s){return[].slice.call(d.querySelectorAll(s))};
function click(s){var e=$(s);if(e)e.click()}
function sg(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
var I=function(p){return'<svg viewBox="0 0 24 24">'+p+'</svg>'};
/* ---------- phone: icon bar under the header ---------- */
var tb=$('.topbar'),app=$('#app');
if(tb&&app){var P=d.createElement('nav');P.id='pnav';P.setAttribute('aria-label','Quick navigation');
 var it=[['markets','Watchlist',I('<path d="M4 6h16M4 12h16M4 18h10"/>')],['chart','Chart',I('<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7"/>')],['trades','Trades',I('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>')],['news','News',I('<path d="M5 5h11v14H7a2 2 0 01-2-2zM16 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5"/>')],['heat','Heatmap',I('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>')],['an','Analytics',I('<path d="M12 3v9h9"/><path d="M20 15a9 9 0 11-11-11"/>')],['cal','Calendar',I('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>')],['jr','Journal',I('<path d="M6 4h11a1 1 0 011 1v15H7a1 1 0 01-1-1zM9 8h6M9 12h6"/>')],['snd','Sound',I('<path d="M5 9v6h4l5 4V5L9 9zM17 9a4 4 0 010 6"/>')]];
 P.innerHTML=it.map(function(a){return'<button data-a="'+a[0]+'" aria-label="'+a[1]+'">'+a[2]+'<span>'+a[1]+'</span></button>'}).join('');
 tb.parentNode.insertBefore(P,tb.nextSibling);
 P.onclick=function(e){var b=e.target.closest('button');if(!b)return;var a=b.dataset.a;
  if(a==='markets'||a==='chart'||a==='trades')click('#mobnav [data-v="'+a+'"]');
  else if(a==='news'){if(window.FXWNEWS)FXWNEWS.open()}
  else if(a==='heat')click('#ovBtn');else if(a==='an')click('[data-ov="fxwAnalytics"]');else if(a==='cal')click('[data-ov="fxwCal"]');else if(a==='jr')click('[data-ov="fxwJournal"]');else if(a==='snd')toggleSnd()}
 function sync(){var v=app.dataset.view;$$('#pnav button').forEach(function(b){var a=b.dataset.a;if(a==='markets'||a==='chart'||a==='trades')b.classList.toggle('on',a===v);if(a==='snd')b.classList.toggle('off',snd==='0')})}
 setInterval(sync,500)}
/* ---------- sound: fills, Stop Loss and Take Profit ---------- */
var snd=sg('fxw.snd')==='0'?'0':'1',ac=null;
function tone(seq){if(snd==='0')return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();var t=ac.currentTime;seq.forEach(function(n,k){var o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=n[0];g.gain.setValueAtTime(0.0001,t+k*.11);g.gain.exponentialRampToValueAtTime(.12,t+k*.11+.02);g.gain.exponentialRampToValueAtTime(.0001,t+k*.11+n[1]);o.connect(g);g.connect(ac.destination);o.start(t+k*.11);o.stop(t+k*.11+n[1]+.02)})}catch(e){}}
window.FXWSND=function(seq){tone(seq)};
function unlock(){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume()}catch(e){}}
['pointerdown','keydown','touchstart'].forEach(function(ev){d.addEventListener(ev,unlock,{passive:true})});
/* internet lost / back: sound and a clear bar; sounds are generated on the device, so they work offline. Orders on real prices pause while offline. */
var ob=d.createElement('div');ob.id='offBar';ob.innerHTML='<i></i><span id="offTx"></span>';d.body.appendChild(ob);var offT=null;
function posN(){try{return acct.positions.length}catch(e){return 0}}
function goOff(){ob.classList.add('show');$('#offTx').textContent='No internet. Prices are paused'+(posN()?' and you have '+posN()+' open trade(s)':'')+'. New orders on real prices are blocked until it is back.';tone([[440,.18],[330,.18],[220,.3]]);clearInterval(offT);offT=setInterval(function(){if(navigator.onLine===false){$('#offTx').textContent='No internet. Prices are paused'+(posN()?' and you have '+posN()+' open trade(s)':'')+'. New orders on real prices are blocked until it is back.';if(posN())tone([[330,.15],[330,.15]])}else clearInterval(offT)},20000)}
function goOn(){clearInterval(offT);ob.classList.remove('show');if(typeof toast==='function')toast('Back online');tone([[523,.12],[659,.12],[880,.2]])}
addEventListener('offline',goOff);addEventListener('online',goOn);if(navigator.onLine===false)setTimeout(goOff,800);
if(typeof trade==='function'){var _tr=trade;window.trade=trade=function(side){if(navigator.onLine===false&&typeof active!=='undefined'&&active.src!=='SAMPLE'){if(typeof toast==='function')toast('No internet: orders on real prices are paused',1);tone([[300,.2]]);return}return _tr.apply(this,arguments)}}
function toggleSnd(){snd=snd==='1'?'0':'1';sg('fxw.snd',snd);if(typeof toast==='function')toast('Sound '+(snd==='1'?'on':'off'));if(snd==='1')tone([[660,.12]]);$$('#sndBtn').forEach(function(b){b.classList.toggle('off',snd==='0')})}
if(typeof toast==='function'){var _t=toast;window.toast=toast=function(m,e){_t(m,e);var s=String(m||'');if(/Stop Loss hit/.test(s))tone([[330,.16],[220,.22]]);else if(/Take Profit hit/.test(s))tone([[660,.12],[880,.2]]);else if(/\(paper trade\)/.test(s))tone([[560,.1],[740,.14]])}}
/* order messages on/off: when off, normal toasts are hidden (errors still show); the journal log is untouched */
var msg=(function(){try{return localStorage.getItem('fxw.msg')}catch(e){return null}})()||'1';
function paintMsg(){$$('#msgBtn,#msgMenu').forEach(function(b){b.classList.toggle('off',msg==='0');if(b.id==='msgMenu')b.textContent='💬 Order messages: '+(msg==='1'?'ON':'OFF')})}
if(typeof toast==='function'){var _t2=toast;window.toast=toast=function(m,e){_t2(m,e);if(msg==='0'&&!e){var t=d.getElementById('toast');if(t)t.classList.remove('show')}}}
function toggleMsg(){var was=msg;msg=msg==='1'?'0':'1';sg('fxw.msg',msg);paintMsg();if(msg==='1'&&typeof toast==='function')toast('Order messages on')}
var rl=$('#rail');if(rl){var g2=rl.querySelector('.gap'),mb2=d.createElement('button');mb2.id='msgBtn';mb2.dataset.tip='Order messages on / off';mb2.setAttribute('aria-label','Order messages');mb2.innerHTML=I('<path d="M5 5h14v10H10l-4 4v-4H5z"/>');mb2.onclick=toggleMsg;if(g2)rl.insertBefore(mb2,g2.nextSibling)}
var sd=$('#fxwSide'),lo2=$('#fxwLogoutBtn');if(sd&&lo2){var mm=d.createElement('button');mm.className='fxx';mm.id='msgMenu';mm.onclick=function(){toggleMsg();click('#fxwSideClose')};sd.insertBefore(mm,lo2)}
paintMsg();
/* sound button in the laptop rail */
var rail=$('#rail');if(rail){var g=rail.querySelector('.gap'),b=d.createElement('button');b.id='sndBtn';b.dataset.tip='Sound on / off';b.setAttribute('aria-label','Sound');b.innerHTML=I('<path d="M5 9v6h4l5 4V5L9 9zM17 9a4 4 0 010 6"/>');b.classList.toggle('off',snd==='0');b.onclick=toggleSnd;if(g)rail.insertBefore(b,g.nextSibling)}
}catch(e){console.error('FXW final',e)}})();
