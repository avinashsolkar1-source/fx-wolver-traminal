/* FX WOLVER Journal — standalone, no dependencies.
   Storage: localStorage "fxw.journal.v1" (this browser only). Optional cloud sign-in slot: window.FXW_CONFIG.SUPABASE_URL / SUPABASE_ANON_KEY (not connected in this build).
   Terminal link: reads closed trades the terminal saves in the same browser ("fxw.paper.v1", "fxw.prop.v1"). The terminal itself is never modified. */
(function(){
'use strict';
var KEY='fxw.journal.v1',TKEYS=['fxw.paper.v1','fxw.prop.v1'];
var $=function(s){return document.querySelector(s)};
var D={profile:null,mode:'solo',entries:[]};
var EMB=/[?&]embed=1/.test(location.search);if(EMB)document.documentElement.classList.add('emb');
var mem=null; // fallback when storage is blocked

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(n){var s=Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});return(n<0?'-':n>0?'+':'')+'$'+s}
function load(){try{var r=localStorage.getItem(KEY);if(r){var o=JSON.parse(r);if(o&&o.entries)D=o}}catch(e){if(mem)D=mem}}
function persist(){
  try{localStorage.setItem(KEY,JSON.stringify(D));mem=null;return true}
  catch(e){ // quota: drop screenshots from oldest entries and retry once
    try{D.entries.slice().reverse().some(function(x){if(x.shot){x.shot='';return true}});localStorage.setItem(KEY,JSON.stringify(D));toast('Storage full, oldest screenshot removed');return true}catch(e2){mem=D;return false}
  }
}
var st=0;
function stamp(ok){var el=$('#saved');el.textContent=ok===false?'Not saved (storage blocked)':'Saved ✓ '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});el.classList.add('flash');clearTimeout(st);st=setTimeout(function(){el.classList.remove('flash')},1500)}
function save(){stamp(persist())}
var dt=0;function autosave(){clearTimeout(dt);var el=$('#saved');el.textContent='Saving…';dt=setTimeout(save,350)}
var tt=0;function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show')},2200)}

/* ---------- splash ---------- */
function splash(done){
  if(EMB){var o=$('#splash');if(o)o.remove();done();return}
  var sp=$('#splash'),w=$('#spw'),txt='FX WOLVER',i=0;
  txt.split('').forEach(function(c){var s=document.createElement('span');if(c===' '){s.className='sp';s.innerHTML='&nbsp;'}else{s.textContent=c;s.style.animationDelay=(0.15+i*0.09)+'s'}i++;w.appendChild(s)});
  var cv=$('#spc'),x=cv.getContext('2d'),W,H,pts=[],raf,t0=performance.now();
  function size(){W=cv.width=innerWidth;H=cv.height=innerHeight}size();addEventListener('resize',size);
  for(var k=0;k<46;k++)pts.push({x:Math.random(),y:Math.random(),v:.0006+Math.random()*.0018,s:Math.random()*1.8+.4});
  function frame(n){
    var e=(n-t0)/1000;x.clearRect(0,0,W,H);
    x.strokeStyle='rgba(124,92,255,.07)';x.lineWidth=1;
    for(var g=0;g<W;g+=64){x.beginPath();x.moveTo(g,0);x.lineTo(g,H);x.stroke()}
    for(var h=0;h<H;h+=64){x.beginPath();x.moveTo(0,h);x.lineTo(W,h);x.stroke()}
    // glowing price line drawing itself
    var prog=Math.min(1,e/2.4),N=90,m=Math.floor(N*prog);
    x.beginPath();
    for(var j=0;j<=m;j++){var px=W*.08+(W*.84)*j/N,py=H*.62-Math.sin(j*.21)*H*.03-j*H*.0042+Math.sin(j*.9)*H*.012;j?x.lineTo(px,py):x.moveTo(px,py)}
    x.shadowColor='#7c5cff';x.shadowBlur=18;x.strokeStyle='rgba(120,160,255,.55)';x.lineWidth=2;x.stroke();x.shadowBlur=0;
    pts.forEach(function(p){p.y-=p.v;if(p.y<0){p.y=1;p.x=Math.random()}x.fillStyle='rgba(160,150,255,'+(.15+p.s*.12)+')';x.beginPath();x.arc(p.x*W,p.y*H,p.s,0,6.3);x.fill()});
    raf=requestAnimationFrame(frame)}
  raf=requestAnimationFrame(frame);
  var fin=false;function end(){if(fin)return;fin=true;sp.classList.add('out');setTimeout(function(){cancelAnimationFrame(raf);sp.remove()},750);done()}
  $('#spskip').onclick=end;sp.addEventListener('click',end);
  var seen=false;try{seen=sessionStorage.getItem('fxw.sp')==='1';sessionStorage.setItem('fxw.sp','1')}catch(e){}
  setTimeout(end,seen?1400:3600);
}

