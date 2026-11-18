/*
  Abdallah Najem site script, version 4: the page is one line that moves sideways.
  - language switch (English in the HTML, French from i18n.js)
  - the wheel, the keyboard and the rail buttons all move along the line
  - the rail: where you are, a line that ripples while you move and lies flat when you stop
  - the room in the dizziness pane tilts with your speed and settles when you stop
  - entrances, numbers that count up
  - a switch to an ordinary vertical page, for anyone the sideways line does not suit
  The page reads and scrolls (sideways) with this file missing.
*/
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var short = window.matchMedia('(max-height: 600px)'); // below this the page is always stacked
  var vertical = root.classList.contains('is-vertical'); // set in the head: a very short window, or the reader's choice
  var motion = !reduce;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

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
    if (!quiet) { measure(); railState(true); }
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

  /* ---------- The line ---------- */
  var panes = [];
  var lefts = [];
  var overlap = 0;
  var lenis = null;
  var floats = [];
  var scroller = null;
  var track = null;

  function sideways() { return !vertical; }
  function sx() { return scroller ? scroller.scrollLeft : 0; }
  // How far along the page we are, whichever way it runs.
  function pos() { return vertical ? (window.pageYOffset || 0) : sx(); }
  function maxX() { return scroller ? Math.max(0, scroller.scrollWidth - scroller.clientWidth) : 0; }

  function measure() {
    var x = sx();
    lefts = panes.map(function (p) { return p.getBoundingClientRect().left + x; });
    overlap = panes[1] ? -parseFloat(getComputedStyle(panes[1]).marginLeft) || 0 : 0;
    floats.forEach(function (f) {
      f.el.style.translate = '';
      var r = f.el.getBoundingClientRect();
      f.mid = r.left + x + r.width / 2;
    });
    lineSize();
  }

  // Where a pane begins, past the rounded edge that overlaps the pane before it.
  function paneStart(i) { return i <= 0 ? 0 : lefts[i] + overlap; }

  function currentIndex() {
    var idx = 0;
    if (vertical) {
      var line = window.innerHeight * 0.35;
      for (var j = 0; j < panes.length; j++) if (panes[j].getBoundingClientRect().top <= line) idx = j;
      return idx;
    }
    var x = sx() + window.innerWidth * 0.35;
    for (var i = 0; i < lefts.length; i++) if (lefts[i] <= x) idx = i;
    return idx;
  }

  function go(x, instant) {
    if (vertical) { window.scrollTo({ left: 0, top: Math.max(0, x), behavior: reduce || instant ? 'auto' : 'smooth' }); return; }
    x = clamp(x, 0, maxX());
    if (lenis && !instant) lenis.scrollTo(x);
    else if (lenis) lenis.scrollTo(x, { immediate: true });
    else scroller.scrollTo({ left: x, top: 0, behavior: reduce || instant ? 'auto' : 'smooth' });
  }

  function goToTarget(target) {
    if (!sideways()) {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    var pane = target.closest ? target.closest('.pane') : null;
    var i = panes.indexOf(pane || target);
    go(i >= 0 ? paneStart(i) : target.getBoundingClientRect().left + sx() - 24);
  }

  function smooth() {
    if (!sideways()) return;
    if (motion && window.Lenis) {
      lenis = new window.Lenis({ wrapper: scroller, content: track, orientation: 'horizontal', gestureOrientation: 'both', lerp: 0.1, wheelMultiplier: 1.1 });
      return;
    }
    // No smoothing: the wheel still moves the line.
    scroller.addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      scroller.scrollLeft += e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    }, { passive: false });
  }

  function keys() {
    window.addEventListener('keydown', function (e) {
      if (!sideways() || e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = (e.target && e.target.tagName) || '';
      if (/^(INPUT|TEXTAREA|SELECT|IFRAME)$/.test(tag)) return;
      var page = window.innerWidth * 0.85;
      var by = null;
      switch (e.key) {
        case 'ArrowDown': by = 140; break;
        case 'ArrowUp': by = -140; break;
        case 'PageDown': by = page; break;
        case 'PageUp': by = -page; break;
        case ' ':
          if (/^(BUTTON|A|SUMMARY)$/.test(tag)) return;
          by = e.shiftKey ? -page : page; break;
        case 'Home': e.preventDefault(); go(0); return;
        case 'End': e.preventDefault(); go(maxX()); return;
        default: return;
      }
      e.preventDefault();
      go(sx() + by);
    });
  }

  function anchors() {
    d.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      if (id === '#main') { go(0, true); target.focus({ preventScroll: true }); return; }
      goToTarget(target);
      if (history.replaceState) history.replaceState(null, '', id);
    });
  }

  /* ---------- The rail ---------- */
  var rail = {};
  var lastIdx = -1;
  var lineW = 0, lineH = 0;

  function railSetup() {
    rail.num = $('[data-rail-num]');
    rail.of = $('[data-rail-of]');
    rail.name = $('[data-rail-name]');
    rail.prev = $('[data-prev]');
    rail.next = $('[data-next]');
    rail.line = $('[data-line]');
    rail.path = rail.line ? $('path', rail.line) : null;
    rail.dot = $('[data-dot]');
    if (rail.of) rail.of.textContent = '/ ' + pad(panes.length);
    if (rail.prev) rail.prev.addEventListener('click', function () {
      var i = currentIndex();
      go(sx() > paneStart(i) + 40 ? paneStart(i) : paneStart(i - 1));
    });
    if (rail.next) rail.next.addEventListener('click', function () {
      var i = currentIndex();
      go(i >= panes.length - 1 ? maxX() : paneStart(i + 1));
    });
    if (rail.line) rail.line.addEventListener('pointerdown', function (e) {
      var r = rail.line.getBoundingClientRect();
      go(clamp((e.clientX - r.left) / r.width, 0, 1) * maxX());
    });
  }

  function lineSize() {
    if (!rail.line) return;
    lineW = rail.line.clientWidth;
    lineH = rail.line.clientHeight;
    drawLine(0, 0);
  }

  // A line that ripples with `amp` (0 to 1) and is perfectly flat at 0.
  function waveY(x, amp, phase) {
    return lineH / 2 + amp * (lineH * 0.36) * Math.sin(x * 0.042 + phase);
  }
  function drawLine(amp, phase) {
    if (!rail.path || !lineW) return;
    var dStr;
    if (amp < 0.004) {
      dStr = 'M0 ' + (lineH / 2) + 'H' + lineW;
    } else {
      dStr = 'M0 ' + waveY(0, amp, phase).toFixed(1);
      for (var x = 12; x <= lineW + 12; x += 12) dStr += 'L' + x + ' ' + waveY(x, amp, phase).toFixed(1);
    }
    rail.path.setAttribute('d', dStr);
    if (rail.dot) {
      var m = maxX();
      var px = (m ? sx() / m : 0) * lineW;
      rail.dot.style.transform = 'translate(' + px.toFixed(1) + 'px,' + (waveY(px, amp, phase) - lineH / 2).toFixed(1) + 'px)';
    }
  }

  function railState(force) {
    var i = currentIndex();
    var x = sx();
    if (rail.prev) rail.prev.disabled = x <= 2;
    if (rail.next) rail.next.disabled = x >= maxX() - 2;
    if (i === lastIdx && !force) return;
    lastIdx = i;
    if (rail.num) rail.num.textContent = pad(i + 1);
    if (rail.name) rail.name.textContent = t(panes[i].getAttribute('data-rail') || '');
    var id = panes[i].id;
    $$('.bar__nav a').forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------- The room that tilts ---------- */
  var room = { el: null, status: null, a: 0, v: 0, kicked: false, near: false };

  function roomSetup() {
    room.el = $('[data-spin-room]');
    room.status = $('[data-spin-status]');
    var btn = $('[data-spin-btn]');
    if (!room.el || !btn) return;
    btn.addEventListener('click', function () {
      if (!motion) { room.status.textContent = t('spinSettled'); return; }
      room.v += room.a >= 0 ? 21 : -21;
      room.kicked = true;
      room.status.textContent = t('spinSpinning');
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { room.near = en[0].isIntersecting; }, { rootMargin: '0px 30% 0px 30%' }).observe(room.el);
    } else {
      room.near = true;
    }
  }

  function roomStep(speed) {
    if (!room.el) return;
    if (!room.near && Math.abs(room.a) < 0.05 && Math.abs(room.v) < 0.05) return;
    var target = room.near ? clamp(speed * 0.55, -24, 24) : 0;
    room.v += (target - room.a) * 0.07;
    room.v *= 0.88;
    room.a += room.v;
    room.el.style.transform = 'rotate(' + room.a.toFixed(2) + 'deg)';
    if (room.kicked && Math.abs(room.a) < 0.5 && Math.abs(room.v) < 0.08) {
      room.kicked = false;
      room.status.textContent = t('spinSettled');
    }
  }

  /* ---------- Frame loop ---------- */
  var lastX = 0, vel = 0, amp = 0, phase = 0, flat = true;

  function frame(time) {
    if (lenis) lenis.raf(time);
    var x = pos();
    var dx = x - lastX;
    lastX = x;
    vel += (dx - vel) * 0.2;
    var speed = Math.abs(vel);

    var want = Math.min(1, speed / 42);
    amp += (want - amp) * (want > amp ? 0.22 : 0.05);
    phase += 0.1 + speed * 0.012;
    if (amp > 0.004) { drawLine(amp, phase); flat = false; }
    else if (!flat || dx !== 0) { drawLine(0, 0); flat = true; }

    if (dx !== 0) railState(false);
    roomStep(vertical ? 0 : vel); // on the vertical page the room only turns when asked

    if (sideways()) {
      var mid = x + window.innerWidth / 2;
      for (var i = 0; i < floats.length; i++) {
        var f = floats[i];
        var off = f.mid - mid;
        if (Math.abs(off) < window.innerWidth * 1.5) f.el.style.translate = (off * f.k).toFixed(1) + 'px 0';
      }
    }
    window.requestAnimationFrame(frame);
  }

  /* ---------- Entrances and small things ---------- */
  function entrances() {
    var items = $$('[data-in]');
    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px -5% 0px -5%', threshold: 0.01 });
    items.forEach(function (el) { io.observe(el); });
  }

  function countUp() {
    if (!motion || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target;
        var end = parseInt(el.getAttribute('data-count'), 10) || 0;
        var t0 = null;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / 900);
          el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
          if (p < 1) window.requestAnimationFrame(step);
        }
        el.textContent = '0';
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    $$('[data-count]').forEach(function (el) { io.observe(el); });
  }

  function smallThings() {
    var y = $('[data-year]');
    if (y) y.textContent = String(new Date().getFullYear());
    $$('[data-tilt]').forEach(function (el) { el.style.setProperty('--tilt', el.getAttribute('data-tilt') + 'deg'); });
    // The map only takes the wheel once it has been asked to, so it never traps the line.
    var map = $('[data-map]');
    var use = $('[data-map-use]');
    if (map && use) {
      use.addEventListener('click', function () { map.classList.add('is-live'); });
      map.addEventListener('mouseleave', function () { map.classList.remove('is-live'); });
    }
    var tog = $('[data-lang-toggle]');
    if (tog) tog.addEventListener('click', function () { applyLang(lang === 'en' ? 'fr' : 'en'); });
  }

  /* ---------- Sideways or vertical ---------- */
  function layoutPref() {
    var q = new URLSearchParams(window.location.search).get('layout');
    if (q === 'vertical' || q === 'sideways') return q;
    try { return localStorage.getItem('v4-layout'); } catch (e) { return null; }
  }

  // The two layouts are different enough that the page starts again, at the section you were reading.
  function layoutSetup() {
    $$('[data-layout-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var next = vertical ? 'sideways' : 'vertical';
        var saved = false;
        try { localStorage.setItem('v4-layout', next); saved = true; } catch (e) { /* private mode */ }
        try { sessionStorage.setItem('v4-pane', String(currentIndex())); } catch (e) { /* private mode */ }
        var url = new URL(window.location.href);
        if (saved) url.searchParams.delete('layout'); else url.searchParams.set('layout', next);
        url.hash = '';
        if (history.replaceState) history.replaceState(null, '', url.pathname + url.search);
        window.location.reload();
      });
    });
  }

  function restorePlace() {
    var back = null;
    try { back = sessionStorage.getItem('v4-pane'); sessionStorage.removeItem('v4-pane'); } catch (e) { /* private mode */ }
    if (back === null) return false;
    var i = clamp(parseInt(back, 10) || 0, 0, panes.length - 1);
    // The browser would otherwise put the reloaded page back where the other layout was.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    function place() {
      if (vertical) {
        var bar = $('.bar');
        go(i > 0 ? panes[i].getBoundingClientRect().top + pos() - (bar ? bar.offsetHeight : 0) : 0, true);
      } else {
        go(paneStart(i), true);
      }
    }
    place();
    // Once more when the pictures are in, unless the reader has already moved on.
    var placed = pos();
    window.addEventListener('load', function () { if (Math.abs(pos() - placed) < 4) place(); });
    return true;
  }

  /* ---------- Start ---------- */
  function start() {
    panes = $$('.pane');
    scroller = $('[data-scroller]');
    track = $('[data-track]');
    floats = motion ? $$('[data-speed]').map(function (el) { return { el: el, k: parseFloat(el.getAttribute('data-speed')) || 0, mid: 0 }; }) : [];
    collectEnglish();
    railSetup();
    applyLang(initialLang(), true);
    smallThings();
    layoutSetup();
    smooth();
    keys();
    anchors();
    roomSetup();
    measure();
    railState(true);
    entrances();
    countUp();

    if (window.__animFailsafe) window.clearTimeout(window.__animFailsafe);

    var again;
    window.addEventListener('resize', function () {
      window.clearTimeout(again);
      again = window.setTimeout(function () { measure(); railState(true); }, 150);
    });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { measure(); railState(true); });
    window.addEventListener('load', function () { measure(); railState(true); });
    // Anything that changes the length of the line (a late picture, a longer French line) is measured again.
    if ('ResizeObserver' in window) {
      var seenW = 0;
      new ResizeObserver(function () {
        var w = track.scrollWidth;
        if (Math.abs(w - seenW) < 2) return;
        seenW = w;
        measure(); railState(true);
      }).observe(track);
    }
    // Crossing into or out of the stacked layout changes everything: start clean.
    if (short.addEventListener) short.addEventListener('change', function () {
      root.classList.toggle('is-short', short.matches);
      if ((short.matches || layoutPref() === 'vertical') !== vertical) window.location.reload();
    });

    if (restorePlace()) {
      /* back at the section the reader was in before switching layout */
    } else if (window.location.hash.length > 1) {
      var target = $(window.location.hash);
      if (target && sideways()) { var i = panes.indexOf(target); if (i > 0) go(paneStart(i), true); }
    }

    if (motion) {
      lastX = pos();
      window.requestAnimationFrame(frame);
    } else {
      (vertical ? window : scroller).addEventListener('scroll', function () { railState(false); drawLine(0, 0); }, { passive: true });
    }
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})();
