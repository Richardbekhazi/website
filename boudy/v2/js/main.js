/*
  Abdallah Najem site script.
  - language switch (English in the HTML, French from i18n.js)
  - headline fitting (the hero sentence and the fitted headings fill their measure)
  - motion: hero entrance, the hero scene where the portrait opens out of the sentence,
    section entrances, the turning room, the session panels, the prints
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
      fitAll();
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
  // The hero sentence: both lines share one size so that "Abdallah" spans the measure and
  // the portrait fills what is left of the first line. On a phone each line fills the width.
  function fitHero() {
    var hero = $('.hero');
    var title = $('.hero__title');
    if (!hero || !title) return;
    var words = $$('.hero__w', title);
    var cs = getComputedStyle(hero);
    var padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var W = hero.clientWidth - padX;
    title.style.setProperty('--fs', '100px');
    title.style.setProperty('--fs1', '100px');
    title.style.setProperty('--fs2', '100px');
    var e1 = words[0].offsetWidth / 100;
    var e2 = words[1].offsetWidth / 100;
    if (!e1 || !e2) return;
    if (window.innerWidth <= 700) {
      title.style.setProperty('--fs1', (W / e1).toFixed(2) + 'px');
      title.style.setProperty('--fs2', (W / e2).toFixed(2) + 'px');
      return;
    }
    var fs = W / Math.max(e2, e1 + 0.09 + 0.58);
    var foot = $('.hero__foot');
    var footH = foot ? foot.offsetHeight + parseFloat(getComputedStyle(foot).marginTop) : 0;
    var avail = window.innerHeight - barH() - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - footH;
    fs = Math.max(96, Math.min(fs, avail / 1.72));
    title.style.setProperty('--fs', fs.toFixed(2) + 'px');
  }

  // Fitted headings: the stylesheet gives the size; a heading whose widest line would not
  // fit its measure (a longer French line, a narrow screen) is brought down until it does.
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

  function fitAll() { fitHero(); fitHeadings(); }

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

  function litCycle() {
    var lits = $$('[data-lit]');
    if (!lits.length || reduce) return;
    var i = 0;
    setInterval(function () {
      lits[i].classList.remove('is-lit');
      i = (i + 1) % lits.length;
      lits[i].classList.add('is-lit');
    }, 1700);
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
  var sceneMeasure = null;

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

  // The scene: scrolling opens the portrait out of the sentence. The picture grows from the
  // gap in the first line into a full-height portrait, while the sentence steps to the left.
  function heroScene() {
    var hero = $('.hero');
    var win = $('[data-hero-win]');
    if (!hero || !win) return;
    var img = $('img', win);
    var slot = $('.hero__slot');
    var title = $('.hero__title');
    var m1 = $('.hero__l1 .hero__mask');
    var l2 = $('.hero__l2');
    var lead = $('.hero__lead');
    var act = $('.hero__act');
    var S = 0.58;
    var geo = null;

    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (min-height: 560px)', function () {
      hero.classList.add('hero--scene');

      function measure() {
        var padL = parseFloat(getComputedStyle(hero).paddingLeft);
        var HW = hero.offsetWidth;
        var HH = hero.offsetHeight;
        var lineH = l2.offsetHeight;
        var tTop = title.offsetTop;
        var tH = title.offsetHeight;
        var from = { x: slot.offsetLeft, y: slot.offsetTop, w: slot.offsetWidth, h: slot.offsetHeight };
        var fh = HH;
        var fw = Math.min(HW * 0.36, fh * 0.8);
        var to = { x: HW - padL - fw, y: 0, w: fw, h: fh };
        var gap1 = lead.offsetTop - (tTop + tH);
        var blockH = tH * S + gap1 + lead.offsetHeight + 22 + act.offsetHeight;
        var shift = Math.max(0, (HH - blockH) / 2 - tTop);
        var leadY = shift - tH * (1 - S);
        geo = {
          from: from, to: to,
          shift: shift,
          l2y: shift - lineH * (1 - S),
          leadY: leadY,
          actX: lead.offsetLeft - act.offsetLeft,
          actY: (lead.offsetTop + leadY + lead.offsetHeight + 22) - act.offsetTop,
          z0: Math.max(1, from.h / (0.44 * Math.max(from.w * 1.25, from.h)))
        };
      }
      measure();
      sceneMeasure = measure;

      var tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: hero,
          // two pixels of scroll before the hold begins, so the first screen rests in the flow
          start: function () { return 'top ' + (barH() - 2) + 'px'; },
          end: '+=95%',
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true
        }
      });
      tl.fromTo(m1, { y: 0, scale: 1 }, { y: function () { return geo.shift; }, scale: S, duration: 0.55 }, 0)
        .fromTo(l2, { y: 0, scale: 1 }, { y: function () { return geo.l2y; }, scale: S, duration: 0.55 }, 0)
        .fromTo(lead, { y: 0 }, { y: function () { return geo.leadY; }, duration: 0.55 }, 0)
        .fromTo(act, { x: 0, y: 0 }, { x: function () { return geo.actX; }, y: function () { return geo.actY; }, duration: 0.55 }, 0)
        .fromTo(win,
          { left: function () { return geo.from.x; }, top: function () { return geo.from.y; }, width: function () { return geo.from.w; }, height: function () { return geo.from.h; } },
          { left: function () { return geo.to.x; }, top: function () { return geo.to.y; }, width: function () { return geo.to.w; }, height: function () { return geo.to.h; }, duration: 0.7 }, 0.3)
        .fromTo(img, { scale: function () { return geo.z0; } }, { scale: 1, duration: 0.7 }, 0.3);

      return function () {
        sceneMeasure = null;
        hero.classList.remove('hero--scene');
        gsap.set([m1, l2, lead, act, win, img], { clearProps: 'transform,left,top,width,height,x,y,scale' });
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
    fitAll();
    anchors();
    litCycle();
    thumbBar();
    barState();

    if (!motion) {
      root.classList.remove('anim');
      window.addEventListener('resize', fitAll);
      if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitAll);
      return;
    }

    clearTimeout(window.__animFailsafe);
    gsap.registerPlugin(ST);
    ST.addEventListener('refreshInit', function () {
      fitAll();
      if (sceneMeasure) sceneMeasure();
    });

    var begun = false;
    function begin() {
      if (begun) return;
      begun = true;
      fitAll();
      smoothScroll();
      heroScene();
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