/* ---------- gate ---------- */
function gate(){
  $('#gate').hidden=false;$('#app').hidden=true;
  var cfg=window.FXW_CONFIG||{},hasCloud=!!(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY);
  $('#gnote').textContent=hasCloud?'Cloud sign-in settings were found in config.js. Google sign-in is not wired in this build, so your journal stays on this device.':'Your journal is stored privately in this browser. Cross-device sync and Google sign-in switch on once cloud sign-in is connected by the site owner.';
  $('#ggoogle').onclick=function(){toast('Google sign-in is not connected yet. Use your name or Solo.')};
  $('#gform').onsubmit=function(e){e.preventDefault();D.profile={name:$('#gname').value.trim()||'Trader',email:$('#gmail').value.trim(),at:Date.now()};save0();enter()};
  $('#gsolo').onclick=function(){D.profile={name:'Trader',email:'',at:Date.now(),solo:true};save0();enter()};
}
function save0(){persist()}

/* ---------- terminal sync ---------- */
function readTerminal(){
  var out=[];
  TKEYS.forEach(function(k){
    try{var o=JSON.parse(localStorage.getItem(k)||'null');var h=o&&(o.history||(o.acct&&o.acct.history));
      if(Array.isArray(h))h.forEach(function(x){if(x&&x.sym&&isFinite(x.pnl))out.push({id:'T'+x.t+x.sym+(x.vol||''),sym:x.sym,side:String(x.type||'').toUpperCase().indexOf('SELL')>=0?'SELL':'BUY',lots:+x.vol||0,open:x.open,close:x.close,pnl:+x.pnl,t:x.t||Date.now(),note:x.note||'',tags:x.tags||'',why:x.why||''})})
    }catch(e){}
  });
  return out;
}
function sync(quiet){
  if(D.mode!=='connected')return 0;
  var tr=readTerminal(),add=0,map={};D.entries.forEach(function(e){map[e.id]=e});
  tr.forEach(function(x){
    var e=map[x.id];
    if(e){e.pnl=x.pnl;e.close=x.close;return}
    D.entries.push({id:x.id,src:'terminal',sym:x.sym,side:x.side,lots:x.lots,open:x.open,close:x.close,pnl:x.pnl,t:x.t,reason:x.note||'',tags:x.tags||'',emo:'',verdict:'',shot:'',closedBy:x.why});add++;
  });
  if(add){persist();if(!quiet)toast(add+' trade'+(add>1?'s':'')+' synced from the terminal')}
  return add;
}
function sampleTrades(){
  var now=Date.now(),H=36e5,S=[
    ['EURUSD','BUY',.5,212.4,'London open breakout above the Asian range, trend aligned on the 1H chart.','right','breakout, london','Confident'],
    ['XAUUSD','SELL',.2,-64,'Faded a news spike too early with no confirmation candle.','wrong','news, early entry','FOMO'],
    ['BTCUSDT','BUY',.1,340,'Reclaimed key support on 4H. Risk 1% with a 1:3 target.','right','support, swing','Calm'],
    ['GBPJPY','SELL',.3,-98.5,'Chased a move after the first candle already ran.','wrong','chasing','Hesitant'],
    ['NAS100','BUY',.4,156.2,'Pullback to the 50 EMA in an uptrend, stop below the swing low.','right','trend, pullback','Calm'],
    ['USDJPY','BUY',.25,41.75,'Range break retest, small size before the US session.','','range, retest','Tired']];
  return S.map(function(s,i){return{id:'S'+(now-i*86*H)+s[0],src:'sample',sym:s[0],side:s[1],lots:s[2],open:'',close:'',pnl:s[3],t:now-(S.length-i)*86*H,reason:s[4],verdict:s[5],tags:s[6],emo:s[7],shot:''}});
}

