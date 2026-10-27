(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* preloader */
  window.addEventListener('load', function () {
    setTimeout(function () { var p = $('.preloader'); if (p) p.classList.add('done'); document.body.classList.add('ready'); }, 450);
  });
  setTimeout(function () { var p = $('.preloader'); if (p) p.classList.add('done'); document.body.classList.add('ready'); }, 3000);

  /* header, progress, to-top */
  var header = $('.header'), prog = $('.progress'), top = $('.to-top');
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('scrolled', y > 40);
    if (prog) prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (top) top.classList.toggle('show', y > 700);
    var bg = $('.hero-bg');
    if (bg && y < window.innerHeight * 1.2) bg.style.transform = 'translateY(' + y * 0.18 + 'px)';
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* mobile menu */
  var burger = $('.burger'), menu = $('.menu');
  function closeMenu() { if (!burger) return; burger.classList.remove('open'); menu.classList.remove('open'); document.body.style.overflow = ''; burger.setAttribute('aria-expanded', 'false'); }
  if (burger) {
    burger.addEventListener('click', function () {
      var o = burger.classList.toggle('open'); menu.classList.toggle('open', o);
      document.body.style.overflow = o ? 'hidden' : ''; burger.setAttribute('aria-expanded', o);
    });
    $$('.menu a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) closeMenu(); });
  }

  /* reveal on scroll */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.querySelector('[data-count]') || e.target.hasAttribute('data-count')) countIn(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;
  $$('.rv').forEach(function (el) { io ? io.observe(el) : el.classList.add('in'); });

  /* counters */
  function countIn(root) {
    var els = root.hasAttribute('data-count') ? [root] : $$('[data-count]', root);
    els.forEach(function (el) {
      if (el._done) return; el._done = true;
      var end = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '', dec = (el.getAttribute('data-count').split('.')[1] || '').length;
      var t0 = null, dur = 2000;
      function step(t) {
        if (!t0) t0 = t; var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = (end * e).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suf;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  $$('.stats,.hero-stats,.bento,.steps,.timeline').forEach(function (s) { if (io) io.observe(s); });

  /* card spotlight + tilt */
  $$('.card').forEach(function (c) {
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
    });
  });
  var glow = $('.cursor-glow');
  if (glow) window.addEventListener('mousemove', function (e) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; });

  /* FAQ */
  $$('.faq-item').forEach(function (it) {
    var q = $('.faq-q', it), a = $('.faq-a', it);
    q.addEventListener('click', function () {
      var open = it.classList.contains('open');
      $$('.faq-item.open', it.parentNode).forEach(function (o) { o.classList.remove('open'); $('.faq-a', o).style.maxHeight = null; });
      if (!open) { it.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });
  var firstFaq = $('.faq-item'); if (firstFaq) { var fa = $('.faq-a', firstFaq); firstFaq.classList.add('open'); fa.style.maxHeight = fa.scrollHeight + 'px'; }

  /* testimonial slider */
  $$('.slider').forEach(function (s) {
    var track = $('.slides', s), n = $$('.slide', s).length, i = 0, timer, dotsWrap = $('.dots', s);
    var dots = [];
    for (var k = 0; k < n; k++) { (function (k) { var b = document.createElement('button'); b.setAttribute('aria-label', 'Slide ' + (k + 1)); b.addEventListener('click', function () { go(k); reset(); }); dotsWrap.appendChild(b); dots.push(b); })(k); }
    var sl = $$('.slide', s);
    function go(x) { i = (x + n) % n; track.style.transform = 'translateX(-' + i * 100 + '%)'; sl.forEach(function (e, j) { e.classList.toggle('on', j === i); }); dots.forEach(function (d, j) { d.classList.toggle('on', j === i); }); }
    function reset() { clearInterval(timer); timer = setInterval(function () { go(i + 1); }, 6000); }
    var sx = 0; s.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    s.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); reset(); } });
    go(0); reset();
  });

  /* station filter + search */
  var fb = $('.filterbar');
  if (fb) {
    var cards = $$('.station[data-type]'), active = 'all', term = '';
    function apply() {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = (active === 'all' || c.getAttribute('data-type').indexOf(active) > -1) && (c.textContent.toLowerCase().indexOf(term) > -1);
        c.classList.toggle('hide', !ok); if (ok) shown++;
      });
      var em = $('.empty'); if (em) em.style.display = shown ? 'none' : 'block';
    }
    $$('.filters button', fb).forEach(function (b) {
      b.addEventListener('click', function () { $$('.filters button', fb).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); active = b.getAttribute('data-f'); apply(); });
    });
    var inp = $('input', fb); if (inp) inp.addEventListener('input', function () { term = inp.value.trim().toLowerCase(); apply(); });
  }

  /* live bays shuffle (demo) */
  $$('.bay').forEach(function (b, idx) {
    var bar = $('.bar i', b); if (!bar) return;
    setInterval(function () { if (b.classList.contains('busy')) bar.style.width = (30 + Math.random() * 65).toFixed(0) + '%'; }, 2400 + idx * 400);
  });

  /* forms */
  $$('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = $('.form-ok', f); if (ok) { ok.style.display = 'block'; }
      var btn = $('button[type=submit]', f); if (btn) { btn.disabled = true; btn.style.opacity = .7; }
      setTimeout(function () { f.reset(); if (btn) { btn.disabled = false; btn.style.opacity = 1; } if (ok) ok.style.display = 'none'; }, 4500);
    });
  });

  /* magnetic buttons */
  if (window.matchMedia('(hover:hover)').matches) {
    $$('.btn-primary').forEach(function (b) {
      b.addEventListener('mousemove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * 0.14 + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.22 - 3) + 'px)'; });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  }

  /* year */
  $$('[data-year]').forEach(function (y) { y.textContent = new Date().getFullYear(); });

  /* ================= MOTION UPGRADE v2 ================= */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hoverOK = window.matchMedia('(hover:hover)').matches;

  /* headline word-by-word reveal */
  $$('.hero h1').forEach(function (h) {
    var i = 0;
    (function walk(node, grad) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; w.style.setProperty('--i', i++);
            var inner = document.createElement('span'); inner.textContent = t; if (grad) inner.className = 'grad-text';
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          var g = n.classList.contains('grad-text');
          if (g) n.classList.remove('grad-text');
          walk(n, g || grad);
        }
      });
    })(h, false);
  });

  /* hero energy particles */
  var hero = $('.hero');
  if (hero && !reduce) {
    var cv = document.createElement('canvas'); cv.className = 'hero-canvas'; hero.insertBefore(cv, hero.firstChild);
    var cx = cv.getContext('2d'), W, H, pts = [], vis = true, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { W = hero.offsetWidth; H = hero.offsetHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = W < 700 ? 22 : 48; pts = []; for (var k = 0; k < n; k++) pts.push(mk(true)); }
    function mk(init) { return { x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: Math.random() * 2 + .6, v: Math.random() * .6 + .25, a: Math.random() * .6 + .2, gold: Math.random() < .22, w: Math.random() * Math.PI * 2 }; }
    function draw() {
      if (vis && !document.hidden) {
        cx.clearRect(0, 0, W, H);
        pts.forEach(function (p) {
          p.y -= p.v; p.w += .02; p.x += Math.sin(p.w) * .35;
          if (p.y < -10) Object.assign(p, mk(false));
          var c = p.gold ? '232,194,122' : '45,226,176';
          var g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
          g.addColorStop(0, 'rgba(' + c + ',' + p.a + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
          cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r * 6, 0, 6.283); cx.fill();
        });
      }
      requestAnimationFrame(draw);
    }
    size(); draw(); window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(hero);
  }

  /* 3D tilt + glare */
  if (hoverOK && !reduce) {
    $$('.card,.station,.price-card').forEach(function (c) {
      c.classList.add('tilt');
      var gl = document.createElement('span'); gl.className = 'glare'; c.appendChild(gl);
      c.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((x - .5) * 9).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - y) * 9).toFixed(2) + 'deg');
        c.style.setProperty('--gx', (x * 100) + '%'); c.style.setProperty('--gy', (y * 100) + '%');
      });
      c.addEventListener('mouseleave', function () { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    });
  }

  /* image parallax */
  var pimgs = $$('.split-media img');
  if (pimgs.length && !reduce) {
    var ticking = false;
    function par() {
      var vh = window.innerHeight;
      pimgs.forEach(function (im) {
        var r = im.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var t = (r.top + r.height / 2 - vh / 2) / vh;
        im.parentNode.style.setProperty('--py', (t * -34).toFixed(1) + 'px');
        im.style.setProperty('--py', (t * -34).toFixed(1) + 'px');
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true }); par();
  }

  /* button ripple */
  $$('.btn').forEach(function (b) {
    b.addEventListener('click', function (e) {
      var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), sp = document.createElement('span');
      sp.className = 'rip'; sp.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
      b.appendChild(sp); setTimeout(function () { sp.remove(); }, 700);
    });
  });

  /* page transitions */
  $$('a[href$=".html"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      e.preventDefault(); document.body.classList.add('leaving');
      setTimeout(function () { window.location.href = a.href; }, 320);
    });
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) document.body.classList.remove('leaving'); });

  /* photo fallback chain: local .webp -> wsrv.nl webp (data-remote) -> embedded webp (data-local) */
  $$('img[data-local]').forEach(function (im) {
    var stage = 0;
    function next() {
      stage++;
      if (stage === 1 && im.dataset.remote) { im.src = im.dataset.remote; }
      else if (stage <= 2) { stage = 2; im.removeEventListener('error', next); im.src = im.dataset.local; }
    }
    im.addEventListener('error', next);
    if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) next();   /* already failed before JS ran */
    if (im.getAttribute('loading') !== 'lazy') {                                    /* slow eager images only */
      setTimeout(function () { if (stage < 2 && (!im.complete || im.naturalWidth === 0)) next(); }, 8000);
    }
  });
})();