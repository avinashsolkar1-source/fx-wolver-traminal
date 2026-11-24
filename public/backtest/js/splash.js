/* FX WOLVER splash — include once on every page: <link rel="stylesheet" href="fxw-splash.css"><script src="fxw-splash.js" defer></script>
   Shows once per browser session (so it doesn't replay on every page click). Change SHOW_ALWAYS to true to show on every load. */
(function () {
  var SHOW_ALWAYS = false, DURATION = 2600;
  try { if (!SHOW_ALWAYS && sessionStorage.getItem('fxw_splash_seen')) return; } catch (e) {}
  var name = 'FXWOLVER'.split('');
  // gradient from white/silver to blue, like the supplied design
  var cols = ['#ffffff','#f1f4fa','#d9e0ee','#b7c6e4','#8fb0ee','#6a9bf2','#4b86f4','#3b82f6'];
  var el = document.createElement('div');
  el.id = 'fxw-splash';
  el.style.setProperty('--fxw-dur', (DURATION - 400) + 'ms');
  el.innerHTML =
    '<img class="fxw-logo" src="assets/logo.png" alt="FX Wolver">' +
    '<div class="fxw-name">' + name.map(function (c, i) {
      return '<span style="color:' + cols[i] + ';animation-delay:' + (0.5 + i * 0.07) + 's">' + c + '</span>';
    }).join('') + '</div>' +
    '<div class="fxw-sub">Trading Terminal</div>' +
    '<div class="fxw-bar"><i></i></div>';
  function mount() { document.documentElement.appendChild(el); }
  mount();
  setTimeout(function () {
    el.classList.add('fxw-hide');
    try { sessionStorage.setItem('fxw_splash_seen', '1'); } catch (e) {}
    setTimeout(function () { el.remove(); }, 800);
  }, DURATION);
})();