/* ---------- derived ---------- */
function sorted(){return D.entries.slice().sort(function(a,b){return b.t-a.t})}
function stats(){
  var e=D.entries,n=e.length,w=e.filter(function(x){return x.pnl>0}),l=e.filter(function(x){return x.pnl<0});
  var net=e.reduce(function(a,x){return a+x.pnl},0),gw=w.reduce(function(a,x){return a+x.pnl},0),gl=Math.abs(l.reduce(function(a,x){return a+x.pnl},0));
  var rv=e.filter(function(x){return x.verdict});var rr=rv.length?Math.round(rv.filter(function(x){return x.verdict==='right'}).length/rv.length*100):null;
  return{n:n,net:net,wr:n?Math.round(w.length/n*100):null,pf:gl>0?(gw/gl).toFixed(2):(gw>0?'∞':null),rr:rr,rv:rv.length};
}

/* ---------- render ---------- */
function render(){
  var s=stats(),mode=D.mode==='connected',p=D.profile||{};
  $('#hi').textContent=(p.solo||!p.name)?'Your trading journal':'Welcome back, '+p.name;
  $('#hisub').textContent='Everything you write is saved automatically.';
  var pill=$('#modePill');pill.textContent=mode?'CONNECTED':'SOLO';pill.classList.toggle('on',mode);
  $('#cdot').classList.toggle('on',mode);
  $('#ctitle').textContent=mode?'Connected to the FX WOLVER Terminal':'Solo mode';
  $('#ctext').textContent=mode?'Closed trades from the terminal on this browser appear here automatically. Disconnecting removes the synced trades from this journal.':'Write your own entries. Connect the terminal to import your closed trades automatically.';
  $('#bConnect').hidden=mode;$('#bDisc').hidden=!mode;
  var cls=function(v){return v>0?'up':v<0?'down':''};
  $('#stats').innerHTML=
    '<div class="st"><small>Entries</small><b>'+s.n+'</b></div>'+
    '<div class="st"><small>Net P/L</small><b class="'+cls(s.net)+'">'+(s.n?money(s.net):'—')+'</b></div>'+
    '<div class="st"><small>Win rate</small><b>'+(s.wr==null?'—':s.wr+'%')+'</b></div>'+
    '<div class="st"><small>Profit factor</small><b>'+(s.pf==null?'—':s.pf)+'</b></div>'+
    '<div class="st"><small>Right-call rate</small><b>'+(s.rr==null?'—':s.rr+'%')+'</b></div>';
  eq();ins();list();
  $('#foot').textContent='Stored on this device only. Use Export CSV to keep a copy.'+(D.entries.some(function(x){return x.src==='sample'})?' Entries tagged SAMPLE are demo data.':'');
}
function eq(){
  var a=D.entries.slice().sort(function(x,y){return x.t-y.t}),box=$('#eq');
  if(a.length<2){box.innerHTML='<div class="empty" style="padding:26px">The curve appears after two entries.</div>';$('#eqs').textContent='';return}
  var c=0,v=[0];a.forEach(function(x){c+=x.pnl;v.push(c)});
  var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),rg=(mx-mn)||1,W=600,H=150,pd=10;
  var P=v.map(function(y,i){return[(i/(v.length-1))*W,H-pd-((y-mn)/rg)*(H-2*pd)]});
  var d=P.map(function(p,i){return(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)}).join(' ');
  var col=c>=0?'#22c55e':'#ef4444',z=H-pd-((0-mn)/rg)*(H-2*pd);
  box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Equity curve"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".35"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs><line x1="0" x2="'+W+'" y1="'+z.toFixed(1)+'" y2="'+z.toFixed(1)+'" stroke="rgba(150,160,255,.25)" stroke-dasharray="4 4"/><path d="'+d+' L'+W+' '+H+' L0 '+H+' Z" fill="url(#g)"/><path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>';
  $('#eqs').textContent='Cumulative '+money(c)+' over '+a.length+' entries';
}
function ins(){
  var e=D.entries,box=$('#ins');
  if(e.length<2){box.innerHTML='';return}
  var w=e.filter(function(x){return x.pnl>0}),l=e.filter(function(x){return x.pnl<0});
  var avg=function(a){return a.length?a.reduce(function(s,x){return s+x.pnl},0)/a.length:0};
  var by=function(k){var m={};e.forEach(function(x){var n=x[k];if(!n)return;m[n]=(m[n]||0)+x.pnl});return Object.keys(m).map(function(n){return[n,m[n]]}).sort(function(a,b){return b[1]-a[1]})};
  var sy=by('sym'),fe=by('emo');
  var srt=e.slice().sort(function(a,b){return b.t-a.t}),sk=0,dir=srt[0].pnl>=0?1:-1;
  for(var i=0;i<srt.length&&(srt[i].pnl>=0?1:-1)===dir;i++)sk++;
  var days={};e.forEach(function(x){var k=new Date(x.t).toDateString();days[k]=(days[k]||0)+x.pnl});
  var mx=Math.max.apply(null,Object.keys(days).map(function(k){return Math.abs(days[k])}).concat([1]));
  var cells='',today=new Date();today.setHours(0,0,0,0);
  for(var d=34;d>=0;d--){var dd=new Date(today);dd.setDate(today.getDate()-d);var v=days[dd.toDateString()],a=v==null?0:.25+.75*Math.abs(v)/mx;
    cells+='<i style="'+(v==null?'':'background:'+(v>=0?'rgba(34,197,94,':'rgba(239,68,68,')+a.toFixed(2)+')')+'" title="'+dd.toLocaleDateString([],{day:'2-digit',month:'short'})+(v==null?': no trades':': '+money(v))+'"></i>'}
  var tile=function(k,v,c){return'<div class="it"><small>'+k+'</small><b class="'+(c||'')+'">'+v+'</b></div>'};
  box.innerHTML='<div class="panel"><div class="ph"><b>Insights</b><span>from your entries</span></div><div class="igrid">'+
    tile('Average win',w.length?money(avg(w)):'—','up')+tile('Average loss',l.length?money(avg(l)):'—','down')+
    tile('Current streak',sk+(dir>0?' wins':' losses'),dir>0?'up':'down')+
    tile('Best symbol',sy.length?esc(sy[0][0])+' '+money(sy[0][1]):'—')+
    tile('Weakest symbol',sy.length>1?esc(sy[sy.length-1][0])+' '+money(sy[sy.length-1][1]):'—')+
    tile('Costliest feeling',fe.length&&fe[fe.length-1][1]<0?esc(fe[fe.length-1][0])+' '+money(fe[fe.length-1][1]):'—')+
    '</div></div><div class="panel"><div class="ph"><b>Daily P/L</b><span>last 5 weeks</span></div><div class="cal">'+cells+'</div><div class="calk"><span>Loss</span><i style="background:rgba(239,68,68,.8)"></i><i></i><i style="background:rgba(34,197,94,.8)"></i><span>Profit</span></div></div>';
}
function list(){
  var q=$('#q').value.trim().toLowerCase(),fs=$('#fSrc').value,fv=$('#fVer').value;
  var a=sorted().filter(function(x){
    if(fs&&x.src!==fs)return false;
    if(fv==='none'?x.verdict:(fv&&x.verdict!==fv))return false;
    return !q||(x.sym+' '+x.reason+' '+x.tags).toLowerCase().indexOf(q)>=0});
  var box=$('#list');
  if(!a.length){
    box.innerHTML=D.entries.length?'<div class="empty"><h3>No entries match</h3>Try clearing the search or filters.</div>':
    '<div class="empty"><h3>Your journal is empty</h3>Add your first entry, connect the terminal, or look around with demo data.<br><button class="btn pri" data-a="new">+ New entry</button><button class="btn" data-a="connect">Connect to Terminal</button><button class="btn" data-a="sample">Load sample trades</button></div>';return}
  box.innerHTML=a.map(function(x){
    var d=new Date(x.t).toLocaleString([],{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    var px=(x.open!==''&&x.open!=null?'Entry '+esc(x.open):'')+(x.close!==''&&x.close!=null?' · Exit '+esc(x.close):'');
    return '<article class="entry" data-id="'+esc(x.id)+'"><div class="etop"><span class="sy">'+esc(x.sym)+'</span><span class="tag '+(x.side==='SELL'?'sell':'buy')+'">'+x.side+' '+(+x.lots).toFixed(2)+'</span>'+
      (x.src==='terminal'?'<span class="tag src">TERMINAL</span>':x.src==='sample'?'<span class="tag sample">SAMPLE</span>':'')+
      '<span class="pl '+(x.pnl>=0?'up':'down')+'">'+money(x.pnl)+'</span></div>'+
      '<div class="emeta">'+d+(px?' · '+px:'')+(x.closedBy&&x.closedBy!=='MANUAL'?' · closed by '+esc(x.closedBy):'')+'</div>'+
      '<div class="ebody"><textarea data-f="reason" rows="3" placeholder="Why did you take this trade? What did you learn?">'+esc(x.reason)+'</textarea>'+
      '<label class="shot" title="Attach a screenshot">'+(x.shot?'<img alt="Trade screenshot" src="'+x.shot+'">':'📎 Add screenshot')+'<input type="file" accept="image/*" data-f="shot" hidden></label></div>'+
      '<div class="erow"><div class="vb" role="group" aria-label="Verdict"><button type="button" class="r'+(x.verdict==='right'?' on r':'')+'" data-v="right">✓ Right call</button><button type="button" class="w'+(x.verdict==='wrong'?' on w':'')+'" data-v="wrong">✕ Wrong call</button></div>'+
      '<input class="tg" data-f="tags" placeholder="Tags" value="'+esc(x.tags)+'">'+
      '<select data-f="emo"><option value="">Feeling</option>'+['Calm','Confident','Hesitant','FOMO','Revenge','Tired'].map(function(o){return'<option'+(x.emo===o?' selected':'')+'>'+o+'</option>'}).join('')+'</select>'+
      '<button class="del" type="button" data-del="1">Delete</button></div></article>';
  }).join('');
}
function find(id){for(var i=0;i<D.entries.length;i++)if(D.entries[i].id===id)return D.entries[i]}

/* ---------- events ---------- */
function bind(){
  var L=$('#list');
  L.addEventListener('input',function(e){var f=e.target.dataset.f,c=e.target.closest('.entry');if(!f||f==='shot'||!c)return;var x=find(c.dataset.id);if(x){x[f]=e.target.value;autosave()}});
  L.addEventListener('change',function(e){
    var c=e.target.closest('.entry');if(!c)return;var x=find(c.dataset.id);if(!x)return;
    if(e.target.dataset.f==='emo'){x.emo=e.target.value;save()}
    if(e.target.dataset.f==='shot'&&e.target.files[0])shrink(e.target.files[0],function(u){x.shot=u;save();render()})});
  L.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    var a=b.dataset.a;if(a==='new')return openNew();if(a==='connect')return askConnect();
    if(a==='sample'){D.entries=D.entries.concat(sampleTrades());save();render();return toast('Sample trades added, tagged SAMPLE')}
    var c=b.closest('.entry');if(!c)return;var x=find(c.dataset.id);if(!x)return;
    if(b.dataset.v){x.verdict=x.verdict===b.dataset.v?'':b.dataset.v;save();render()}
    if(b.dataset.del){D.entries=D.entries.filter(function(y){return y!==x});save();render();toast('Entry deleted')}});
  $('#q').oninput=list;$('#fSrc').onchange=list;$('#fVer').onchange=list;
  $('#bNew').onclick=openNew;$('#sx').onclick=function(){$('#sheet').hidden=true};
  $('#sheet').addEventListener('click',function(e){if(e.target.id==='sheet')e.target.hidden=true});
  $('#msheet').addEventListener('click',function(e){if(e.target.id==='msheet')e.target.hidden=true});
  $('#mx').onclick=function(){$('#msheet').hidden=true};
  $('#nform').onsubmit=function(e){
    e.preventDefault();var f=e.target,g=function(n){return f.elements[n].value};
    D.entries.push({id:'M'+Date.now()+Math.floor(Math.random()*999),src:'manual',sym:g('sym').toUpperCase().trim(),side:g('side'),lots:+g('lots')||0,open:g('open'),close:g('close'),pnl:+g('pnl')||0,t:Date.now(),reason:g('reason'),verdict:'',tags:g('tags'),emo:g('emo'),shot:''});
    save();f.reset();$('#sheet').hidden=true;render();toast('Entry saved')};
  $('#bConnect').onclick=askConnect;$('#bDisc').onclick=askDisc;$('#bExport').onclick=askExport;$('#bMenu').onclick=menu;
  addEventListener('storage',function(e){if(TKEYS.indexOf(e.key)>=0&&sync(true))render()});
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&sync(true))render()});
}
function shrink(file,cb){
  var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var m=900,k=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.72))};im.onerror=function(){toast('Could not read that image')};im.src=r.result};r.readAsDataURL(file)}
