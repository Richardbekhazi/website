/*
  Abdallah Najem site script, version 3.
  - language switch (English in the HTML, French from i18n.js)
  - headings that shrink to fit their measure when a line is too long
  - motion: section entrances, the waves that rise as the first screen leaves, the numbers
    that count up, the services sequence that moves sideways, the turning room, the session
    panels, the prints
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
    var status = $('[data-spin-status]');
    if (status) status.textContent = '';
    try { localStorage.setItem('lang', lang); } catch (e) { /* private mode */ }
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

  // First screen: as it leaves, the waves rise like a tide and his portrait drifts a little.
  function heroMoves() {
    var hero = $('.hero');
    if (!hero) return;
    var cfg = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.4 };
    gsap.fromTo(hero, { '--tide': 0 }, { '--tide': 1, ease: 'none', scrollTrigger: cfg });
    var portrait = $('[data-hero-portrait] img');
    if (portrait) gsap.fromTo(portrait, { yPercent: 0 }, { yPercent: 7, ease: 'none', scrollTrigger: cfg });
  }

  // The numbers count up once, when the band comes into view.
  function countUp() {
    $$('[data-count]').forEach(function (el) {
      var end = parseInt(el.getAttribute('data-count'), 10);
      if (!end) return;
      var o = { v: 0 };
      el.textContent = '0';
      gsap.to(o, {
        v: end, duration: 1.4, ease: 'power2.out',
        onUpdate: function () { el.textContent = String(Math.round(o.v)); },
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });
  }

  // Services: on a wide, tall-enough screen the sequence is held and moves sideways.
  function careSequence() {
    var care = $('.care');
    var pin = $('.care__pin');
    var track = $('.care__track');
    if (!care || !pin || !track) return;
    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (min-height: 720px)', function () {
      care.classList.add('care--h');
      function dist() { return Math.max(0, track.scrollWidth - pin.clientWidth); }
      gsap.to(track, {
        x: function () { return -dist(); },
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: function () { return 'top ' + barH() + 'px'; },
          end: function () { return '+=' + dist(); },
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true
        }
      });
      return function () {
        care.classList.remove('care--h');
        gsap.set(track, { clearProps: 'transform' });
      };
    });
  }

  function entrances() {
    ST.batch('[data-in]', {
      start: 'top 90%',
      once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true });
      }
    });

    $$('[data-print]').forEach(function (p, i) {
      var r = parseFloat(p.getAttribute('data-r')) || 0;
      gsap.fromTo(p, { opacity: 0, y: 110, rotation: r * 2.6 }, {
        opacity: 1, y: 0, rotation: r, duration: 1.05, ease: 'power3.out', delay: i * 0.09,
        scrollTrigger: { trigger: '.tour__prints', start: 'top 82%', once: true },
        onComplete: function () { gsap.set(p, { clearProps: 'transform' }); p.classList.add('is-set'); }
      });
    });
  }

  // The live thing: the real treatment room turns as it comes into view and holds still by
  // the time it is centred. The button turns it again.
  function turningRoom() {
    var turn = $('[data-spin-turn]');
    var btn = $('[data-spin-btn]');
    var status = $('[data-spin-status]');
    if (!turn) return;
    var st = { rs: -24, rb: 0, ds: 1, db: 0 };
    var busy = false;
    function draw() {
      turn.style.transform = 'rotate(' + (st.rs + st.rb).toFixed(2) + 'deg)';
      turn.style.setProperty('--dv', Math.min(1, Math.max(st.ds, st.db)).toFixed(3));
    }
    draw();
    gsap.to(st, {
      rs: 0, ds: 0, ease: 'none', onUpdate: draw,
      scrollTrigger: { trigger: '.spin__fig', start: 'top 95%', end: 'center 52%', scrub: 0.8 }
    });
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      if (status) status.textContent = t('spinSpinning');
      gsap.timeline({
        onUpdate: draw,
        onComplete: function () {
          st.rb = 0; draw(); busy = false;
          if (status) status.textContent = t('spinSettled');
        }
      })
        .to(st, { db: 1, duration: 0.5, ease: 'power2.out' }, 0)
        .to(st, { rb: 360, duration: 2.8, ease: 'power3.inOut' }, 0)
        .to(st, { db: 0, duration: 1.2, ease: 'power2.inOut' }, 1.7);
    });
  }

  function movingPictures() {
    $$('.panel').forEach(function (p) {
      gsap.fromTo($('.panel__bg', p), { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    var top = $('.cta__top');
    var bot = $('.cta__bot');
    if (top && bot) {
      var cfg = { trigger: '.cta', start: 'top bottom', end: 'top top', scrub: 0.5 };
      gsap.fromTo(top, { xPercent: -14 }, { xPercent: 0, ease: 'none', scrollTrigger: cfg });
      gsap.fromTo(bot, { xPercent: 14 }, { xPercent: 0, ease: 'none', scrollTrigger: cfg });
    }
    var name = $('.foot__name');
    if (name) {
      gsap.fromTo(name, { yPercent: 62, y: 0 }, {
        yPercent: 16, y: 0, ease: 'none',
        scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: 0.5 }
      });
    }
  }

  /* ---------- Start ---------- */
  function start() {
    collectEnglish();
    var first = initialLang();
    if (first !== 'en') applyLang(first, true);
    var tog = $('[data-lang-toggle]');
    if (tog) tog.addEventListener('click', function () { applyLang(lang === 'en' ? 'fr' : 'en'); });
    setYear();
    fitHeadings();
    anchors();
    thumbBar();
    barState();

    if (!motion) {
      root.classList.remove('anim');
      window.addEventListener('resize', fitHeadings);
      if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitHeadings);
      return;
    }

    clearTimeout(window.__animFailsafe);
    gsap.registerPlugin(ST);
    ST.addEventListener('refreshInit', fitHeadings);

    var begun = false;
    function begin() {
      if (begun) return;
      begun = true;
      fitHeadings();
      smoothScroll();
      heroMoves();
      countUp();
      careSequence();
      entrances();
      turningRoom();
      movingPictures();
      ST.refresh();
    }
    if (d.fonts && d.fonts.ready) {
      d.fonts.ready.then(begin);
      setTimeout(begin, 1800);
    } else {
      begin();
    }
    window.addEventListener('load', function () { ST.refresh(); });
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})();
