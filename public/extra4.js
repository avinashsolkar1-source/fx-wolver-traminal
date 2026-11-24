/* FXWOLVER extra4.js — cursor spotlight + magnetic buttons (desktop only, no deps) */
(function(){
  if(window.matchMedia && window.matchMedia('(hover:none)').matches) return; // skip on touch

  var hero=document.querySelector('.hero');
  if(hero){
    var raf=null,mx=50,my=30;
    hero.addEventListener('mousemove',function(e){
      var r=hero.getBoundingClientRect();
      mx=((e.clientX-r.left)/r.width*100).toFixed(1);
      my=((e.clientY-r.top)/r.height*100).toFixed(1);
      if(!raf){raf=requestAnimationFrame(function(){
        hero.style.setProperty('--mx',mx+'%');
        hero.style.setProperty('--my',my+'%');
        raf=null;
      });}
    });
  }

  // Magnetic pull on primary CTA buttons
  document.querySelectorAll('.btn.pri, .btn.shine').forEach(function(btn){
    btn.addEventListener('mousemove',function(e){
      var r=btn.getBoundingClientRect();
      var dx=(e.clientX-r.left-r.width/2)*.18;
      var dy=(e.clientY-r.top-r.height/2)*.28;
      btn.style.transform='translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px)';
    });
    btn.addEventListener('mouseleave',function(){btn.style.transform='';});
  });
})();
