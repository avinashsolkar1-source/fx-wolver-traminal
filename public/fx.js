(function(){var d=document,rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
/* split headings into words that slide up */
[].forEach.call(d.querySelectorAll('h2'),function(h){if(h.dataset.sw||h.children.length)return;h.dataset.sw=1;var k=0;h.innerHTML=h.textContent.split(' ').map(function(w){return'<span class="sw"><i style="--k:'+(k++)+'">'+w.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</i></span>'}).join(' ');
 new IntersectionObserver(function(e,o){if(e[0].isIntersecting){h.classList.add('in');o.disconnect()}},{threshold:.4}).observe(h)});
/* hero canvas: drifting price paths */
var hero=d.querySelector('.hero,.ph');if(hero&&!rm){var c=d.createElement('canvas');c.id='hc';hero.insertBefore(c,hero.firstChild);var x=c.getContext('2d'),W,H,L=[],dpr=Math.min(2,devicePixelRatio||1);
 function rs(){W=c.width=hero.clientWidth*dpr;H=c.height=hero.clientHeight*dpr}rs();addEventListener('resize',rs);
 for(var i=0;i<4;i++){var p=[],v=.5;for(var j=0;j<120;j++){v+= (Math.random()-.5)*.06;v=Math.max(.15,Math.min(.85,v));p.push(v)}L.push({p:p,s:.12+i*.05,o:i*.07,c:i%2?'25,195,125':'47,128,255'})}
 var t0=0;(function f(t){if(d.hidden){requestAnimationFrame(f);return}x.clearRect(0,0,W,H);L.forEach(function(l,li){var sh=(t*l.s*.01)%1;x.beginPath();var n=l.p.length;for(var j=0;j<n;j++){var q=l.p[(j+Math.floor(sh*n))%n],px=j/(n-1)*W,py=(q*.6+l.o+.1)*H;j?x.lineTo(px,py):x.moveTo(px,py)}x.strokeStyle='rgba('+l.c+','+(.28-li*.04)+')';x.lineWidth=1.5*dpr;x.stroke()});requestAnimationFrame(f)})(0)}
/* cursor ring */
if(!rm&&matchMedia('(hover:hover)').matches){var r=d.createElement('div');r.id='cur';d.body.appendChild(r);var cx=0,cy=0,tx=0,ty=0;addEventListener('mousemove',function(e){tx=e.clientX;ty=e.clientY;r.classList.add('on');r.classList.toggle('h',!!e.target.closest('a,button,.path,.bx,.card,select,input'))},{passive:true});(function f(){cx+=(tx-cx)*.2;cy+=(ty-cy)*.2;r.style.transform='translate('+cx+'px,'+cy+'px)';requestAnimationFrame(f)})()}
/* tilt cards */
if(!rm&&matchMedia('(hover:hover)').matches)[].forEach.call(d.querySelectorAll('.path,.bx,.plan'),function(n){n.addEventListener('mousemove',function(e){var b=n.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;n.style.transform='perspective(900px) rotateY('+x*6+'deg) rotateX('+(-y*5)+'deg) translateY(-4px)'});n.addEventListener('mouseleave',function(){n.style.transform=''})});
/* showcase tabs (auto-advance) */
var sh=d.getElementById('shw');if(sh){var bs=[].slice.call(sh.querySelectorAll('.tb button')),ps=[].slice.call(sh.querySelectorAll('.pv')),cur=0,tm;function go(i){cur=i;bs.forEach(function(b,k){b.classList.toggle('on',k===i);if(k===i){b.style.animation='none';b.offsetWidth;b.style.animation=''}});ps.forEach(function(p,k){p.classList.toggle('on',k===i)});clearTimeout(tm);if(!rm)tm=setTimeout(function(){go((cur+1)%bs.length)},6000)}
 bs.forEach(function(b,i){b.onclick=function(){go(i)}});go(0)}
/* position size calculator (estimate) */
var cb=d.getElementById('calc');if(cb){var $=function(i){return d.getElementById(i)},PV={EURUSD:[10,1e-4,'FX'],GBPUSD:[10,1e-4,'FX'],AUDUSD:[10,1e-4,'FX'],USDJPY:[6.5,1e-2,'FX'],XAUUSD:[10,.1,'Gold'],US30:[1,1,'Index']};
 function money(v){return'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
 function up(){var bal=+$('cb').value||0,rk=+$('cr').value,sl=+$('cs').value||0,rr=+$('cq').value,pv=PV[$('ci').value][0];$('crv').textContent=rk.toFixed(1)+'%';$('cqv').textContent='1 : '+rr.toFixed(1);
  var risk=bal*rk/100,lots=sl>0?risk/(sl*pv):0;$('o1').textContent=money(risk);$('o2').textContent=lots.toFixed(2);$('o3').textContent=money(risk*rr);$('o4').textContent=sl?'+'+(sl*rr).toFixed(1)+' pips':'—';
  $('o2').style.color=lots>0?'#7fb2ff':'#fff';$('ba').style.flex=1;$('bb').style.flex=rr;$('ba').textContent='Risk '+money(risk);$('bb').textContent='Reward '+money(risk*rr)}
 [].forEach.call(cb.querySelectorAll('input,select'),function(n){n.oninput=up;n.onchange=up});up()}
})();
/* device showcase: laptop -> phone loop */
(function(){var dv=document.getElementById('dv');if(!dv)return;var d=document,rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
 function candles(n,seed){var s=seed,r=function(){s=(s*9301+49297)%233280;return s/233280},p=60,o=[];for(var i=0;i<n;i++){var a=p,c=a+(r()-.45)*8;o.push([a,Math.max(a,c)+r()*3,Math.min(a,c)-r()*3,c]);p=c}return o}
 function svg(id,n,seed,w,h){var cs=candles(n,seed),lo=Math.min.apply(0,cs.map(function(a){return a[2]})),hi=Math.max.apply(0,cs.map(function(a){return a[1]})),y=function(v){return h-8-(v-lo)/(hi-lo)*(h-30)},g='',st=w/(n+1);
  cs.forEach(function(a,i){var x=st*(i+1),u=a[3]>=a[0],col=u?'#19c37d':'#f0455a';g+='<g class="cnd" data-i="'+i+'"><line x1="'+x+'" x2="'+x+'" y1="'+y(a[1])+'" y2="'+y(a[2])+'" stroke="'+col+'"/><rect x="'+(x-st*.3)+'" y="'+y(Math.max(a[0],a[3]))+'" width="'+st*.6+'" height="'+Math.max(1.2,Math.abs(y(a[0])-y(a[3])))+'" fill="'+col+'"/></g>'});
  var e=y(cs[n-8][3]);g+='<g class="lv"><line class="lvl" x1="0" x2="'+w+'" y1="'+e+'" y2="'+e+'" stroke="#2f80ff" stroke-dasharray="4 3"/><line class="lvl" x1="0" x2="'+w+'" y1="'+(e+h*.14)+'" y2="'+(e+h*.14)+'" stroke="#f0455a" stroke-dasharray="4 3"/><line class="lvl" x1="0" x2="'+w+'" y1="'+(e-h*.26)+'" y2="'+(e-h*.26)+'" stroke="#19c37d" stroke-dasharray="4 3"/></g>';
  var el=d.getElementById(id);el.setAttribute('viewBox','0 0 '+w+' '+h);el.setAttribute('preserveAspectRatio','none');el.innerHTML=g}
 svg('dc1',48,11,400,260);svg('dc2',34,5,200,330);
 var WL=[['EURUSD','1.0854','u'],['GBPUSD','1.2981','d'],['XAUUSD','2648','u'],['BTCUSD','91.2k','u'],['US30','43.4k','d']];d.getElementById('dwl').innerHTML=WL.map(function(w){return'<div><b>'+w[0]+'</b><span style="color:'+(w[2]==='u'?'#19c37d':'#f0455a')+'">'+w[1]+'</span></div>'}).join('');
 var cap=d.getElementById('dcap'),pl=d.getElementById('dpl'),pos=d.getElementById('dpos'),buy=d.getElementById('dbuy'),boot=d.getElementById('dboot'),tm=[],T=function(f,ms){tm.push(setTimeout(f,ms))},pv=0,tk;
 function draw(sel,gap){var n=[].slice.call(dv.querySelectorAll(sel+' .cnd'));n.forEach(function(g,i){T(function(){g.style.opacity=1},i*gap)})}
 function run(){tm.forEach(clearTimeout);tm=[];clearInterval(tk);dv.classList.remove('m','show');boot.classList.remove('off');pos.classList.remove('on');buy.classList.remove('click');pl.textContent='$0.00';[].forEach.call(dv.querySelectorAll('.cnd'),function(g){g.style.opacity=0});cap.textContent='LAPTOP · FULL TERMINAL';
  T(function(){boot.classList.add('off');draw('#dl',45)},1400);
  T(function(){dv.classList.add('show')},3600);
  T(function(){buy.classList.add('click')},5200);
  T(function(){pos.classList.add('on');var v=0;tk=setInterval(function(){v+=Math.random()*5-1;pl.textContent=(v<0?'−':'+')+'$'+Math.abs(v).toFixed(2);pl.style.color=v<0?'#ff8794':'#6fe3b2'},300)},5700);
  T(function(){cap.textContent='SAME TERMINAL · ON YOUR PHONE';dv.classList.add('m');draw('#dm',55)},9200);
  T(function(){run()},15500)}
 if(rm){boot.classList.add('off');dv.classList.add('show','m');[].forEach.call(dv.querySelectorAll('.cnd'),function(g){g.style.opacity=1});pos.classList.add('on');return}
 new IntersectionObserver(function(e,o){if(e[0].isIntersecting){o.disconnect();run()}},{threshold:.35}).observe(dv)})();