function openNew(){$('#sheet').hidden=false;setTimeout(function(){$('#nform').elements.sym.focus()},50)}
function modal(t,h){$('#mt').textContent=t;$('#mb').className='mb';$('#mb').innerHTML=h;$('#msheet').hidden=false}
function askConnect(){
  var n=readTerminal().length;
  modal('Connect to the terminal','<p>The journal will import closed trades saved by the FX WOLVER Terminal in this browser, and keep importing new ones automatically. The terminal is never changed.</p><p><b>'+n+'</b> closed trade'+(n===1?'':'s')+' found right now.</p><div class="row"><button class="btn pri" id="mYes" type="button">Connect</button><button class="btn" id="mNo" type="button">Cancel</button></div>');
  $('#mNo').onclick=function(){$('#msheet').hidden=true};
  $('#mYes').onclick=function(){D.mode='connected';var a=sync(true);save();$('#msheet').hidden=true;render();toast(a?a+' trades synced':'Connected. New closed trades will appear here')};
}
function askDisc(){
  var n=D.entries.filter(function(x){return x.src!=='manual'}).length;
  modal('Disconnect the terminal?','<div class="warn"><b>'+n+' synced entr'+(n===1?'y':'ies')+'</b> (including notes, tags and screenshots added to them) will be removed from this journal. Entries you created yourself stay.</div><div class="row"><button class="btn" id="mExp" type="button">Export CSV first</button><button class="btn danger" id="mYes" type="button">Disconnect and remove data</button><button class="btn" id="mNo" type="button">Cancel</button></div>');
  $('#mNo').onclick=function(){$('#msheet').hidden=true};
  $('#mExp').onclick=askExport;
  $('#mYes').onclick=function(){D.entries=D.entries.filter(function(x){return x.src==='manual'});D.mode='solo';save();$('#msheet').hidden=true;render();toast('Disconnected. Synced data removed')};
}
function menu(){
  var p=D.profile||{};
  modal('Account','<p>'+(p.solo?'Solo profile':esc(p.name||'Trader')+(p.email?' · '+esc(p.email):''))+'<br>Stored on this device.</p><div class="row"><button class="btn" id="mOut" type="button">Sign out</button><button class="btn danger" id="mWipe" type="button">Delete all journal data</button></div>');
  $('#mOut').onclick=function(){D.profile=null;persist();location.reload()};
  $('#mWipe').onclick=function(){modal('Delete everything?','<div class="warn">This permanently deletes all entries and your profile from this browser. Export a CSV first if you want a copy.</div><div class="row"><button class="btn" id="mExp" type="button">Export CSV first</button><button class="btn danger" id="mYes" type="button">Delete all</button><button class="btn" id="mNo" type="button">Cancel</button></div>');
    $('#mNo').onclick=function(){$('#msheet').hidden=true};$('#mExp').onclick=askExport;
    $('#mYes').onclick=function(){try{localStorage.removeItem(KEY)}catch(e){}D={profile:null,mode:'solo',entries:[]};location.reload()}};
}

