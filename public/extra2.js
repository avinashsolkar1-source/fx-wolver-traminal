(function(){var d=document,$=function(s){return d.querySelector(s)};
function sg(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
var a=$('#ann');if(a){if(sg('fxw_ann')==='1')a.remove();else{var x=a.querySelector('button');if(x)x.onclick=function(){a.remove();sg('fxw_ann','1')}}}
var ck=$('#ck');if(ck){if(sg('fxw_ck')!=='1')setTimeout(function(){ck.classList.add('on')},1800);var ok=ck.querySelector('button');if(ok)ok.onclick=function(){ck.classList.remove('on');sg('fxw_ck','1')}}
var cs=$('#csim');if(cs){var S=[5000,10000,25000,50000,100000],cur=2,ch=cs.querySelector('.chips');
function f(n){return '$'+Math.round(n).toLocaleString('en-US')}
function draw(){var s=S[cur];ch.innerHTML=S.map(function(v,i){return '<button class="'+(i===cur?'on':'')+'" data-i="'+i+'">'+f(v)+'</button>'}).join('');
cs.querySelector('.cg').innerHTML=[['Phase 1 target (8%)',f(s*.08),'Equity to reach '+f(s*1.08)],['Phase 2 target (5%)',f(s*.05),'Equity to reach '+f(s*1.05)],['Daily loss limit (5%)',f(s*.05),'Resets every trading day'],['Max loss limit (10%)',f(s*.10),'Equity floor '+f(s*.9)],['Risk per trade at 1%',f(s*.01),'Up to 5 losses in a row inside the daily limit'],['Min trading days','4','Per phase']].map(function(r){return '<div><small>'+r[0]+'</small><b>'+r[1]+'</b><em>'+r[2]+'</em></div>'}).join('')}
ch.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;cur=+b.dataset.i;draw()});draw()}
})();

(function(){var d=document,ms=d.getElementById('mps'),mb=d.getElementById('mpb');if(!ms||!mb||matchMedia('(prefers-reduced-motion:reduce)').matches)return;var mid=1.08547,seed=3;
setInterval(function(){seed=(seed*16807)%2147483647;mid+=((seed/2147483647)-.5)*.00004;[[ms,(mid-.000006).toFixed(5)],[mb,(mid+.000006).toFixed(5)]].forEach(function(p){var o=parseFloat(p[0].textContent),n=parseFloat(p[1]);p[0].textContent=p[1];var q=p[0].parentNode;if(n!==o){q.classList.remove('tu','td');void q.offsetWidth;q.classList.add(n>o?'tu':'td')}})},1100)})();
