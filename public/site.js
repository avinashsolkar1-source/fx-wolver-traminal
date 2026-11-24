(function(){var d=document,rm=matchMedia('(prefers-reduced-motion:reduce)').matches;d.documentElement.classList.add('js');
var g=d.getElementById('glow');d.addEventListener('mousemove',function(e){if(g){g.style.left=e.clientX+'px';g.style.top=e.clientY+'px'}},{passive:true});
var io=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.15});[].forEach.call(d.querySelectorAll('.rv,.bx,.rr'),function(n){io.observe(n)});
var nav=d.querySelector('nav'),pg=d.getElementById('pg');function sc(){var h=d.documentElement.scrollHeight-innerHeight;if(pg)pg.style.width=(h>0?scrollY/h*100:0)+'%';nav.classList.toggle('sc',scrollY>20)}addEventListener('scroll',sc,{passive:true});sc();
var mb=d.getElementById('mb'),mm=d.getElementById('mm');if(mb)mb.onclick=function(){mm.classList.toggle('show')};
d.addEventListener('mousemove',function(e){var c=e.target.closest&&e.target.closest('.card,.plan,.bx,.path');if(!c)return;var r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')});
if(!rm)[].forEach.call(d.querySelectorAll('.btn.pri'),function(b){b.addEventListener('mousemove',function(e){var r=b.getBoundingClientRect();b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.12)+'px,'+((e.clientY-r.top-r.height/2)*.2)+'px)'});b.addEventListener('mouseleave',function(){b.style.transform=''})});
[].forEach.call(d.querySelectorAll('[data-n]'),function(b){var n=+b.dataset.n,sfx=b.dataset.s||'';new IntersectionObserver(function(e,o){if(!e[0].isIntersecting)return;o.disconnect();var t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/1200);b.textContent=Math.round(n*(1-Math.pow(1-k,3)))+sfx;if(k<1)requestAnimationFrame(f)})(t0)},{threshold:.5}).observe(b)});
/* broker slot */
var C=window.FXW_CONFIG||{},bs=d.getElementById('brk');if(bs){var a=bs.querySelector('a'),st=bs.querySelector('.bst');if(C.BROKER_LINK){a.href=C.BROKER_LINK;a.classList.remove('off');a.textContent='Open account with '+(C.BROKER_NAME||'our broker')+' ↗';st.className='chip c-live bst';st.textContent='CONNECTED'}}
})();