/* ---------- CSV ---------- */
function cell(v,txt){v=v==null?'':String(v);if(txt&&/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function csv(){
  var H=['Date','Source','Symbol','Side','Lots','Entry','Exit','PnL_USD','Verdict','Feeling','Tags','Reason','Has_Screenshot'];
  var r=sorted().map(function(x){return[new Date(x.t).toISOString(),x.src,x.sym,x.side,x.lots,x.open,x.close,x.pnl,x.verdict,x.emo,x.tags,x.reason,x.shot?'yes':'no'].map(function(v,i){return cell(v,i===2||i>=8)}).join(',')});
  return[H.join(',')].concat(r).join('\r\n');
}
function askExport(){
  var t=csv(),n=D.entries.length;
  modal('Export CSV','<p>'+n+' entr'+(n===1?'y':'ies')+' ready. Opens in Excel, Google Sheets or Numbers.</p><div class="row"><button class="btn pri" id="mDl" type="button">Download CSV</button><button class="btn" id="mCp" type="button">Copy to clipboard</button></div><textarea id="mTa" readonly rows="6"></textarea>');
  $('#mTa').value=t;
  $('#mDl').onclick=function(){try{var b=new Blob(['﻿'+t],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='fxwolver-journal-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();toast('CSV downloaded')}catch(e){toast('Download blocked here. Use Copy instead')}};
  $('#mCp').onclick=function(){var ta=$('#mTa');ta.select();var ok=false;try{ok=document.execCommand('copy')}catch(e){}
    if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){toast('Copied')},function(){toast(ok?'Copied':'Press Ctrl+C to copy')});else toast(ok?'Copied':'Press Ctrl+C to copy')};
}

/* ---------- start ---------- */
function enter(){$('#gate').hidden=true;$('#app').hidden=false;sync(true);render();stamp()}
load();bind();$('#gname').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();$('#gform').requestSubmit?$('#gform').requestSubmit():$('#gform').dispatchEvent(new Event('submit',{cancelable:true}))}});
splash(function(){if(D.profile)enter();else gate()});
window.__fxwJournal={get:function(){return D}};
})();
