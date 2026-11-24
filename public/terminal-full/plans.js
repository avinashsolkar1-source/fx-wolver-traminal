/* FX WOLVER v4.9: account types. 1-Phase and 2-Phase challenges run on a DEMO account; when the trader reaches the Funded stage (or buys Instant funding) the account shows LIVE.
   Prop firms choose the type with ?plan=1phase | 2phase | instant in the terminal link. The switcher in the account chip is for testing.
   Note: LIVE is the account stage. Orders are still simulated in this build; real order routing needs the firm's broker connection. */
(function(){try{
var d=document,$=function(s){return d.querySelector(s)},P=window.FXWPROP;if(!P)return;
var C=P.CONFIG,S=P.S();
function sg(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
var P1={name:'Phase 1',target:8,minDays:5},P2={name:'Phase 2',target:5,minDays:5},F={name:'Funded',target:0,minDays:0,split:80};
var PLANS={none:{label:'Free paper account',short:'Paper',desc:'Practice account with virtual money. No rules.'},
 '1phase':{label:'1-Phase challenge',short:'1-Phase',desc:'DEMO account until the 8% target is reached, then the Funded LIVE account.',phases:[P1,F]},
 '2phase':{label:'2-Phase challenge',short:'2-Phase',desc:'DEMO Phase 1 (8%), DEMO Phase 2 (5%), then the Funded LIVE account.',phases:[P1,P2,F]},
 instant:{label:'Instant funded',short:'Instant',desc:'LIVE funded account from day one. Daily and max loss rules apply, no profit target.',phases:[F]}};
function clone(a){return a.map(function(x){return Object.assign({},x)})}
function save(){try{localStorage.setItem('fxw.prop.v1',JSON.stringify(S))}catch(e){}}
var m=location.search.match(/[?&]plan=([a-z0-9]+)/i),url=m&&PLANS[m[1].toLowerCase()]&&m[1].toLowerCase()!=='none'?m[1].toLowerCase():null,stored=sg('fxw.plan'),plan=PLANS[stored]?stored:(S.on?'2phase':'none');
function apply(k,restart){plan=k;sg('fxw.plan',k);if(k==='none'){S.on=false;save();P.paint();return}
 C.phases=clone(PLANS[k].phases);if(S.phase>=C.phases.length)S.phase=C.phases.length-1;
 if(restart){S.on=true;P.restart(0)}else P.paint()}
if(url&&url!==stored)apply(url,true);else if(plan!=='none')apply(plan,false);
/* account chip */
var ac=$('.acct'),tag=ac&&ac.querySelector('i'),nm=ac&&ac.querySelector('.nm'),wasLive=null;
function live(){return !!(S.on&&C.phases[S.phase]&&C.phases[S.phase].split)}
function paint(){if(!ac||!tag||!nm)return;var lv=typeof LEV!=='undefined'?LEV:100;
 if(!S.on){tag.textContent='PAPER';tag.style.color='';nm.textContent='Paper account · 1:'+lv;ac.title='Free paper account. Click to change the account type.'}
 else{var ph=C.phases[S.phase],L=live();tag.textContent=L?'● LIVE':'● DEMO';tag.style.color=L?'#19c37d':'#f5b83d';nm.textContent=PLANS[plan].short+' · '+ph.name+(S.status==='failed'?' · Failed':S.status==='passed'?' · Passed':'')+' · 1:'+lv;ac.title=(L?'Funded stage (LIVE). ':'Challenge stage (DEMO). ')+'Click to change the account type.'}
 var L2=live();if(wasLive===false&&L2){if(typeof toast==='function')toast('Funded stage reached: your account is now LIVE');if(window.FXWSND)FXWSND([[660,.12],[880,.12],[1175,.25]])}wasLive=L2}
setInterval(paint,1000);paint();
/* switcher */
var ov=d.createElement('div');ov.className='ov';ov.id='planOv';ov.style.zIndex=95;d.body.appendChild(ov);
function menu(){var h='<div class="mbox" style="max-width:460px"><h3><span class="mtag" style="background:var(--blue)">ACCOUNT</span><span>Account type</span></h3><div class="plans">';
 ['none','1phase','2phase','instant'].forEach(function(k){var p=PLANS[k],on=(k==='none'&&!S.on)||(S.on&&k===plan);h+='<button class="plan'+(on?' on':'')+'" data-k="'+k+'"><b>'+p.label+(k==='instant'?'<em class="lv">LIVE</em>':k==='none'?'':'<em>DEMO → LIVE</em>')+'</b><span>'+p.desc+'</span></button>'});
 h+='</div><div class="hkn" style="margin-top:12px">Prop firms set this in the terminal link with <b>?plan=1phase</b>, <b>?plan=2phase</b> or <b>?plan=instant</b>. This switcher is for testing. Switching resets the paper account. LIVE is the funded stage: orders are still simulated until your firm\'s broker is connected.</div><div class="mact"><button class="go" id="planX">Close</button></div></div>';
 ov.innerHTML=h;ov.classList.add('show');$('#planX').onclick=function(){ov.classList.remove('show')};
 [].forEach.call(ov.querySelectorAll('.plan'),function(b){b.onclick=function(){var k=b.dataset.k;if(k===plan&&S.on===(k!=='none'))return ov.classList.remove('show');if(!confirm('Switch to "'+PLANS[k].label+'"? This resets the paper account.'))return;ov.classList.remove('show');
  if(k==='none'){apply('none');if(typeof openReset==='function'){}}else apply(k,true);paint()}})}
ov.onclick=function(e){if(e.target===ov)ov.classList.remove('show')};
if(ac)ac.addEventListener('click',function(e){if(e.target.closest('button'))return;menu()});
if(ac)ac.style.cursor='pointer';
var sm=$('#fxwSide'),lo=$('#fxwLogoutBtn');if(sm&&lo){var x=d.createElement('button');x.className='fxx2';x.textContent='🏦 Account type';x.onclick=function(){var c=$('#fxwSideClose');if(c)c.click();menu()};sm.insertBefore(x,lo)}
window.FXWPLAN={apply:apply,plans:PLANS,get:function(){return plan}};
}catch(e){console.error('FXW plans',e)}})();
