/*
  robot-peek.js
  Robot Mercor kecil mengintip dari balik foto profil (hero), diputar sekali saat halaman dibuka.
  Cara pakai: simpan di root repo, lalu tambahkan sebelum </body> di index.html:
    <script src="robot-peek.js" defer></script>
  Kalau robot tidak muncul, ubah PHOTO_SELECTORS di bawah supaya cocok dengan foto di hero.
*/
(function () {
  var PHOTO_SELECTORS = [
    '.frame', '.hero-photo', '.hero-img', '.profile-photo', '.avatar',
    '.hero img', '#home img', 'header img'
  ];
  var NS = 'http://www.w3.org/2000/svg';
  var TH1 = -40, TH2 = -145, T_END = 9000;

  function findPhoto() {
    var i, el;
    for (i = 0; i < PHOTO_SELECTORS.length; i++) {
      el = document.querySelector(PHOTO_SELECTORS[i]);
      if (el) return el;
    }
    var all = document.querySelectorAll('img, div, figure');
    var best = null, bestSize = 0;
    for (i = 0; i < all.length; i++) {
      var n = all[i];
      if (n.closest('nav')) continue;
      var rc = n.getBoundingClientRect();
      var ratio = rc.width / (rc.height || 1);
      if (rc.width < 150 || rc.width > 600 || ratio < 0.85 || ratio > 1.18) continue;
      if (rc.top > window.innerHeight + window.scrollY) continue;
      var br = getComputedStyle(n).borderRadius;
      if (br.indexOf('50%') === -1 && parseFloat(br) < rc.width / 2 - 2) continue;
      if (rc.width > bestSize) { best = n; bestSize = rc.width; }
    }
    return best;
  }
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ez(x) { x = cl(x); return x * x * (3 - 2 * x); }
  function makeSvg(w, h, z) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', w);
    s.setAttribute('height', h);
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:' + z + ';';
    return s;
  }

  function start(force) {
    var photo = findPhoto();
    if (!photo) { console.warn('robot-peek: foto tidak ditemukan, ubah PHOTO_SELECTORS'); return; }
    if (force !== true && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (photo.tagName === 'IMG' && photo.parentElement && getComputedStyle(photo.parentElement).overflow !== 'visible') {
      photo = photo.parentElement;
    }
    console.log('robot-peek: foto ditemukan', photo);

    var parent = photo.parentElement;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    if (getComputedStyle(photo).position === 'static') photo.style.position = 'relative';
    photo.style.zIndex = '1';

    var pr = parent.getBoundingClientRect();
    var r = photo.getBoundingClientRect();
    var cx = r.left - pr.left + r.width / 2;
    var cy = r.top - pr.top + r.height / 2;
    var R = Math.min(r.width, r.height) / 2;
    var k = R / 86;

    var back = makeSvg(pr.width, pr.height, 0);
    back.innerHTML =
      '<defs>' +
      '<linearGradient id="rp-head" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4ff"/><stop offset="1" stop-color="#cfd0f5"/></linearGradient>' +
      '<linearGradient id="rp-face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a63f0"/><stop offset="1" stop-color="#4a41d8"/></linearGradient>' +
      '</defs>' +
      '<g id="rp-bot"><g transform="scale(' + (1.5 * k) + ')">' +
      '<rect x="-8" y="-26" width="16" height="18" rx="6" fill="#cfd0f5"/>' +
      '<line x1="0" y1="-44" x2="0" y2="-49" stroke="#8f8af2" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle id="rp-ant" cx="0" cy="-51" r="2.6" fill="#5b52e8"/>' +
      '<rect x="-18" y="-38" width="4" height="10" rx="2" fill="#5b52e8"/>' +
      '<rect x="14" y="-38" width="4" height="10" rx="2" fill="#5b52e8"/>' +
      '<rect x="-14" y="-44" width="28" height="23" rx="8" fill="url(#rp-head)"/>' +
      '<rect x="-10" y="-40" width="20" height="14" rx="4.5" fill="url(#rp-face)"/>' +
      '<circle id="rp-pl" cx="-4" cy="-33.5" r="2.4" fill="#fff"/><circle id="rp-pr" cx="4" cy="-33.5" r="2.4" fill="#fff"/>' +
      '<path d="M-2.5 -29.5 Q0 -27 2.5 -29.5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>' +
      '</g></g>';
    var front = makeSvg(pr.width, pr.height, 2);
    front.innerHTML =
      '<g id="rp-hands" opacity="0"><g transform="scale(' + k + ')">' +
      '<circle id="rp-hl" cx="-18" cy="0" r="5" fill="#cfd0f5"/>' +
      '<circle id="rp-hr" cx="18" cy="0" r="5" fill="#5b52e8"/>' +
      '</g></g>';
    parent.insertBefore(back, photo);
    parent.appendChild(front);

    var bot = back.querySelector('#rp-bot');
    var pL = back.querySelector('#rp-pl');
    var pR = back.querySelector('#rp-pr');
    var ant = back.querySelector('#rp-ant');
    var hands = front.querySelector('#rp-hands');
    var hL = front.querySelector('#rp-hl');
    var hR = front.querySelector('#rp-hr');
    bot.setAttribute('opacity', 0);

    var t0 = null;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var t = ts - t0;
      if (t > T_END) {
        back.remove();
        front.remove();
        return;
      }
      var th = t < 5000 ? TH1 : TH2;
      var p = 0, lx = 0, wave = false, sway = 0, eyeS = 1;

      if (t >= 600 && t < 5000) {
        if (t < 1100) p = ez((t - 600) / 500);
        else if (t < 4300) p = 1;
        else if (t < 4800) p = 1 - ez((t - 4300) / 500);
        if (t >= 1100 && t < 3000) lx = 2.6 * Math.sin((t - 1100) / 260);
        else if (t >= 3000 && t < 4300) wave = true;
      } else if (t >= 5400 && t < 9000) {
        if (t < 5800) p = ez((t - 5400) / 400);
        else if (t < 6800) p = 1;
        else if (t < 7100) p = 1 - 0.75 * ez((t - 6800) / 300);
        else if (t < 7300) p = 0.25;
        else if (t < 7600) p = 0.25 + 0.75 * ez((t - 7300) / 300);
        else if (t < 8200) p = 1;
        else if (t < 8700) p = 1 - ez((t - 8200) / 500);
        if (t >= 5800 && t < 6800) lx = 2.6 * Math.sin((t - 5800) / 260);
        else if (t >= 7300 && t < 8200) {
          eyeS = 1.25;
          if (t < 7800) sway = Math.sin(t / 40) * 4;
        }
      }

      var rad = th * Math.PI / 180;
      var dx = Math.cos(rad), dy = Math.sin(rad);
      var r0 = (10 + 42 * p) * k;
      bot.setAttribute('transform',
        'translate(' + (cx + dx * r0).toFixed(1) + ' ' + (cy + dy * r0).toFixed(1) + ') rotate(' + (th + 90 + sway).toFixed(1) + ')');
      bot.setAttribute('opacity', p > 0 ? 1 : 0);
      pL.setAttribute('cx', -4 + lx * 0.6);
      pR.setAttribute('cx', 4 + lx * 0.6);
      pL.setAttribute('r', 2.4 * eyeS);
      pR.setAttribute('r', 2.4 * eyeS);
      ant.setAttribute('fill', Math.floor(t / 300) % 2 ? '#5b52e8' : '#8f8af2');

      hands.setAttribute('transform',
        'translate(' + (cx + dx * 88 * k).toFixed(1) + ' ' + (cy + dy * 88 * k).toFixed(1) + ') rotate(' + (th + 90) + ')');
      hands.setAttribute('opacity', cl((p - 0.55) / 0.25));
      hR.setAttribute('cy', wave ? -18 + Math.sin(t / 90) * 4 : 0);
      hR.setAttribute('cx', wave ? 24 + Math.sin(t / 90) * 5 : 18);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.robotPeek = function () { start(true); };
  if (document.readyState === 'complete') setTimeout(start, 500);
  else window.addEventListener('load', function () { setTimeout(start, 500); });
})();
