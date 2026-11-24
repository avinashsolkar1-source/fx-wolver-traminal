/* FX WOLVER symbol information (v4.4): an "i" button on every instrument that opens the full contract specification, costs, swap, margin and trading hours.
   Contract size, digits, pip, margin and leverage come from the terminal's own paper-trading model.
   Swap and commission use the SAMPLE schedule below, because a paper account has no real broker. Edit SWAP / COMM to match your firm or broker. */
(function(){try{
var d=document,$=function(s){return d.querySelector(s)};
/* ---- fee schedule: SAMPLE values, clearly labelled in the dialog ---- */
var SWAP={ /* class defaults. pts = swap in points per night per lot; pct = annual financing % of position value (long / short, negative = you pay) */
 forex:{type:'pts',L:-6.8,S:1.9,triple:'Wednesday'},
 comm:{type:'pts',L:-9,S:3,triple:'Wednesday'},
 index:{type:'pct',L:-4.8,S:-0.8,triple:'Friday'},
 crypto:{type:'pct',L:-12,S:-4,triple:'none (charged all 7 days)'},
 stocks:{type:'pct',L:-6,S:-1.5,triple:'Friday'}};
var SWAP_SYM={XAUUSD:{type:'pts',L:-28,S:11,triple:'Wednesday'},XAGUSD:{type:'pts',L:-12,S:4,triple:'Wednesday'},
 USDJPY:{type:'pts',L:3.2,S:-8.9,triple:'Wednesday'},EURJPY:{type:'pts',L:1.4,S:-6.6,triple:'Wednesday'},GBPJPY:{type:'pts',L:2.1,S:-8.2,triple:'Wednesday'},AUDJPY:{type:'pts',L:1.8,S:-6.9,triple:'Wednesday'},NZDJPY:{type:'pts',L:1.6,S:-6.4,triple:'Wednesday'},CADJPY:{type:'pts',L:1.9,S:-6.8,triple:'Wednesday'},CHFJPY:{type:'pts',L:-1.2,S:-1.5,triple:'Wednesday'}};
var COMM={forex:{t:'none',txt:'None (spread only)'},comm:{t:'none',txt:'None (spread only)'},index:{t:'none',txt:'None (spread only)'},crypto:{t:'pct',v:0.06,txt:'0.06% of position value per side'},stocks:{t:'usd',v:0.02,txt:'$0.02 per share per side'}};
var HOURS={forex:{rows:[['Open','Sunday 22:00 UTC'],['Close','Friday 22:00 UTC'],['Daily break','None for major pairs'],['Peak liquidity','London + New York overlap, 13:00–17:00 UTC']],seg:[[0,24]],wk:1},
 comm:{rows:[['Open','Sunday 23:00 UTC'],['Close','Friday 22:00 UTC'],['Daily break','22:00–23:00 UTC'],['Note','Energy and metals follow futures hours']],seg:[[0,22],[23,24]],wk:1},
 index:{rows:[['Hours','Follow each exchange (cash session) plus extended futures hours'],['Weekend','Closed'],['Note','Index prices can lag a few minutes on the free feed']],seg:[[7,21]],wk:1},
 crypto:{rows:[['Open','24 hours, 7 days'],['Break','None'],['Note','Weekend and holiday prices keep moving']],seg:[[0,24]],wk:0},
 stocks:{rows:[['Regular session','13:30–20:00 UTC (14:30–21:00 UTC in winter)'],['Weekend','Closed'],['Note','Quotes outside the session show the last price']],seg:[[13.5,20]],wk:1}};
function pair(i){var s=i.symbol;if(i.cat==='forex')return[s.slice(0,3),s.slice(3)];if(i.cat==='comm'){return[({XAU:'Gold',XAG:'Silver',XPT:'Platinum',XPD:'Palladium'})[s.slice(0,3)]||s,'USD']}if(i.cat==='crypto')return[s.replace('USDT',''),'USDT'];return[s,i.quote||'USD']}
function sp(i){var p=Math.pow(10,-i.digits),ps=0;try{ps=pipSize(i)}catch(e){}var nom=0,mg=0,pv=0,q=1;try{q=qRate(i);nom=i.contract*baseUsd(i);mg=marginOf({sym:i.symbol,vol:1});pv=i.contract*p*q}catch(e){}return{point:p,pip:ps,nom:nom,mg:mg,pv:pv,q:q}}
function swapOf(i){var c=SWAP_SYM[i.symbol]||SWAP[i.cat]||SWAP.forex,k=sp(i),px=i.mid||i.base||0;
 function one(rate){if(c.type==='pts')return{pts:rate,usd:rate*k.pv};var u=rate/100*k.nom/365;return{pts:k.pv?u/k.pv:0,usd:u}}
 return{c:c,L:one(c.L),S:one(c.S),pct:c.type==='pct'}}
var M=function(v,s){return typeof money==='function'?money(v,s):'$'+v.toFixed(2)};
var f2=function(v,n){return (+v).toFixed(n==null?2:n)};
var cur='ov',inst=null;
function box(){var e=$('#spec');if(e)return e;e=d.createElement('div');e.className='ov';e.id='spec';e.innerHTML='<div class="sp-box" role="dialog" aria-modal="true"><div class="sp-h"></div><div class="sp-px"></div><div class="sp-tabs"></div><div class="sp-body"></div><div class="sp-f"></div></div>';d.body.appendChild(e);
 e.onclick=function(ev){if(ev.target===e)close()};d.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&e.classList.contains('show'))close()});return e}
