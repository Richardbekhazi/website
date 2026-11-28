/* Abdallah Najem — site behaviour.
   Everything here is progressive: the page is complete without it. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reduceMQ.matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var BOOK_URL = 'https://oprc.janeapp.com/#/staff_member/29';

  clearTimeout(window.__animFailsafe);
  if (!hasGsap) doc.classList.remove('anim');
  var animate = hasGsap && !reduced && doc.classList.contains('anim');
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Every booking link: new tab, correct URL (belt and braces) ---------- */
  $$('[data-book]').forEach(function (a) { a.href = BOOK_URL; a.target = '_blank'; a.rel = 'noopener'; });

  /* =========================================================
     Split text into masked words; lines are revealed in turn
     ========================================================= */
  function split(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    nodes.forEach(function (n) {
      if (n.nodeType !== 3) return; // keep elements (e.g. visually-hidden spans)
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'); w.className = 'w';
        var wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
        w.appendChild(wi); frag.appendChild(w);
      });
      el.replaceChild(frag, n);
    });
    el.classList.add('is-split');
  }
  function revealSplit(el, delay) {
    var words = $$('.wi', el);
    if (!animate) return;
    var lines = [], lastTop = null;
    words.forEach(function (wi) {
      var top = Math.round(wi.parentNode.offsetTop);
      if (top !== lastTop) { lines.push([]); lastTop = top; }
      lines[lines.length - 1].push(wi);
    });
    lines.forEach(function (line, i) {
      gsap.fromTo(line, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', delay: (delay || 0) + i * 0.09 });
    });
    el.dataset.revealed = '1';
  }
  var splitEls = $$('[data-split]');
  splitEls.forEach(split);
  if (animate) splitEls.forEach(function (el) { gsap.set($$('.wi', el), { yPercent: 110 }); });

  /* =========================================================
     Language switcher (EN is read from the page; others from I18N)
     ========================================================= */
  var I = window.I18N || { LANGS: { en: { dir: 'ltr' } }, en: {} };
  var en = I.en || {};
  $$('[data-i18n]').forEach(function (el) { var k = el.dataset.i18n; if (!(k in en)) en[k] = el.textContent.trim().replace(/\s+/g, ' '); });
  $$('[data-i18n-attr]').forEach(function (el) {
    el.dataset.i18nAttr.split(';').forEach(function (pair) {
      var p = pair.split(':'); if (p.length !== 2) return;
      if (!(p[1] in en)) en[p[1]] = el.getAttribute(p[0]);
    });
  });
  I.en = en;
  var current = 'en';

  function t(key) { var d = I[current] || {}; return d[key] != null ? d[key] : en[key]; }

  function applyLang(lang, isInit) {
    if (!I.LANGS[lang]) lang = 'en';
    current = lang;
    var dict = I[lang] || {};
    doc.lang = lang === 'fr' ? 'fr-CA' : (lang === 'en' ? 'en-CA' : lang);
    doc.dir = I.LANGS[lang].dir || 'ltr';
    $$('[data-i18n]').forEach(function (el) {
      var k = el.dataset.i18n; var v = dict[k] != null ? dict[k] : en[k];
      if (v == null) return;
      if (el.hasAttribute('data-split')) {
        el.textContent = v; split(el);
        if (animate && !el.dataset.revealed) gsap.set($$('.wi', el), { yPercent: 110 });
      } else {
        el.textContent = v;
      }
    });
    $$('[data-i18n-attr]').forEach(function (el) {
      el.dataset.i18nAttr.split(';').forEach(function (pair) {
        var p = pair.split(':'); if (p.length !== 2) return;
        var v = dict[p[1]] != null ? dict[p[1]] : en[p[1]];
        if (v != null) el.setAttribute(p[0], v);
      });
    });
    var meta = (I.META || {})[lang];
    if (meta) {
      document.title = meta.title;
      var d = $('meta[name="description"]'); if (d) d.setAttribute('content', meta.description);
    }
    var st = $('[data-spin-status]'); if (st && st.dataset.key) st.textContent = t(st.dataset.key);
    var og = $('meta[property="og:locale"]'); if (og) og.setAttribute('content', I.LANGS[lang].locale || lang);
    if (!isInit) {
      try { localStorage.setItem('lang', lang); } catch (e) {}
      try { var u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u); } catch (e) {}
      if (hasGsap) ScrollTrigger.refresh();
      if (window.__steps) window.__steps.refresh();
    }
  }

  var initial = 'en';
  try { var q = new URL(location.href).searchParams.get('lang'); if (q && I.LANGS[q]) initial = q; else { var s = localStorage.getItem('lang'); if (s && I.LANGS[s]) initial = s; } } catch (e) {}
  if (initial !== 'en') applyLang(initial, true);

  // With two languages the toggle flips; with more it cycles in LANGS order.
  $$('[data-lang-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var keys = Object.keys(I.LANGS);
      applyLang(keys[(keys.indexOf(current) + 1) % keys.length]);
    });
  });

  /* =========================================================
     The waves: layered flat waves on canvas (no WebGL needed)
     ========================================================= */
  var WAVE_SETS = {
    hero: { from: 'bottom', layers: [
      { c: '#dde9f6', y: 0.10, a: 16, f: 1.6, s: 0.22 },
      { c: '#9fc2ec', y: 0.32, a: 20, f: 2.1, s: 0.30 },
      { c: '#4f8fe0', y: 0.52, a: 18, f: 1.3, s: 0.26 },
      { c: '#1f5fbf', y: 0.70, a: 16, f: 2.6, s: 0.36 },
      { c: '#0b1f3a', y: 0.84, a: 12, f: 1.8, s: 0.30 }
    ] },
    cta: { from: 'top', layers: [
      { c: '#12305a', y: 0.86, a: 12, f: 1.7, s: 0.28 },
      { c: '#2a5a9c', y: 0.68, a: 16, f: 2.3, s: 0.32 },
      { c: '#9fc2ec', y: 0.50, a: 16, f: 1.4, s: 0.24 },
      { c: '#dde9f6', y: 0.32, a: 14, f: 2.0, s: 0.30 },
      { c: '#ffffff', y: 0.14, a: 12, f: 1.5, s: 0.22 }
    ] }
  };

  var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  var scrollEnergy = 0, lastScrollY = window.scrollY;
  if (finePointer) window.addEventListener('pointermove', function (e) { pointer.tx = e.clientX / window.innerWidth; pointer.ty = e.clientY / window.innerHeight; }, { passive: true });
  window.addEventListener('scroll', function () {
    var y = window.scrollY; scrollEnergy = clamp(scrollEnergy + Math.abs(y - lastScrollY) * 0.04, 0, 14); lastScrollY = y;
  }, { passive: true });

  function Waves(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.set = WAVE_SETS[canvas.dataset.waves] || WAVE_SETS.hero;
    this.visible = true; this.t = 0; this.entry = animate ? 0 : 1;
    this.resize = this.resize.bind(this); this.resize();
    window.addEventListener('resize', this.resize);
    var self = this;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }).observe(canvas);
  }
  Waves.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = this.c.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.c.width = Math.round(r.width * dpr); this.c.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  };
  Waves.prototype.draw = function () {
    var ctx = this.ctx, w = this.w, h = this.h, set = this.set, t = this.t;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    var px = (pointer.x - 0.5), py = (pointer.y - 0.5);
    var amp = 1 + scrollEnergy * 0.06 + Math.abs(py) * 0.5;
    var step = Math.max(6, w / 140);
    for (var i = 0; i < set.layers.length; i++) {
      var L = set.layers[i];
      // entrance: layers rise in from the edge one after another
      var e = clamp(this.entry * 1.6 - i * 0.15, 0, 1); e = 1 - Math.pow(1 - e, 3);
      var base = set.from === 'bottom' ? h * (L.y + (1 - e) * (1 - L.y + 0.1)) : h * L.y * e;
      ctx.beginPath();
      var startY = set.from === 'bottom' ? h : 0;
      ctx.moveTo(0, startY);
      for (var x = 0; x <= w + step; x += step) {
        var u = x / w;
        var y = base
          + Math.sin(u * Math.PI * L.f + t * L.s + i * 1.7 + px * (1.2 + i * 0.25)) * L.a * amp * 0.65
          + Math.sin(u * Math.PI * (L.f * 2.3) - t * L.s * 1.4 + i * 2.9) * L.a * amp * 0.35;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, startY);
      ctx.closePath();
      ctx.fillStyle = L.c;
      ctx.fill();
    }
  };
  var waves = $$('[data-waves]').map(function (c) { return new Waves(c); });

  var lastT = performance.now();
  function tick(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
    scrollEnergy *= 0.94;
    waves.forEach(function (wv) {
      if (!wv.visible || document.hidden) return;
      wv.t += dt; wv.draw();
    });
    requestAnimationFrame(tick);
  }
  if (!reduced) requestAnimationFrame(tick);

  /* =========================================================
     Page-load sequence + hero entrance
     ========================================================= */
  var header = $('.site-header');
  function heroIntro() {
    var loader = $('.loader');
    if (!animate) {
      if (loader) loader.remove();
      waves.forEach(function (w) { w.entry = 1; w.draw(); });
      return;
    }
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    var path = $('.loader__wave path');
    var len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    tl.from('.loader__word > span', { yPercent: 110, duration: 0.6 })
      .to(path, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, 0.1)
      .to('.loader', { yPercent: -100, duration: 0.75, ease: 'expo.inOut' }, 0.55)
      .add(function () { loader.remove(); })
      .to('.hero__line-in', { y: 0, yPercent: 0, duration: 1.1, stagger: 0.1 }, 0.75)
      .to(waves.filter(function (w) { return w.set.from === 'bottom'; }), { entry: 1, duration: 2.2, ease: 'power2.out' }, 0.7)
      .to('[data-hero-item]', { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, 1.0)
      .to('[data-hero-photo]', { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut' }, 0.8)
      .to('[data-hero-photo] img', { scale: 1.12, duration: 2, ease: 'expo.out' }, 0.9)
      .to(header, { yPercent: 0, y: 0, duration: 0.9 }, 1.1);
    waves.forEach(function (w) { if (w.set.from !== 'bottom') w.entry = 1; });
  }

  /* =========================================================
     Scroll reveals
     ========================================================= */
  function setupReveals() {
    if (!animate) return;
    var horiz = $('.services').classList.contains('is-horizontal');
    var show = function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true }); };
    ScrollTrigger.batch(horiz ? '[data-reveal]:not(.service)' : '[data-reveal]', { start: 'top 90%', once: true, onEnter: show });
    // in the horizontal sequence the cards arrive from the side, so they reveal as the section docks
    if (horiz) ScrollTrigger.create({ trigger: '.services', start: 'top 60%', once: true, onEnter: function () { show($$('.service')); } });
    splitEls.forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { revealSplit(el); } });
    });
    // photographs: a mask opens upward while the picture settles
    $$('[data-photo-reveal]').forEach(function (fig) {
      var img = $('img', fig);
      ScrollTrigger.create({ trigger: fig, start: 'top 85%', once: true, onEnter: function () {
        gsap.to(fig, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.inOut' });
        gsap.to(img, { scale: 1, duration: 1.8, ease: 'expo.out' });
      } });
    });
    // gentle parallax on the hero portrait as the page scrolls away
    var heroImg = $('[data-hero-photo] img');
    if (heroImg) gsap.fromTo(heroImg, { yPercent: 0 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    // count-up numbers in the trust strip
    $$('[data-count]').forEach(function (el) {
      var n = +el.dataset.count, o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
        gsap.to(o, { v: n, duration: 1.4, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
      } });
    });
  }

  /* =========================================================
     Services: pinned horizontal sequence (desktop, motion allowed)
     ========================================================= */
  function setupServices() {
    if (!animate) return;
    var section = $('.services'), track = $('.services__track');
    var mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', function () {
      section.classList.add('is-horizontal');
      var dist = function () {
        var m = parseFloat(getComputedStyle(doc).getPropertyValue('--m')) || 48;
        var left = track.getBoundingClientRect().left - (gsap.getProperty(track, 'x') || 0);
        return Math.max(0, track.scrollWidth + left - window.innerWidth + m);
      };
      var intro = $('.services__intro');
      var tw = gsap.to([intro, track], {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: function () { return '+=' + dist() * 0.8; }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      // service frames drift slightly against the scroll for depth
      $$('.service__frame .frame__art', track).forEach(function (art) {
        gsap.fromTo(art, { xPercent: -6, scale: 1.12 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: art, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
      });
      return function () { section.classList.remove('is-horizontal'); gsap.set([intro, track], { clearProps: 'transform' }); };
    });
  }

  /* =========================================================
     Spin: the room that spins, then settles (the live thing)
     ========================================================= */
  var spinBtn = $('[data-spin-btn]'), room = $('[data-spin-room]'), status = $('[data-spin-status]');
  var spinning = false;
  if (spinBtn && room) {
    spinBtn.addEventListener('click', function () {
      if (spinning) return;
      if (reduceMQ.matches || !room.animate) { status.dataset.key = 'spinSettled'; status.textContent = t('spinSettled'); return; }
      spinning = true; spinBtn.setAttribute('aria-disabled', 'true');
      status.dataset.key = 'spinSpinning'; status.textContent = t('spinSpinning');
      var a = room.animate([
        { transform: 'rotate(0deg)', easing: 'cubic-bezier(.45,0,.55,1)' },
        { transform: 'rotate(540deg)', offset: 0.45, easing: 'cubic-bezier(.2,.6,.3,1)' },
        { transform: 'rotate(736deg)', offset: 0.75, easing: 'ease-in-out' },
        { transform: 'rotate(714deg)', offset: 0.88, easing: 'ease-in-out' },
        { transform: 'rotate(720deg)' }
      ], { duration: 3600 });
      a.onfinish = function () { spinning = false; spinBtn.removeAttribute('aria-disabled'); status.dataset.key = 'spinSettled'; status.textContent = t('spinSettled'); };
    });
  }

  /* =========================================================
     Steps: a movement line that smooths out as you read
     ========================================================= */
  var stepsPath = $('[data-steps-path]'), stepsWord = $('[data-steps-word]'), stepEls = $$('.step');
  var noise = []; for (var k = 0; k < 6; k++) noise.push({ f: 5 + Math.random() * 14, p: Math.random() * 6.28, a: 0.3 + Math.random() * 0.7 });
  var steps = {
    p: 0, target: 0, active: -1, t: 0,
    refresh: function () { this.active = -1; this.update(); },
    update: function () {
      if (!stepsPath) return;
      var list = $('.steps__list'); var r = list.getBoundingClientRect(); var vh = window.innerHeight;
      this.target = clamp((vh * 0.55 - r.top) / Math.max(1, r.height - vh * 0.2), 0, 1);
      var best = 0, bestD = Infinity;
      stepEls.forEach(function (s, i) { var b = s.getBoundingClientRect(); var d = Math.abs(b.top + b.height / 2 - vh * 0.5); if (d < bestD) { bestD = d; best = i; } });
      if (best !== this.active) {
        this.active = best;
        stepEls.forEach(function (s, i) { s.classList.toggle('is-active', i === best); });
        $$('[data-step-layer]').forEach(function (l) { l.classList.toggle('is-on', +l.dataset.stepLayer === best); });
        var title = $('.step__title', stepEls[best]);
        if (stepsWord && title) stepsWord.textContent = title.textContent;
      }
    },
    draw: function () {
      if (!stepsPath) return;
      this.p += (this.target - this.p) * (reduced ? 1 : 0.08);
      var smooth = this.p, d = '', N = 120, tt = this.t;
      for (var i = 0; i <= N; i++) {
        var u = i / N, x = u * 600, jag = 0;
        noise.forEach(function (n) { jag += Math.sin(u * n.f * 6.28 + n.p + tt * 0.8) * n.a; });
        jag = jag / 2.2 * 46 * (1 - smooth) * (1 - smooth);
        var calm = Math.sin(u * 6.28 * 3 + tt * 1.2) * 34 * (0.25 + smooth * 0.75);
        var y = 80 + jag + calm * (0.35 + smooth * 0.65);
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      stepsPath.setAttribute('d', d);
    }
  };
  window.__steps = steps;

  /* ---------- One scroll loop for light work ---------- */
  var spinSection = $('.spin');
  function onScrollFrame() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    steps.update();
    if (reduced) steps.draw();
    if (room && !reduced && spinSection) {
      var r = spinSection.getBoundingClientRect(), vh = window.innerHeight;
      var p = clamp((vh - r.top) / (vh * 0.9), 0, 1); // 0 entering → 1 centred
      var svg = room.firstElementChild;
      svg.style.transform = 'rotate(' + ((1 - p) * -28).toFixed(2) + 'deg) scale(' + (1.12 - p * 0.12).toFixed(3) + ')';
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScrollFrame(); }); } }, { passive: true });
  window.addEventListener('resize', onScrollFrame);
  onScrollFrame();
  (function stepsLoop() {
    if (!document.hidden) { if (!reduced) steps.t += 0.016; steps.draw(); }
    if (!reduced) requestAnimationFrame(stepsLoop);
  })();

  /* ---------- Active nav link ---------- */
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) io.observe(s); });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(function (el) {
      var strength = el.classList.contains('cta__big') ? 0.12 : 0.28;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * strength).toFixed(1) + 'px,' + (dy * strength * 1.3).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Smooth scrolling (Lenis) ---------- */
  var lenis = null;
  if (animate && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    window.__lenis = lenis;
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (id.length < 2) { if (lenis) { e.preventDefault(); lenis.scrollTo(0); } return; }
      var target = $(id); if (!target) return;
      if (id === '#main') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
      if (lenis) { e.preventDefault(); lenis.scrollTo(target, { offset: -(header.offsetHeight + 8) }); history.replaceState(null, '', id); }
    });
  });

  /* ---------- Go ---------- */
  function start() {
    heroIntro();
    if (animate) {
      setupServices();
      setupReveals();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
