/* FX WOLVER 3D cinematic scene. Deterministic: FXScene.set(t) draws the frame for time t (seconds). Sample numbers only. */
(function(){
var DUR=24,clamp=function(v,a,b){return Math.min(b,Math.max(a,v))},ss=function(a,b,t){var x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x)},eo=function(a,b,t){var x=clamp((t-a)/(b-a),0,1);return 1-Math.pow(1-x,3)};
function key(t,K){if(t<=K[0][0])return K[0][1];for(var i=1;i<K.length;i++)if(t<=K[i][0]){var a=K[i-1],b=K[i];return a[1]+(b[1]-a[1])*ss(a[0],b[0],t)}return K[K.length-1][1]}
function rnd(seed){var s=seed;return function(){s=(s*9301+49297)%233280;return s/233280}}
function candles(n,seed,base){var r=rnd(seed),p=base,o=[];for(var i=0;i<n;i++){var a=p,c=a+(r()-.44)*7+Math.sin(i/5)*1.6;o.push([a,Math.max(a,c)+r()*3,Math.min(a,c)-r()*3,c]);p=c}return o}
function chartSVG(cs,w,h,cls){var lo=1e9,hi=-1e9;cs.forEach(function(a){lo=Math.min(lo,a[2]);hi=Math.max(hi,a[1])});var y=function(v){return h-26-(v-lo)/(hi-lo)*(h-70)},st=w/(cs.length+1),g='';
 for(var k=1;k<6;k++)g+='<line x1="0" x2="'+w+'" y1="'+k*h/6+'" y2="'+k*h/6+'" stroke="#121b28"/>';
 cs.forEach(function(a,i){var x=st*(i+1),up=a[3]>=a[0],c=up?'#19c37d':'#f0455a';g+='<g class="'+cls+'" style="opacity:0"><line x1="'+x+'" x2="'+x+'" y1="'+y(a[1])+'" y2="'+y(a[2])+'" stroke="'+c+'" stroke-width="2"/><rect x="'+(x-st*.32)+'" y="'+y(Math.max(a[0],a[3]))+'" width="'+st*.64+'" height="'+Math.max(2,Math.abs(y(a[0])-y(a[3])))+'" fill="'+c+'"/></g>'});
 var e=y(cs[cs.length-9][3]),th=h*.15,u=h*.27;
 g+='<line class="'+cls+'L" x1="0" x2="'+w+'" y1="'+e+'" y2="'+e+'" stroke="#2f80ff" stroke-width="2" stroke-dasharray="8 6"/><line class="'+cls+'L" x1="0" x2="'+w+'" y1="'+(e+th)+'" y2="'+(e+th)+'" stroke="#f0455a" stroke-width="2" stroke-dasharray="8 6"/><line class="'+cls+'L" x1="0" x2="'+w+'" y1="'+(e-u)+'" y2="'+(e-u)+'" stroke="#19c37d" stroke-width="2" stroke-dasharray="8 6"/>';
 g+='<text class="'+cls+'T" x="12" y="'+(e-u-8)+'" fill="#6fe3b2" font-size="14" font-weight="700">TARGET +$200</text><text class="'+cls+'T" x="12" y="'+(e+th+20)+'" fill="#ff8794" font-size="14" font-weight="700">STOP −$100</text>';
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet">'+g+'</svg>'}
function mount(host,opt){opt=opt||{};var logo=opt.logo||'/logo.webp',d=document;
 var root=d.createElement('div');root.className='s3';
 root.innerHTML='<canvas width="1920" height="1080"></canvas><div class="s3cam"><div class="s3w" id="s3w"><div class="s3floor"></div><div class="s3glow"></div>'+
 '<div class="lap" id="s3lap"><div class="deck"><div class="kb"></div><div class="tp"></div></div><div class="dk" style="left:-480px;top:0;width:960px;height:20px;transform:translateZ(310px)"></div><div class="dk" style="left:-310px;top:0;width:620px;height:20px;transform:translateX(480px) rotateY(90deg)"></div><div class="dk" style="left:-310px;top:0;width:620px;height:20px;transform:translateX(-480px) rotateY(-90deg)"></div>'+
 '<div class="lid" id="s3lid"><div class="f fr"><div class="ui"><div class="hd"><img src="'+logo+'" alt="">FX WOLVER<span class="pill">PHASE 1 · ACTIVE</span><em id="s3px">EURUSD 1.0854</em></div><div class="bd"><div class="wl"><div><b>EURUSD</b><span style="color:#19c37d">1.0854</span></div><div><b>GBPUSD</b><span style="color:#f0455a">1.2981</span></div><div><b>XAUUSD</b><span style="color:#19c37d">2,648</span></div><div><b>BTCUSD</b><span style="color:#19c37d">91.2k</span></div><div><b>US30</b><span style="color:#f0455a">43.4k</span></div><div><b>NAS100</b><span style="color:#19c37d">20.5k</span></div></div><div class="ch"><div class="chh"><b>EURUSD</b>1H · Candles · EMA</div><div id="s3c1" style="position:absolute;inset:0"></div></div><div class="op"><div class="bs"><i class="sl">SELL</i><i class="bu" id="s3buy">BUY</i></div><div class="l"><span>Lots</span><b>0.50</b></div><div class="l"><span>Stop Loss</span><b style="color:#ff8794">−$100.00</b></div><div class="l"><span>Take Profit</span><b style="color:#6fe3b2">+$200.00</b></div><div class="l"><span>R : R</span><b>1 : 2.00</b></div><div class="l"><span>Profit target</span><b>3.2% / 8%</b></div></div></div><div class="pos" id="s3pos"><span>EURUSD · BUY 0.50</span><b id="s3pl">+$0.00</b></div></div><div class="sweep" id="s3sw"></div></div><div class="f bk"><img src="'+logo+'" alt=""></div></div></div>'+
 '<div class="phone" id="s3ph"><div class="f fr"><div class="pui"><div class="hd"><img src="'+logo+'" alt="">FX WOLVER<em>PHASE 1</em></div><div class="px">1.0854<small>+0.18%</small></div><div class="cv" id="s3c2"></div><div class="bs2"><i class="sl">SELL</i><i class="bu">BUY</i></div></div></div><div class="f bk"></div></div>'+
 '<div class="c3" id="s3k1" style="width:400px"><small>TRADE OPENED</small><div class="big">BUY 0.50 EURUSD</div><div class="row"><span>Risk</span><b style="color:#ff8794">$100.00</b></div><div class="row"><span>Reward</span><b style="color:#6fe3b2">$200.00</b></div><div class="row"><span>R : R</span><b>1 : 2.00</b></div></div>'+
 '<div class="c3" id="s3k2" style="width:380px"><small>DAILY LOSS LIMIT</small><div class="big">0.8% <span style="font-size:18px;color:#8392a8">/ 5%</span></div><div class="bar"><i style="width:16%;background:linear-gradient(90deg,#2f80ff,#19c37d)"></i></div><div class="row" style="margin-top:18px"><span>Profit target</span><b>3.2% / 8%</b></div><div class="bar"><i style="width:40%;background:#19c37d"></i></div></div>'+
 '<div class="c3" id="s3k3" style="width:760px"><small>PROP CHALLENGE DASHBOARD · PHASE 1</small><div class="big" style="color:#6fe3b2;margin-bottom:6px">● ACTIVE</div><div class="tb"><span>Profit target</span><b>3.2% / 8%</b><div class="bar" style="margin:0"><i id="s3b1" style="background:#19c37d"></i></div></div><div class="tb"><span>Max daily loss</span><b>0.8% / 5%</b><div class="bar" style="margin:0"><i id="s3b2" style="background:#2f80ff"></i></div></div><div class="tb"><span>Max overall loss</span><b>1.1% / 10%</b><div class="bar" style="margin:0"><i id="s3b3" style="background:#2f80ff"></i></div></div><div class="tb"><span>Trading days</span><b>3 / 5</b><div class="bar" style="margin:0"><i id="s3b4" style="background:#f5b83d"></i></div></div></div>'+
 '</div></div><div class="s3t"><div class="vig"></div><div class="flash" id="s3f"></div><div class="rg" id="s3rg"></div><div class="lg" id="s3lg"><img src="'+logo+'" alt=""><b>FX WOLVER</b><span>TRADING TERMINAL</span></div>'+
 '<div class="tx" id="s3t1"><h2>Professional <em>trading terminal</em></h2><p>Charts · Orders · Risk on the chart</p></div><div class="tx" id="s3t2"><h2>Laptop to <em>mobile</em></h2><p>One terminal, every screen</p></div><div class="tx" id="s3t3"><h2>Built for <em>prop firms</em></h2><p>Challenge rules and every trader&rsquo;s risk and reward, live</p></div>'+
 '<div class="lg" id="s3end" style="background:radial-gradient(ellipse at 50% 50%,rgba(3,6,11,.78),rgba(3,6,11,.96))"><img src="'+logo+'" alt=""><b>FX WOLVER</b><span>FORWARD · PROFESSIONAL · TRADING TERMINAL</span></div><div class="fine">Illustration with sample numbers</div></div>';
 host.appendChild(root);
 var $=function(i){return root.querySelector('#'+i)},W=$('s3w'),LAP=$('s3lap'),LID=$('s3lid'),PH=$('s3ph'),cv=root.querySelector('canvas'),cx=cv.getContext('2d');
 var cs1=candles(64,11,60),cs2=candles(36,5,60);$('s3c1').innerHTML=chartSVG(cs1,528,420,'a');$('s3c2').innerHTML=chartSVG(cs2,338,470,'b');
 var A=[].slice.call(root.querySelectorAll('.a')),B=[].slice.call(root.querySelectorAll('.b')),AL=[].slice.call(root.querySelectorAll('.aL,.aT')),BL=[].slice.call(root.querySelectorAll('.bL,.bT'));
 var PR=[];var r=rnd(3);for(var i=0;i<70;i++)PR.push([r()*1920,r()*1080,r()*1.8+.4,r()*.4+.1,r()*6.28]);
 function T(el,t){if(el._t!==t){el._t=t;el.style.transform=t}}
 function O(el,v){v=Math.round(v*100)/100;if(el._o!==v){el._o=v;el.style.opacity=v}}
 function set(t){t=clamp(t,0,DUR);
  /* camera */
  var ry=key(t,[[0,-34],[3,-26],[6,-12],[9,-2],[12,14],[16,8],[20,-8],[24,0]]),rx=key(t,[[0,16],[4,12],[9,9],[14,12],[18,7],[24,12]]),dz=key(t,[[0,-800],[3,-520],[6,-330],[9,-260],[12,-300],[16,-240],[20,-260],[24,-520]]),px=key(t,[[0,0],[9,0],[11.5,140],[17,20],[22,0]]),py=key(t,[[0,60],[6,110],[16,120],[22,100]]);
  var R=function(v){return Math.round(v*100)/100};T(W,'translate3d('+R(px)+'px,'+R(py)+'px,'+R(dz)+'px) rotateX('+R(rx)+'deg) rotateY('+R(ry)+'deg)');
  /* floor motion */
  root.querySelector('.s3floor').style.transform='translateY(22px) rotateX(90deg)';root.querySelector('.s3floor').style.backgroundPosition='0 '+(t*75)+'px';
  /* laptop */
  var open=eo(2.6,5.6,t),th=-90+open*102,lapx=key(t,[[0,0],[9.2,0],[11.8,-330],[17,-300],[22,0]]),lapz=key(t,[[0,0],[9,0],[12,-180],[17,-60],[22,0]]),lapr=key(t,[[0,0],[9,0],[12,26],[17,18],[22,0]]);
  T(LAP,'translate3d('+lapx+'px,0,'+lapz+'px) rotateY('+lapr+'deg)');T(LID,'translateZ(-310px) translateY(-3px) rotateX('+th+'deg)');
  var scr=root._ui||(root._ui=LID.querySelector('.ui'));O(scr,ss(3.6,4.6,t));
  var sw=$('s3sw');sw.style.left=(-300+((t*260)%1500))+'px';sw.style.opacity=t>4.6?1:0;
  /* laptop chart */
  var n1=clamp((t-5.2)*13,0,cs1.length);A.forEach(function(g,i){O(g,clamp(n1-i,0,1))});var la=ss(7.1,8.6,t);AL.forEach(function(g){O(g,la)});
  var bp=clamp(1-Math.abs(t-9.1)/.28,0,1);$('s3buy').style.transform='scale('+(1-.1*bp)+')';$('s3buy').style.boxShadow='0 0 '+(bp*40)+'px rgba(25,195,125,'+bp+')';
  var pp=ss(9.3,9.8,t);$('s3pos').style.opacity=pp;var v=(14+46*ss(9.5,22,t)+7*Math.sin(t*2.6)+3*Math.sin(t*7.1))*(t>9.3?1:0);$('s3pl').textContent=(v<0?'−':'+')+'$'+Math.abs(v).toFixed(2);
  $('s3px').textContent='EURUSD '+(1.0854+.0002*Math.sin(t*3)+.00012*ss(9,16,t)).toFixed(4);
  /* phone */
  var pin=eo(9.2,12,t),pvx=520*pin+60*(1-pin),pvy=-330-300*(1-pin)+Math.sin(t*1.6)*14,pvz=60+700*(1-pin);
  T(PH,'translate3d('+(lapx>-100?900:520+(lapx+360)*0)+'px,0,0)');
  var pxp=key(t,[[0,800],[9.2,800],[12,330],[17,320],[22,380]]),pzp=key(t,[[0,0],[9.2,700],[12,60],[17,140],[22,40]]),pry=key(t,[[0,-30],[12,-22],[17,-12],[22,-18]]);
  T(PH,'translate3d('+pxp+'px,'+(-330+Math.sin(t*1.6)*12-(t<12?(1-eo(9.2,12,t))*500:0))+'px,'+pzp+'px) rotateY('+(pry+Math.sin(t*.9)*3)+'deg) rotateX(-4deg)');PH.style.display=t>9.1?'block':'none';
  var n2=clamp((t-11)*15,0,cs2.length);B.forEach(function(g,i){O(g,clamp(n2-i,0,1))});BL.forEach(function(g){O(g,ss(12.6,14,t))});
  /* floating cards */
  function card(id,x,y,z,a,b,ry2,fl){var el=$(id),p=ss(a,a+1.0,t)*(1-ss(b,b+.8,t));el.style.opacity=p;el.style.display=p<.01?'none':'block';
   T(el,'translate3d('+x+'px,'+(y+Math.sin(t*1.3+fl)*10-(1-p)*60)+'px,'+(z-(1-p)*160)+'px) rotateY('+ry2+'deg) scale('+(.9+.1*p)+')')}
  card('s3k1',-560+lapx*.3,-560,200,8.0,16.5,-6,0);card('s3k2',-140+lapx*.2,-600,140,10.2,16.5,-10,2);
  card('s3k3',-420,-520,260,16,21.6,0,1);
  $('s3b1').style.width=(40*ss(16.4,18,t))+'%';$('s3b2').style.width=(16*ss(16.6,18.2,t))+'%';$('s3b3').style.width=(11*ss(16.8,18.4,t))+'%';$('s3b4').style.width=(60*ss(17,18.6,t))+'%';
  /* particles */
  cx.clearRect(0,0,1920,1080);PR.forEach(function(p){var yy=(p[1]-t*p[3]*40)%1080;if(yy<0)yy+=1080;var xx=p[0]+Math.sin(t*.4+p[4])*30;cx.fillStyle='rgba(120,180,255,'+(.15+.35*Math.abs(Math.sin(t*.8+p[4])))*.7+')';cx.beginPath();cx.arc(xx,yy,p[2],0,6.283);cx.fill()});
  /* titles */
  function tx(id,a,b){var el=$(id),p=ss(a,a+.9,t)*(1-ss(b,b+.7,t));el.style.opacity=p;el.style.transform='translateY('+(30*(1-ss(a,a+.9,t)))+'px)'}
  tx('s3t1',5.0,9);tx('s3t2',10.4,15.2);tx('s3t3',16.4,21);
  var lg=$('s3lg'),li=ss(.2,1.4,t)*(1-ss(2.4,3.4,t));lg.style.opacity=li;lg.style.transform='scale('+(.86+.14*ss(0,3,t)+.08*ss(2.4,3.4,t))+')';
  var rg=$('s3rg'),rp=(t*.55)%1;rg.style.opacity=li*(1-rp)*.8;rg.style.transform='scale('+(1+rp*2.4)+')';
  $('s3f').style.opacity=clamp(1-Math.abs(t-2.9)/.35,0,1)*.9+clamp(1-Math.abs(t-9.1)/.2,0,1)*.25;
  var en=$('s3end'),ep=ss(21.7,22.9,t);en.style.opacity=ep;en.style.transform='scale('+(.94+.06*ep)+')';
 }
 function fit(){var s=host.clientWidth/1920;root.style.transform='scale('+s+')';host.style.height=(1080*s)+'px'}
 if(opt.fit!==false){fit();addEventListener('resize',fit)}
 var ctl={set:set,dur:DUR,root:root};set(opt.t0||0);
 if(opt.auto){var st=0,run=false,raf;var last=0,slow=0,fr=0;function loop(now){if(!run)return;if(!st)st=now;var dt=now-last;last=now;if(dt>0&&dt<500){fr++;if(dt>38)slow++;if(fr===45){if(slow>16)root.classList.add('lite');fr=0;slow=0}}set(((now-st)/1000)%DUR);raf=requestAnimationFrame(loop)}
  ctl.play=function(){if(run)return;run=true;st=0;raf=requestAnimationFrame(loop)};ctl.pause=function(){run=false};ctl.replay=function(){st=0;if(!run){run=true;raf=requestAnimationFrame(loop)}};
  new IntersectionObserver(function(e){e[0].isIntersecting?ctl.play():ctl.pause()},{threshold:.2}).observe(host)}
 return ctl}
window.FXScene={mount:mount,dur:DUR};
})();