function close(){var e=$('#spec');if(e)e.classList.remove('show')}
function cell(l,v,sub,cls){return'<div class="sp-c"><span>'+l+'</span><b'+(cls?' class="'+cls+'"':'')+'>'+v+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</div>'}
function open(i,tab){inst=i;cur=tab||cur||'ov';var e=box();e.classList.add('show');draw();clearInterval(open.t);open.t=setInterval(function(){if(!e.classList.contains('show'))return clearInterval(open.t);live()},1000)}
function live(){var i=inst,e=$('#spec');if(!i||!e)return;var px=e.querySelector('.sp-px');if(px)px.innerHTML=pxHTML(i);var st=e.querySelector('[data-st]');if(st){var s=status(i);st.className=s[1];st.textContent=s[0]}}
function status(i){return!i.live?['NO PRICE','no']:(i.closed&&i.src!=='Binance')?['MARKET CLOSED','no']:i.src==='SAMPLE'?['SAMPLE DATA','no']:['TRADING','ok']}
function pxHTML(i){var k=sp(i),spr=i.live?i.ask-i.bid:null,pr=k.pip?(spr/k.pip).toFixed(1)+' pips':(spr==null?'—':f2(spr,i.digits));var pc=i.live&&i.open?(i.mid/i.open-1)*100:null;
 return'<div class="s"><small>SELL</small><b>'+(i.live?f2(i.bid,i.digits):'—')+'</b></div><div class="b"><small>BUY</small><b>'+(i.live?f2(i.ask,i.digits):'—')+'</b></div><div><small>Spread</small><b>'+(spr==null?'—':pr)+'</b></div><div><small>Change</small><b class="'+(pc==null?'':pc>=0?'pos':'neg')+'">'+(pc==null?'—':(pc>=0?'+':'')+pc.toFixed(2)+'%')+'</b></div>'}
function draw(){var i=inst,e=$('#spec'),p=pair(i),st=status(i),k=sp(i);
 e.querySelector('.sp-h').innerHTML='<div class="sp-ic">'+(i.cat==='forex'?p[0]:i.symbol.slice(0,3))+'</div><div class="sp-t"><b>'+i.symbol+'</b><small>'+i.name+'</small></div><div class="sp-cls"><i>'+(CAT_LABEL[i.cat]||i.cat)+'</i><em data-st class="'+st[1]+'">'+st[0]+'</em></div><button class="sp-x" aria-label="Close">×</button>';
 e.querySelector('.sp-x').onclick=close;
 e.querySelector('.sp-px').innerHTML=pxHTML(i);
 var T=[['ov','Specification'],['fee','Costs & swap'],['hr','Trading hours']];
 var tb=e.querySelector('.sp-tabs');tb.innerHTML=T.map(function(t){return'<button data-t="'+t[0]+'" class="'+(t[0]===cur?'on':'')+'">'+t[1]+'</button>'}).join('');
 tb.onclick=function(ev){var b=ev.target.closest('button');if(!b)return;cur=b.dataset.t;draw()};
 var B=e.querySelector('.sp-body');B.innerHTML=cur==='ov'?viewOv(i,p,k):cur==='fee'?viewFee(i,k):viewHr(i);
 if(cur==='ov')wireOv(i,k);if(cur==='fee')wireFee(i,k);
 var F=e.querySelector('.sp-f');F.innerHTML='<button class="s" id="spS">SELL</button><button id="spC">Show chart</button><button class="b" id="spB">BUY</button>';
 function go(side){close();if(typeof active!=='undefined'&&active!==i)select(i,true);setTimeout(function(){var b=$(side==='S'?'#bSell':'#bBuy');if(b)b.click()},60)}
 $('#spS').onclick=function(){go('S')};$('#spB').onclick=function(){go('B')};$('#spC').onclick=function(){close();if(active!==i)select(i,true);if(innerWidth<=900){var m=$('#mobnav [data-v="chart"]');if(m)m.click()}}}
function viewOv(i,p,k){var lev=typeof LEV!=='undefined'?LEV:100,isF=i.cat==='forex';
 var base=i.cat==='forex'||i.cat==='crypto'?p[0]:(i.cat==='comm'?p[0]:'—');
 var h='<div class="sp-h4">CONTRACT</div><div class="sp-grid">'+
 cell('Description',i.name)+cell('Class',CAT_LABEL[i.cat]||i.cat)+
 cell('Base / quote currency',(i.cat==='index'||i.cat==='stocks')?'— / '+(i.quote||'USD'):p[0]+' / '+p[1])+cell('Price digits',i.digits)+
 cell(k.pip?'Pip size':'Point size',k.pip?f2(k.pip,i.symbol.indexOf('JPY')>0?2:4)+'<small>1 point = '+k.point.toFixed(i.digits)+'</small>':k.point.toFixed(i.digits)+' (1 point)')+
 cell('Contract size (1 lot)',i.contract.toLocaleString('en-US')+(isF?' '+p[0]:i.cat==='stocks'?' share':i.cat==='crypto'?' '+p[0]:i.cat==='comm'?' units':' index unit'))+
 cell('Min lot / step','0.01 / 0.01')+cell('Data source',i.live?i.src:'offline',i.src==='Binance'?'real bid / ask':'one price, spread estimated')+'</div>'+
 '<div class="sp-h4">MARGIN & VALUE (1 LOT)</div><div class="sp-grid">'+
 cell('Leverage','1 : '+lev,'margin '+(100/lev).toFixed(2)+'%')+cell('Margin for 1 lot',M(k.mg))+
 cell('Nominal value of 1 lot',M(k.nom))+cell((k.pip?'Pip':'Point')+' value of 1 lot',M(k.pip?k.pv*k.pip/k.point:k.pv),k.pip?'per pip':'per point')+'</div>'+
 '<div class="sp-calc"><div class="sp-h4" style="margin-top:0">POSITION CALCULATOR</div><div class="sp-in"><label>Lots<input id="spLots" type="number" step="0.01" min="0.01" value="'+(parseFloat(($('#lots')||{}).value)||0.1)+'"></label></div><div class="sp-grid" id="spRes"></div></div>'+
 '<div class="sp-note">Contract size, pip, margin and leverage are the rules of this paper-trading terminal. A real broker or prop firm can use different values.</div>';return h}
function wireOv(i,k){var inp=$('#spLots');function r(){var v=Math.max(0.01,parseFloat(inp.value)||0.01);$('#spRes').innerHTML=cell('Margin required',M(k.mg*v))+cell('Position value',M(k.nom*v))+cell((k.pip?'1 pip':'1 point')+' move',M((k.pip?k.pv*k.pip/k.point:k.pv)*v))+cell('Spread cost now',i.live?M((i.ask-i.bid)*i.contract*k.q*v):'—','paid when you open')}inp.oninput=r;r()}
function viewFee(i,k){var s=swapOf(i),cm=COMM[i.cat]||COMM.forex,spr=i.live?i.ask-i.bid:null;
 var swTxt=function(o){return(s.c.type==='pts'?f2(o.pts,1)+' pts':f2(o.pts,1)+' pts <small style="display:inline;color:var(--dim)">('+(s.c[o===s.L?'L':'S']>=0?'+':'')+s.c[o===s.L?'L':'S']+'% / yr)</small>')};
 return'<div class="sp-h4">TRADING COSTS</div><div class="sp-grid">'+
 cell('Spread now',spr==null?'—':(k.pip?(spr/k.pip).toFixed(1)+' pips':f2(spr,i.digits)),spr==null?'':'about '+M(spr*i.contract*k.q)+' per lot')+
 cell('Commission',cm.txt,'sample schedule')+
 cell('Swap long (BUY)',f2(s.L.pts,1)+' pts','≈ '+M(s.L.usd,true)+' per lot / night',s.L.usd<0?'neg':'pos')+
 cell('Swap short (SELL)',f2(s.S.pts,1)+' pts','≈ '+M(s.S.usd,true)+' per lot / night',s.S.usd<0?'neg':'pos')+
 cell('Triple swap day',s.c.triple,'covers the weekend')+cell('Swap basis',s.c.type==='pts'?'Fixed points per night':'Annual financing on position value',s.c.type==='pct'?'long '+s.c.L+'% · short '+s.c.S+'% a year':'')+'</div>'+
 '<div class="sp-calc"><div class="sp-h4" style="margin-top:0">COST ESTIMATOR</div><div class="sp-in"><label>Lots<input id="fLots" type="number" step="0.01" min="0.01" value="'+(parseFloat(($('#lots')||{}).value)||0.1)+'"></label><label>Nights held<input id="fN" type="number" step="1" min="0" value="3"></label><label>Side<select id="fS"><option value="L">BUY (long)</option><option value="S">SELL (short)</option></select></label></div><div class="sp-grid" id="fRes"></div></div>'+
 '<div class="sp-note">SAMPLE schedule: swap and commission are example values, not a real broker quote. They are shown so you can plan costs, and they are <b>not charged</b> to the paper balance. Set the real values for your firm in <b>specs.js</b> (SWAP and COMM).</div>'}
function wireFee(i,k){var s=swapOf(i),cm=COMM[i.cat]||COMM.forex;function r(){var v=Math.max(0.01,parseFloat($('#fLots').value)||0.01),n=Math.max(0,Math.floor(+$('#fN').value||0)),sd=$('#fS').value,per=s[sd].usd*v,tr=s.c.triple.indexOf('none')===0?0:Math.floor(n/7)*2,sw=per*(n+tr),
  nom=k.nom*v,co=cm.t==='pct'?nom*cm.v/100*2:cm.t==='usd'?cm.v*i.contract*v*2:0,spc=i.live?(i.ask-i.bid)*i.contract*k.q*v:0;
 $('#fRes').innerHTML=cell('Swap per night',M(per,true),'',per<0?'neg':'pos')+cell('Swap for '+n+' night'+(n===1?'':'s'),M(sw,true),tr?'includes '+tr+' extra triple-swap night'+(tr>1?'s':''):'',sw<0?'neg':'pos')+cell('Commission (open + close)',co?M(-co):'$0.00')+cell('Spread cost',M(-spc))+cell('Total cost to hold',M(sw-co-spc,true),'before any price move',(sw-co-spc)<0?'neg':'pos')+cell('Needs price move of',k.pv&&v?((Math.abs(sw-co-spc)/(k.pv*v)).toFixed(1))+' pts':'—','to break even')}
 ['fLots','fN','fS'].forEach(function(id){$('#'+id).oninput=r;$('#'+id).onchange=r});r()}
function viewHr(i){var H=HOURS[i.cat]||HOURS.forex,n=new Date(),u=n.getUTCHours()+n.getUTCMinutes()/60;
 return'<div class="sp-h4">TRADING HOURS (TYPICAL)</div><table class="sp-hrs">'+H.rows.map(function(r){return'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>'}).join('')+'</table>'+
 '<div class="sp-h4">TODAY, UTC TIMELINE</div><div class="sp-bar">'+H.seg.map(function(g){return'<i style="left:'+g[0]/24*100+'%;width:'+(g[1]-g[0])/24*100+'%"></i>'}).join('')+'<u style="left:'+u/24*100+'%"></u></div><div class="sp-ax"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>'+
 '<div class="sp-grid" style="margin-top:12px">'+cell('Now (UTC)',n.toISOString().slice(11,16))+cell('Status',status(i)[0])+'</div>'+
 '<div class="sp-note">Hours are typical and can change with holidays and daylight saving. The terminal shows the live status above from the price feed.</div>'}
/* ---- hook up: the i button on each watchlist row, the quick card and the chart toolbar ---- */
function addIcons(){[].forEach.call(d.querySelectorAll('.mw-row:not([data-i])'),function(r){r.dataset.i='1';var b=r.querySelector('.sym b');if(!b)return;var u=d.createElement('u');u.className='rinfo';u.title='Instrument information: swap, fees, margin, hours';u.dataset.info=r.dataset.sym;u.textContent='i';var st=b.querySelector('[data-star]');if(st)b.insertBefore(u,st);else b.appendChild(u)})}
var list=$('#mwList');if(list)list.addEventListener('click',function(e){var u=e.target.closest('[data-info]');if(!u)return;e.stopPropagation();e.preventDefault();var i=BY[u.dataset.info];if(i)open(i)},true);
var ib=$('#infoB');if(ib)ib.onclick=function(e){if(e&&e.stopPropagation)e.stopPropagation();open(active)};
var old=$('#symInfo');if(old)old.remove();
addIcons();setInterval(addIcons,2000);
window.FXWSPEC={open:function(sym){var i=BY[sym]||active;open(i)},close:close};
d.addEventListener('keydown',function(e){if(e.key==='i'&&!/input|textarea|select/i.test((e.target.tagName||''))&&!e.ctrlKey&&!e.metaKey){open(active)}});
}catch(e){console.error('FXW specs',e)}})();
