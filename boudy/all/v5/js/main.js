/*
  Abdallah Najem site script, version 5.
  - language switch (English in the HTML, French from i18n.js)
  - headings that shrink to fit their measure when a line is too long
  - motion: the ring of type that turns with the scroll, the dials, his words lighting up one
    by one, the service cards that stack, the inner-ear canal, the booking disc
  Everything here is an enhancement: the page reads and works with this file missing.
*/
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var motion = !reduce && !!gsap && !!ST;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function barH() { var b = $('.bar'); return b ? b.offsetHeight : 0; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- Language ---------- */
  var I = window.I18N || { LANGS: { en: {} }, META: {} };
  var EN = {};
  var lang = 'en';

  function eachAttr(el, fn) {
    el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
      var p = pair.split(':');
      if (p.length === 2) fn(p[0].trim(), p[1].trim());
    });
  }

  function collectEnglish() {
    $$('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (!(k in EN)) EN[k] = el.textContent;
    });
    $$('[data-i18n-attr]').forEach(function (el) {
      eachAttr(el, function (attr, k) { if (!(k in EN)) EN[k] = el.getAttribute(attr); });
    });
    if (I.en) Object.keys(I.en).forEach(function (k) { if (!(k in EN)) EN[k] = I.en[k]; });
  }

  function t(k) {
    if (lang !== 'en' && I[lang] && I[lang][k] != null) return I[lang][k];
    return EN[k] != null ? EN[k] : '';
  }

  function applyLang(next, quiet) {
    if (!I.LANGS[next]) next = 'en';
    lang = next;
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-attr]').forEach(function (el) {
      eachAttr(el, function (attr, k) { el.setAttribute(attr, t(k)); });
    });
    root.lang = lang;
    root.dir = I.LANGS[lang].dir || 'ltr';
    var meta = I.META && I.META[lang];
    if (meta) {
      d.title = meta.title;
      var desc = $('meta[name="description"]');
      if (desc) desc.setAttribute('content', meta.description);
    }
    var tog = $('[data-lang-toggle]');
    if (tog) {
      // In English the toggle offers French, and the other way round.
      var label = $('span', tog);
      if (lang === 'en') {
        label.textContent = 'FR';
        tog.setAttribute('aria-label', 'Passer au français');
        tog.setAttribute('lang', 'fr');
      } else {
        label.textContent = 'EN';
        tog.setAttribute('aria-label', 'Switch to English');
        tog.setAttribute('lang', 'en');
      }
    }
    var status = $('[data-canal-status]');
    if (status) status.textContent = '';
    try { localStorage.setItem('lang', lang); } catch (e) { /* private mode */ }
    if (motion) splitWords();
    fitRingText();
    if (!quiet) {
      fitHeadings();
      if (motion) ST.refresh();
    }
  }

  function initialLang() {
    var q = new URLSearchParams(window.location.search).get('lang');
    if (q && I.LANGS[q]) return q;
    try {
      var s = localStorage.getItem('lang');
      if (s && I.LANGS[s]) return s;
    } catch (e) { /* private mode */ }
    return (navigator.language || 'en').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
  }

  /* ---------- Fitting ---------- */
  // The stylesheet gives each heading its size; a heading whose widest line would not fit
  // its measure (a longer French line, a narrow screen) is brought down until it does.
  function fitHeadings() {
    $$('[data-fit]').forEach(function (el) {
      el.style.fontSize = '';
      var cs = getComputedStyle(el);
      var ceiling = parseFloat(cs.fontSize);
      var W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (!W) return;
      el.style.fontSize = '100px';
      var widest = 0;
      $$('.fl', el).forEach(function (l) { widest = Math.max(widest, l.offsetWidth); });
      var size = widest ? (100 * W) / widest * 0.995 : ceiling;
      el.style.fontSize = size < ceiling ? size.toFixed(2) + 'px' : '';
    });
    // headings that belong together (the three verbs) share the smallest fitted size
    var groups = {};
    $$('[data-fit-group]').forEach(function (el) {
      var g = el.getAttribute('data-fit-group');
      (groups[g] = groups[g] || []).push(el);
    });
    Object.keys(groups).forEach(function (g) {
      var px = groups[g].map(function (el) { return parseFloat(getComputedStyle(el).fontSize); });
      var min = Math.min.apply(null, px);
      var max = Math.max.apply(null, px);
      if (max - min > 0.5) groups[g].forEach(function (el) { el.style.fontSize = min.toFixed(2) + 'px'; });
    });
  }

  // The hero ring: four phrases spaced evenly round the circle, a lime dot in each gap.
  function layoutRing() {
    var g = $('[data-ring]');
    if (!g) return;
    var texts = $$('text', g);
    var dots = $$('.orbit__dot', g);
    var C = 2 * Math.PI * 262;
    function lengths() { return texts.map(function (x) { return x.getComputedTextLength(); }); }
    texts.forEach(function (x) { x.style.fontSize = ''; });
    var lens = lengths();
    var sum = lens.reduce(function (a, b) { return a + b; }, 0);
    if (!sum) return;
    if (sum > C * 0.9) {
      var k = (C * 0.9) / sum;
      texts.forEach(function (x) { x.style.fontSize = (parseFloat(getComputedStyle(x).fontSize) * k).toFixed(2) + 'px'; });
      lens = lengths();
      sum = lens.reduce(function (a, b) { return a + b; }, 0);
    }
    var gap = (C - sum) / texts.length;
    var cursor = 0;
    texts.forEach(function (x, i) {
      $('textPath', x).setAttribute('startOffset', cursor.toFixed(1));
      cursor += lens[i];
      if (dots[i]) dots[i].setAttribute('transform', 'rotate(' + (((cursor + gap / 2) / C) * 360).toFixed(2) + ' 300 300)');
      cursor += gap;
    });
  }

  // The booking ring: its words are spread to close the circle exactly.
  function fitRingText() {
    var tp = $('[data-ring-fit]');
    if (!tp || !tp.getComputedTextLength) return;
    tp.removeAttribute('textLength');
    var C = 2 * Math.PI * 126;
    var L = tp.getComputedTextLength();
    if (L > C * 0.7 && L < C * 1.3) {
      tp.setAttribute('textLength', (C * 0.985).toFixed(1));
      tp.setAttribute('lengthAdjust', 'spacing');
    }
  }

  /* ---------- Small things ---------- */
  function setYear() {
    var y = $('[data-year]');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function barState() {
    var bar = $('.bar');
    if (!bar) return;
    function set() { bar.classList.toggle('is-stuck', (window.pageYOffset || 0) > 8); }
    set();
    window.addEventListener('scroll', set, { passive: true });
  }

  // Phone: the booking bar steps aside while a booking button is already on screen.
  function thumbBar() {
    var bar = $('[data-thumb]');
    var marks = $$('[data-thumb-hide]');
    if (!bar || !marks.length || !('IntersectionObserver' in window)) return;
    var seen = [];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = seen.indexOf(en.target);
        if (en.isIntersecting && i === -1) seen.push(en.target);
        if (!en.isIntersecting && i !== -1) seen.splice(i, 1);
      });
      bar.classList.toggle('is-away', seen.length > 0);
    }, { threshold: 0.6 });
    marks.forEach(function (m) { io.observe(m); });
  }

  /* ---------- The canal (works with or without the animation library) ---------- */
  // A ring with one small chamber. Loose crystals lie at the lowest point of the ring and
  // tumble when it turns. The button turns the ring until the chamber is underneath them.
  var canalApi = null;

  function canal() {
    var svg = $('[data-canal]');
    var btn = $('[data-canal-btn]');
    if (!svg || !btn) return;
    var turn = $('[data-canal-turn]', svg);
    var label = $('[data-canal-label]');
    var status = $('[data-canal-status]');
    var DEG = Math.PI / 180;
    var C = 260;
    var RAD = 176;
    var START = -125;
    var offs = [-17, -10, -4, 3, 9, 16];
    var jit = [-8, 6, -3, 9, -6, 2];
    var home = [[-20, -8], [2, -22], [20, -6], [-9, 12], [12, 15], [-27, 10]];
    var stones = $$('[data-canal-stones] circle', svg).map(function (el, i) {
      return { el: el, a: 90 + offs[i], v: 0, off: offs[i], j: jit[i], carry: 0.86 + 0.025 * i, damp: 3.4 + 0.3 * i, hx: home[i][0], hy: home[i][1] };
    });
    var S = { R: START, cap: 0, settled: false, busy: false, target: START };
    var last = S.R;

    function draw() {
      turn.setAttribute('transform', 'rotate(' + S.R.toFixed(2) + ' 260 260)');
      var ca = (90 + S.R) * DEG;
      var hx = C + RAD * Math.cos(ca);
      var hy = C + RAD * Math.sin(ca);
      stones.forEach(function (s) {
        var x = C + (RAD + s.j) * Math.cos(s.a * DEG);
        var y = C + (RAD + s.j) * Math.sin(s.a * DEG);
        if (S.cap > 0) {
          x += (hx + s.hx - x) * S.cap;
          y += (hy + s.hy - y) * S.cap;
        }
        s.el.setAttribute('cx', x.toFixed(1));
        s.el.setAttribute('cy', y.toFixed(1));
      });
    }

    function physics(dt) {
      var dR = S.R - last;
      last = S.R;
      stones.forEach(function (s) {
        s.a += dR * s.carry;
        s.v += -1500 * Math.sin((s.a - 90 - s.off) * DEG) * dt;
        s.v *= Math.exp(-s.damp * dt);
        s.a += s.v * dt;
      });
    }

    function rest() {
      stones.forEach(function (s) { s.a = 90 + s.off; s.v = 0; });
    }

    function setLabel(key) {
      label.setAttribute('data-i18n', key);
      label.textContent = t(key);
    }

    function settledNow() {
      S.R = 0; last = 0; S.cap = 1; S.settled = true; S.busy = false;
      rest();
      draw();
      setLabel('canalAgain');
      status.textContent = t('spinSettled');
    }

    function releasedNow() {
      S.cap = 0; S.settled = false; S.busy = false;
      rest();
      draw();
      setLabel('canalBtn');
    }

    btn.addEventListener('click', function () {
      if (S.busy) return;
      if (!motion) {
        if (S.settled) { S.R = START; last = START; releasedNow(); status.textContent = ''; }
        else settledNow();
        return;
      }
      S.busy = true;
      if (S.settled) {
        status.textContent = '';
        rest();
        gsap.timeline({ onComplete: releasedNow })
          .to(S, { cap: 0, duration: 0.5, ease: 'power2.out' })
          .to(S, { R: S.target, duration: 1.3, ease: 'power2.inOut' }, 0.1);
      } else {
        status.textContent = t('spinSpinning');
        var to = Math.ceil((S.R + 200) / 360) * 360;
        gsap.timeline({ onComplete: settledNow })
          .to(S, { R: to, duration: 3.2, ease: 'power2.inOut' })
          .to(S, { cap: 1, duration: 0.7, ease: 'power2.inOut' }, '-=0.35');
      }
    });

    draw();
    if (!motion) return;

    var seen = false;
    ST.create({
      trigger: svg.closest('section'),
      start: 'top bottom',
      end: 'bottom top',
      onToggle: function (self) { seen = self.isActive; },
      onUpdate: function (self) { S.target = START + self.progress * 420; }
    });
    gsap.ticker.add(function (time, dtms) {
      if (!seen) return;
      var dt = Math.min(0.05, dtms / 1000);
      if (!S.settled && !S.busy) S.R += (S.target - S.R) * Math.min(1, dt * 7);
      if (S.cap < 1) physics(dt); else last = S.R;
      draw();
    });

    canalApi = { state: S };
  }

  /* ---------- Motion ---------- */
  var lenis = null;

  function smoothScroll() {
    if (!window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.11 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function anchors() {
    d.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = id === '#top' ? d.body : $(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(id === '#top' ? 0 : target, { offset: -barH() + 1 });
      } else {
        var top = id === '#top' ? 0 : target.getBoundingClientRect().top + window.pageYOffset - barH() + 1;
        window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
      }
      if (history.replaceState) history.replaceState(null, '', id);
    });
  }

  // His words are wrapped one by one so they can light up as the reader moves down.
  function splitWords() {
    $$('[data-words]').forEach(function (el) {
      var words = el.textContent.split(/\s+/).filter(Boolean);
      el.textContent = '';
      words.forEach(function (w, i) {
        if (i) el.appendChild(d.createTextNode(' '));
        var s = d.createElement('span');
        s.className = 'w';
        s.textContent = w;
        el.appendChild(s);
      });
    });
  }

  function wordsLight() {
    $$('[data-words]').forEach(function (el) {
      function paint(self) {
        var ws = el.querySelectorAll('.w');
        var head = self.progress * (ws.length + 4);
        for (var i = 0; i < ws.length; i++) ws[i].style.opacity = clamp(head - i, 0.2, 1).toFixed(3);
      }
      ST.create({ trigger: el, start: 'top 84%', end: 'bottom 52%', onUpdate: paint, onRefresh: paint });
    });
  }

  // The rings of type turn slowly on their own, and faster with the scroll. He never turns.
  function rings() {
    var ring = $('[data-ring]');
    var disc = $('[data-disc-ring]');
    if (!ring && !disc) return;
    var a = 0;
    var vel = 0;
    var lastY = window.pageYOffset || 0;
    var ringOn = true;
    var discOn = false;
    if (ring) ST.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: function (self) { ringOn = self.isActive; } });
    if (disc) ST.create({ trigger: '.cta', start: 'top bottom', end: 'bottom top', onToggle: function (self) { discOn = self.isActive; } });
    gsap.ticker.add(function (time, dtms) {
      var dt = Math.min(0.05, dtms / 1000);
      if (!dt) return;
      var y = window.pageYOffset || 0;
      var v = (y - lastY) / dt;
      lastY = y;
      vel += (v - vel) * Math.min(1, dt * 6);
      a += (9 + clamp(vel * 0.06, -240, 240)) * dt;
      if (ring && ringOn) ring.style.transform = 'rotate(' + a.toFixed(2) + 'deg)';
      if (disc && discOn) disc.style.transform = 'rotate(' + (-a * 0.8).toFixed(2) + 'deg)';
    });
  }

  function heroMoves() {
    var orbit = $('.orbit svg');
    if (!orbit) return;
    // only where the stage has room to grow without touching the screen edge
    gsap.matchMedia().add('(min-width: 701px)', function () {
      gsap.to(orbit, {
        scale: 1.1, transformOrigin: '50% 50%', ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 }
      });
    });
  }

  function dials() {
    $$('[data-dial]').forEach(function (svg) {
      var dir = Number(svg.getAttribute('data-dial')) || 1;
      // the circle turns inside its box, so the box never grows past the screen edge
      gsap.fromTo($('circle', svg), { rotation: -50 * dir, svgOrigin: '60 60' }, {
        rotation: 110 * dir, svgOrigin: '60 60', ease: 'none',
        scrollTrigger: { trigger: '.dials', start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });
    $$('[data-count]').forEach(function (el) {
      var end = Number(el.getAttribute('data-count'));
      var o = { v: 0 };
      el.textContent = '0';
      gsap.to(o, {
        v: end, duration: 1.1 + end * 0.04, ease: 'power2.out',
        onUpdate: function () { el.textContent = String(Math.round(o.v)); },
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
  }

  // Each card holds its place under the bar while the next one slides over it.
  function stackCards() {
    var cards = $$('.stack .card');
    if (cards.length < 2) return;
    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (min-height: 700px)', function () {
      cards.forEach(function (card, i) {
        var next = cards[i + 1];
        if (!next) return;
        gsap.to(card, {
          scale: 0.93, ease: 'none',
          scrollTrigger: {
            trigger: next,
            start: 'top bottom',
            end: function () { return 'top ' + (barH() + 20 + (i + 1) * 14) + 'px'; },
            scrub: true,
            invalidateOnRefresh: true
          }
        });
      });
    });
  }

  function entrances() {
    ST.batch('[data-in]', {
      start: 'top 90%',
      once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07, overwrite: true, clearProps: 'transform' });
      }
    });
  }

  // Desktop: the booking disc leans toward the pointer.
  function discFollow() {
    var sec = $('.cta');
    var disc = $('[data-disc]');
    if (!sec || !disc || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var qx = gsap.quickTo(disc, 'x', { duration: 0.7, ease: 'power3' });
    var qy = gsap.quickTo(disc, 'y', { duration: 0.7, ease: 'power3' });
    sec.addEventListener('pointermove', function (e) {
      var r = disc.getBoundingClientRect();
      var cx = r.left + r.width / 2 - Number(gsap.getProperty(disc, 'x'));
      var cy = r.top + r.height / 2 - Number(gsap.getProperty(disc, 'y'));
      qx(clamp((e.clientX - cx) * 0.16, -46, 46));
      qy(clamp((e.clientY - cy) * 0.16, -36, 36));
    });
    sec.addEventListener('pointerleave', function () { qx(0); qy(0); });
  }

  function start() {
    collectEnglish();
    applyLang(initialLang(), true);
    setYear();
    barState();
    thumbBar();
    fitHeadings();
    layoutRing();
    fitRingText();

    var tog = $('[data-lang-toggle]');
    if (tog) tog.addEventListener('click', function () { applyLang(lang === 'en' ? 'fr' : 'en'); });

    if (motion) {
      gsap.registerPlugin(ST);
      smoothScroll();
    }
    anchors();
    canal();

    if (motion) {
      clearTimeout(window.__animFailsafe);
      heroMoves();
      rings();
      dials();
      wordsLight();
      stackCards();
      entrances();
      discFollow();
    } else {
      root.classList.remove('anim');
    }

    var again = function () {
      fitHeadings();
      layoutRing();
      fitRingText();
      if (motion) ST.refresh();
    };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(again);
    window.addEventListener('load', again);
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { fitHeadings(); }, 150);
    });
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})();
