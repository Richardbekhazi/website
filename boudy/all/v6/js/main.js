/*
  Abdallah Najem site script, version 6: a page that holds still.
  - language switch (English in the HTML, French from i18n.js)
  - seven sheets on one screen: pointing at one, clicking it, or the arrow keys slides it open
  - inside a sheet, pointing at a word shows what belongs to it (tabs, by the keyboard too)
  - the room in the dizziness sheet sways while the pointer moves over it and holds still when it stops
  - headings are kept to two lines; each sheet's parts rise the first time it opens
  Without this file the page is an ordinary one that reads from top to bottom.
*/
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

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
    // The language list opens on the language the page is being read in.
    var mine = $('.pick--langs [role="tab"][lang="' + lang + '"]') || $('.pick--langs [role="tab"]');
    if (mine && mine.__select) mine.__select();
    try { localStorage.setItem('lang', lang); } catch (e) { /* private mode */ }
    if (!quiet) fitHeads();
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

  /* ---------- A pointer that has really moved ----------
     Browsers send pointer events when things slide under a pointer that is resting.
     Only a pointer the reader has moved counts as pointing. */
  var px = -1, py = -1;
  function moved(e) {
    if (e.pointerType === 'touch') return false;
    if (Math.abs(e.clientX - px) + Math.abs(e.clientY - py) < 2) return false;
    px = e.clientX; py = e.clientY;
    return true;
  }

  /* ---------- The sheets ---------- */
  var deck = null;
  var sheets = [];
  var open = 0;
  var intent = null;
  var pending = -1;

  function seen(sheet) {
    if (root.classList.contains('is-in')) sheet.classList.add('is-seen');
  }

  function show(i, opts) {
    i = clamp(i, 0, sheets.length - 1);
    window.clearTimeout(intent);
    pending = -1;
    if (i === open && !(opts && opts.force)) return;
    open = i;
    sheets.forEach(function (s, k) {
      var on = k === i;
      s.classList.toggle('is-open', on);
      s.classList.toggle('is-after', k > i);
      $('[data-spine]', s).setAttribute('aria-expanded', on ? 'true' : 'false');
      var body = $('.body', s);
      if (on) body.removeAttribute('inert'); else body.setAttribute('inert', '');
    });
    seen(sheets[i]);
    if (sheets[i].id === 'clinic') loadMap();
    if (!(opts && opts.quiet)) {
      try {
        window.history.replaceState(null, '', i === 0 ? window.location.pathname + window.location.search : '#' + sheets[i].id);
      } catch (e) { /* file: pages */ }
    }
    if (opts && opts.focus) $('[data-spine]', sheets[i]).focus({ preventScroll: true });
  }

  function byId(id) {
    for (var k = 0; k < sheets.length; k++) if (sheets[k].id === id) return k;
    return -1;
  }

  function sheetSetup() {
    deck = $('[data-deck]');
    sheets = $$('[data-sheet]', deck);
    sheets.forEach(function (s, k) {
      $$('[data-rise]', s).forEach(function (el, n) { el.style.setProperty('--d', n); });
      $('[data-spine]', s).addEventListener('click', function () { show(k); });
    });

    // Pointing at a closed sheet opens it, after a moment's rest on it.
    deck.addEventListener('pointermove', function (e) {
      if (!moved(e)) return;
      var s = e.target.closest ? e.target.closest('[data-sheet]') : null;
      var k = s ? sheets.indexOf(s) : -1;
      if (k < 0 || k === open) { window.clearTimeout(intent); pending = -1; return; }
      if (k === pending) return;
      pending = k;
      window.clearTimeout(intent);
      intent = window.setTimeout(function () { show(k); }, 80);
    });
    deck.addEventListener('pointerleave', function () { window.clearTimeout(intent); pending = -1; });

    // Arrow keys move between sheets, unless a set of tabs is using them.
    d.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var el = e.target;
      if (el.closest && el.closest('[role="tablist"], input, textarea, select, iframe')) return;
      if (e.key === 'ArrowRight') { show(open + 1, { focus: el.matches('[data-spine]') }); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { show(open - 1, { focus: el.matches('[data-spine]') }); e.preventDefault(); }
      else if (e.key === 'Escape') {
        $$('.tip.is-open').forEach(function (tip) { tip.classList.remove('is-open'); $('[data-tip-btn]', tip).setAttribute('aria-expanded', 'false'); });
      }
    });

    // Links to a sheet open it.
    d.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var k = byId(a.getAttribute('href').slice(1));
      if (k < 0) return;
      e.preventDefault();
      show(k);
      if (a.classList.contains('skip')) deck.focus({ preventScroll: true });
    });
    window.addEventListener('hashchange', function () {
      var k = byId(window.location.hash.slice(1));
      if (k >= 0) show(k, { quiet: true });
    });

    // On a touch screen, a sideways swipe moves to the next sheet.
    var sx = 0, sy = 0, st = 0, tracking = false;
    deck.addEventListener('pointerdown', function (e) {
      tracking = e.pointerType === 'touch' && !e.target.closest('[role="tablist"], .room');
      sx = e.clientX; sy = e.clientY; st = Date.now();
    });
    deck.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Date.now() - st < 700 && Math.abs(dx) > 56 && Math.abs(dx) > 1.7 * Math.abs(dy)) show(open + (dx < 0 ? 1 : -1));
    });

    sheets.forEach(function (s, k) {
      if (k !== open) $('.body', s).setAttribute('inert', '');
    });
    var first = byId(window.location.hash.slice(1));
    if (first > 0) show(first, { quiet: true });
  }

  /* ---------- Pointing at a word ---------- */
  function pickSetup() {
    $$('[data-pick]').forEach(function (pick) {
      var list = $('[role="tablist"]', pick);
      var tabs = $$('[role="tab"]', pick);
      var panes = tabs.map(function (tab) { return d.getElementById(tab.getAttribute('aria-controls')); });
      var vertical = list.getAttribute('aria-orientation') === 'vertical';
      var timer = null;
      var want = -1;

      function detailMode() { return window.getComputedStyle(pick).getPropertyValue('--md').trim() === '1'; }

      function select(i, focus) {
        tabs.forEach(function (tab, k) {
          var on = k === i;
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
          tab.tabIndex = on ? 0 : -1;
          panes[k].classList.toggle('is-on', on);
        });
        if (focus) tabs[i].focus({ preventScroll: true });
        var frame = $('iframe[data-src]', panes[i]);
        if (frame && pick.closest('.sheet.is-open')) loadMap();
      }

      tabs.forEach(function (tab, k) {
        tab.__select = function () { select(k); };
        tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
        tab.addEventListener('click', function () {
          select(k);
          if (detailMode()) {
            pick.classList.add('is-detail');
            var back = $('[data-pick-back]', pick);
            if (back) back.focus({ preventScroll: true });
          }
        });
        tab.addEventListener('keydown', function (e) {
          var next = e.key === (vertical ? 'ArrowDown' : 'ArrowRight') || (vertical && e.key === 'ArrowRight');
          var prev = e.key === (vertical ? 'ArrowUp' : 'ArrowLeft') || (vertical && e.key === 'ArrowLeft');
          var to = -1;
          if (next) to = (k + 1) % tabs.length;
          else if (prev) to = (k - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') to = 0;
          else if (e.key === 'End') to = tabs.length - 1;
          if (to < 0) return;
          e.preventDefault();
          e.stopPropagation();
          select(to, true);
        });
      });

      list.addEventListener('pointermove', function (e) {
        if (!moved(e)) return;
        var tab = e.target.closest('[role="tab"]');
        var k = tab ? tabs.indexOf(tab) : -1;
        if (k < 0 || k === want) return;
        want = k;
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { select(k); }, 60);
      });
      list.addEventListener('pointerleave', function () { window.clearTimeout(timer); want = -1; });

      var back = $('[data-pick-back]', pick);
      if (back) back.addEventListener('click', function () {
        pick.classList.remove('is-detail');
        var cur = tabs.filter(function (tab) { return tab.getAttribute('aria-selected') === 'true'; })[0];
        if (cur) cur.focus({ preventScroll: true });
      });
    });
  }

  /* ---------- The map loads the first time the clinic sheet shows it ---------- */
  function loadMap() {
    var frame = $('iframe[data-src]');
    if (!frame || !frame.closest('.pane.is-on')) return;
    frame.src = frame.getAttribute('data-src');
    frame.removeAttribute('data-src');
  }

  /* ---------- The room: it sways while you move, and holds still when you stop ---------- */
  function roomSetup() {
    var fig = $('[data-room]');
    var img = $('[data-spin-room]');
    var btn = $('[data-spin-btn]');
    var status = $('[data-spin-status]');
    if (!fig || !img) return;
    var angle = 0, vel = 0, target = 0, raf = 0;
    var lastMove = 0, lastX = null, turnFrom = 0, turning = false;

    function frame(now) {
      if (turning) {
        var p = (now - turnFrom) / 2600;
        if (p >= 1) { turning = false; target = 0; }
        else target = Math.sin((now - turnFrom) / 240) * 13 * (1 - p);
      } else if (now - lastMove > 90) target = 0;
      vel += (target - angle) * 0.075;
      vel *= 0.84;
      angle += vel;
      if (!turning && target === 0 && Math.abs(angle) < 0.02 && Math.abs(vel) < 0.02) {
        angle = 0; vel = 0; raf = 0;
        img.style.transform = 'rotate(0deg)';
        if (status && status.getAttribute('data-state') === 'spinning') { status.textContent = t('spinSettled'); status.setAttribute('data-state', 'still'); }
        return;
      }
      img.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';
      raf = window.requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = window.requestAnimationFrame(frame); }

    if (!reduce) {
      fig.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch' || turning) return;
        var now = window.performance.now();
        if (lastX !== null && now - lastMove < 120) target = clamp((e.clientX - lastX) * 0.55, -10, 10);
        lastX = e.clientX; lastMove = now;
        kick();
      });
      fig.addEventListener('pointerleave', function () { lastX = null; });
    }

    if (btn) btn.addEventListener('click', function () {
      if (reduce) { if (status) status.textContent = t('spinSettled'); return; }
      turning = true; turnFrom = window.performance.now();
      if (status) { status.textContent = t('spinSpinning'); status.setAttribute('data-state', 'spinning'); }
      kick();
    });
  }

  /* ---------- Small things ---------- */
  function smallThings() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    $$('[data-tip]').forEach(function (tip) {
      var btn = $('[data-tip-btn]', tip);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var on = !tip.classList.contains('is-open');
        tip.classList.toggle('is-open', on);
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      d.addEventListener('click', function (e) {
        if (tip.contains(e.target)) return;
        tip.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
    var tog = $('[data-lang-toggle]');
    if (tog) tog.addEventListener('click', function () { applyLang(lang === 'en' ? 'fr' : 'en'); });
  }

  /* ---------- Headings stay on two lines, the name on one where it is set on one ---------- */
  function fitHeads() {
    $$('.h, .hello__title').forEach(function (h) {
      h.style.fontSize = '';
      var cs = window.getComputedStyle(h);
      var size = parseFloat(cs.fontSize);
      var floor = size * 0.55;
      var nowrap = cs.whiteSpace === 'nowrap';
      var max = h.classList.contains('hello__title') && !nowrap ? 2 : 2;
      for (var n = 0; n < 16; n++) {
        var over;
        if (nowrap) over = h.scrollWidth > h.clientWidth + 1;
        else {
          var lh = parseFloat(window.getComputedStyle(h).lineHeight) || size;
          over = Math.round(h.getBoundingClientRect().height / lh) > max;
        }
        if (!over || size <= floor) break;
        size *= 0.95;
        h.style.fontSize = size.toFixed(2) + 'px';
      }
    });
  }

  /* ---------- Start ---------- */
  function start() {
    collectEnglish();
    applyLang(initialLang(), true);
    sheetSetup();
    pickSetup();
    applyLang(lang, true);
    roomSetup();
    smallThings();
    fitHeads();
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitHeads);

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(fitHeads, 120);
    });

    // The deal: the six colours slide in, then the first sheet's parts rise.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        root.classList.add('is-in');
        if (window.__animFailsafe) window.clearTimeout(window.__animFailsafe);
        window.setTimeout(function () { seen(sheets[open]); }, reduce ? 0 : 420);
      });
    });
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})();
