(function(){var d=document,rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
d.querySelectorAll('#why .bc').forEach(function(c){c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')})});
var cv=d.getElementById('sky');if(!cv)return;var x=cv.getContext('2d'),W,H,C=[],run=false,off=0;
function mk(){var n=Math.ceil(W/22)+4,v=H*.55;C=[];for(var i=0;i<n;i++){var o=v,cl=o+(Math.sin(i*.31)*18+Math.sin(i*1.37)*12-3);C.push({o:o,c:cl,h:Math.max(o,cl)+8+Math.abs(Math.sin(i*2.1))*14,l:Math.min(o,cl)-8-Math.abs(Math.cos(i*1.7))*14});v=cl;if(v<H*.2||v>H*.8)v=H*.5}}
function sz(){var r=devicePixelRatio||1;W=cv.clientWidth;H=cv.clientHeight;cv.width=W*r;cv.height=H*r;x.setTransform(r,0,0,r,0,0);mk()}
function draw(){x.clearRect(0,0,W,H);var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(4,7,13,1)');g.addColorStop(.4,'rgba(4,7,13,0)');
C.forEach(function(k,i){var px=i*22-off%22,up=k.c<=k.o,col=up?'25,195,125':'240,69,90',top=Math.min(k.o,k.c),h=Math.max(3,Math.abs(k.c-k.o));
x.strokeStyle='rgba('+col+',.55)';x.lineWidth=1.4;x.beginPath();x.moveTo(px+7,k.h);x.lineTo(px+7,k.l);x.stroke();x.shadowColor='rgba('+col+',.7)';x.shadowBlur=10;x.fillStyle='rgba('+col+',.5)';x.fillRect(px+2,top,10,h);x.shadowBlur=0});
x.fillStyle=g;x.fillRect(0,0,W,H)}
function loop(){if(!run)return;off+=.35;if(off>=22){off-=22;var l=C[C.length-1],o=l.c,c=o+((Math.random()-.5)*34);if(c<H*.2||c>H*.8)c=H*.5;C.shift();C.push({o:o,c:c,h:Math.max(o,c)+8+Math.random()*14,l:Math.min(o,c)-8-Math.random()*14})}draw();requestAnimationFrame(loop)}
sz();draw();addEventListener('resize',sz);
if(!rm&&'IntersectionObserver'in window)new IntersectionObserver(function(e){run=e[0].isIntersecting;if(run)loop()},{threshold:.05}).observe(cv);
})();
