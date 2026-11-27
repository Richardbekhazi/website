/*
  Abdallah Najem site script, version 7: one scene drawn in points.
  - language switch (English in the HTML, French from i18n.js)
  - the scene: points that draw the inner ear, gather into a spine as you scroll,
    and come to rest in one level line at the end (three.js, on a canvas behind the page)
  - "Turn your head": the amber crystals tumble along a canal, then settle
  - entrances as sections arrive
  - a pointer of its own, for a mouse: a dot and a ring that trails it
  The page reads in full with this file, or the scene, missing.
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
  function applyLang(next) {
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
      if (lang === 'en') { label.textContent = 'FR'; tog.setAttribute('aria-label', 'Passer au français'); tog.setAttribute('lang', 'fr'); }
      else { label.textContent = 'EN'; tog.setAttribute('aria-label', 'Switch to English'); tog.setAttribute('lang', 'en'); }
    }
    var status = $('[data-spin-status]');
    if (status) status.textContent = '';
    try { localStorage.setItem('lang', lang); } catch (e) { /* private mode */ }
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

  /* ---------- The shapes, as clouds of points ---------- */
  var seed = 20261126;
  function rnd() { // a small repeatable generator, so the drawing is the same on every visit
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }
  function gauss() { return (rnd() + rnd() + rnd() + rnd() - 2) / 1.15; }
  function norm(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

  var EAR = 1.55; // overall size of the ear
  function canal(u, v, tc, R, tube) {
    u = norm(u); var n = norm(cross(u, v)); v = norm(cross(n, u));
    var c = [R * 0.93 * (Math.cos(tc) * u[0] + Math.sin(tc) * v[0]), R * 0.93 * (Math.cos(tc) * u[1] + Math.sin(tc) * v[1]), R * 0.93 * (Math.cos(tc) * u[2] + Math.sin(tc) * v[2])];
    return {
      from: tc + Math.PI + 0.5, to: tc + 3 * Math.PI - 0.5,
      // a point of the canal at angle a; `spread` 0..1 places it inside the tube instead of on its wall
      at: function (a, spread) {
        var r = [Math.cos(a) * u[0] + Math.sin(a) * v[0], Math.cos(a) * u[1] + Math.sin(a) * v[1], Math.cos(a) * u[2] + Math.sin(a) * v[2]];
        var b = rnd() * Math.PI * 2, rt = tube * (spread == null ? 1 : spread * rnd());
        return [
          (c[0] + R * r[0] + rt * (Math.cos(b) * r[0] + Math.sin(b) * n[0])) * EAR,
          (c[1] + R * r[1] + rt * (Math.cos(b) * r[1] + Math.sin(b) * n[1])) * EAR,
          (c[2] + R * r[2] + rt * (Math.cos(b) * r[2] + Math.sin(b) * n[2])) * EAR
        ];
      }
    };
  }
  var CANALS = [
    canal([0.707, 0, 0.707], [0, 1, 0], 1.05, 0.62, 0.062),      // anterior
    canal([-0.707, 0, 0.707], [0, 1, 0], 0.9, 0.58, 0.062),      // posterior
    canal([-0.5, 0.05, -0.866], [0.866, 0.16, -0.5], 0, 0.5, 0.058) // lateral
  ];
  var VEST = [0.03, -0.1, 0.06];

  function vestibulePoint(inside) {
    var a = rnd() * Math.PI * 2, z = rnd() * 2 - 1, s = Math.sqrt(1 - z * z), k = inside ? Math.cbrt(rnd()) * 0.7 : 1;
    return [(VEST[0] + 0.36 * k * s * Math.cos(a)) * EAR, (VEST[1] + 0.29 * k * z) * EAR, (VEST[2] + 0.31 * k * s * Math.sin(a)) * EAR];
  }

  function ear(N) {
    var out = new Float32Array(N * 3), i = 0, p;
    var ax = norm([0.55, -0.25, 0.8]), e1 = norm(cross(ax, [0, 1, 0])), e2 = cross(ax, e1);
    var base = [0.28, -0.42, 0.26];
    for (; i < N; i++) {
      var r = rnd();
      if (r < 0.2) { var c0 = CANALS[0]; p = c0.at(c0.from + rnd() * (c0.to - c0.from)); }
      else if (r < 0.4) { var c1 = CANALS[1]; p = c1.at(c1.from + rnd() * (c1.to - c1.from)); }
      else if (r < 0.58) { var c2 = CANALS[2]; p = c2.at(c2.from + rnd() * (c2.to - c2.from)); }
      else if (r < 0.7) p = vestibulePoint(false);
      else { // the cochlea: a tube that winds two and a half times and narrows
        var tt = Math.pow(rnd(), 0.8), a = tt * 2.6 * Math.PI * 2, rr = 0.5 * (1 - 0.74 * tt), h = 0.5 * tt, tube = 0.14 * (1 - 0.58 * tt), b = rnd() * Math.PI * 2;
        var cx = Math.cos(a), sx = Math.sin(a);
        var rad = [cx * e1[0] + sx * e2[0], cx * e1[1] + sx * e2[1], cx * e1[2] + sx * e2[2]];
        p = [
          (base[0] + rr * rad[0] + h * ax[0] + tube * (Math.cos(b) * rad[0] + Math.sin(b) * ax[0])) * EAR,
          (base[1] + rr * rad[1] + h * ax[1] + tube * (Math.cos(b) * rad[1] + Math.sin(b) * ax[1])) * EAR,
          (base[2] + rr * rad[2] + h * ax[2] + tube * (Math.cos(b) * rad[2] + Math.sin(b) * ax[2])) * EAR
        ];
      }
      out[i * 3] = p[0]; out[i * 3 + 1] = p[1] + 0.12; out[i * 3 + 2] = p[2];
    }
    return out;
  }

  function spine(N) {
    var out = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var k = Math.floor(rnd() * 25);           // 24 vertebrae and the sacrum
      var tt = Math.min(k, 23) / 23;
      var y = 2.05 - 3.75 * tt;
      var cx = 0.26 * Math.sin(Math.PI * 2 * (1.18 * tt + 0.08)); // the S of the back, seen from the side
      var rad = 0.13 + 0.15 * tt, hgt = 0.1 + 0.03 * tt;
      var x, yy, z, r = rnd();
      if (k === 24) { // sacrum: a wedge that narrows downward
        var s = rnd(); var w = 0.3 * (1 - 0.8 * s); var a0 = rnd() * Math.PI * 2;
        x = cx - 0.1 * s + w * Math.cos(a0) * 0.8; yy = y - 0.12 - 0.5 * s; z = w * Math.sin(a0);
      } else if (r < 0.62) { // the body: a short drum
        var a = rnd() * Math.PI * 2, edge = rnd() < 0.7 ? 1 : Math.sqrt(rnd());
        x = cx + 0.1 + rad * edge * Math.cos(a) * 0.85; z = rad * edge * Math.sin(a);
        yy = y + (edge === 1 ? (rnd() - 0.5) * hgt : (rnd() < 0.5 ? -0.5 : 0.5) * hgt);
      } else if (r < 0.85) { // the spinous process, pointing back and a little down
        var q = rnd();
        x = cx - 0.08 - q * (0.22 + 0.14 * tt); yy = y - q * 0.09 + gauss() * 0.012; z = gauss() * 0.02 * (1 - q * 0.6);
      } else { // the two side processes
        var q2 = rnd(), side = rnd() < 0.5 ? -1 : 1;
        x = cx + gauss() * 0.02; yy = y + gauss() * 0.012; z = side * (rad * 0.8 + q2 * (0.12 + 0.1 * tt));
      }
      out[i * 3] = x; out[i * 3 + 1] = yy; out[i * 3 + 2] = z;
    }
    return out;
  }

  function field(N) {
    var out = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) { out[i * 3] = (rnd() * 2 - 1) * 7; out[i * 3 + 1] = (rnd() * 2 - 1) * 3.6; out[i * 3 + 2] = -4 + rnd() * 3.4; }
    return out;
  }

  function line(N) {
    var out = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var halo = rnd() < 0.16;
      out[i * 3] = (rnd() * 2 - 1) * 5.2;
      out[i * 3 + 1] = gauss() * (halo ? 0.2 : 0.008);
      out[i * 3 + 2] = gauss() * (halo ? 0.5 : 0.04);
    }
    return out;
  }

  function ring(N) { // a circle that faces the reader, with a loose halo: it stands behind the portrait
    var out = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var a = rnd() * Math.PI * 2, halo = rnd() < 0.22;
      var r = 1.25 + gauss() * (halo ? 0.22 : 0.035);
      out[i * 3] = r * Math.cos(a); out[i * 3 + 1] = r * Math.sin(a); out[i * 3 + 2] = gauss() * (halo ? 0.3 : 0.05);
    }
    return out;
  }

  /* ---------- The scene ---------- */
  var scene = null;

  function sceneSetup() {
    var canvas = $('[data-scene]');
    var T = window.THREE;
    if (!canvas || !T) { root.classList.add('no-gl'); return; }
    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { root.classList.add('no-gl'); return; }

    var small = window.innerWidth < 800;
    var N = small ? 8000 : 15000;
    var CR = 70; // the crystals: the last points of the cloud, in amber
    var shapes = { ear: ear(N), spine: spine(N), field: field(N), line: line(N), ring: ring(N) };
    shapes.crystals = shapes.ear;

    var pos = new Float32Array(shapes.field);
    var col = new Float32Array(N * 3), size = new Float32Array(N), lag = new Float32Array(N);
    var rest = new Float32Array(CR), inVest = new Float32Array(CR * 3);
    for (var i = 0; i < N; i++) {
      var cr = i >= N - CR, w = rnd();
      col[i * 3] = cr ? 1 : 0.62 + 0.38 * w; col[i * 3 + 1] = cr ? 0.72 : 0.8 + 0.2 * w; col[i * 3 + 2] = cr ? 0.3 : 1;
      size[i] = cr ? 0.09 : 0.015 + 0.026 * rnd() * rnd();
      lag[i] = 0.028 + rnd() * 0.06;
      if (cr) {
        var j = i - (N - CR), v = vestibulePoint(true);
        inVest[j * 3] = v[0]; inVest[j * 3 + 1] = v[1] + 0.12; inVest[j * 3 + 2] = v[2];
        rest[j] = CANALS[1].from + 1.7 + gauss() * 0.14; // where they lie when out of place: low in the posterior canal
      }
    }

    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new T.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new T.BufferAttribute(size, 1));
    var mat = new T.ShaderMaterial({
      uniforms: { uScale: { value: 1 }, uAlpha: { value: 0 } },
      vertexShader: 'attribute vec3 aColor; attribute float aSize; uniform float uScale; uniform float uAlpha; varying vec3 vColor; varying float vA;' +
        'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * uScale / -mv.z, 1.2, 11.0);' +
        ' vColor = aColor; vA = uAlpha * clamp((mv.z + 10.5) / 4.5, 0.18, 1.0); }',
      fragmentShader: 'precision mediump float; varying vec3 vColor; varying float vA;' +
        'void main(){ float q = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, q); gl_FragColor = vec4(vColor, a * vA * 0.6); }',
      transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending
    });
    var points = new T.Points(geo, mat);
    points.frustumCulled = false;
    var group = new T.Group();
    group.add(points);
    var world = new T.Scene();
    world.add(group);
    var cam = new T.PerspectiveCamera(34, 1, 0.1, 50);
    cam.position.z = 7;

    var W = 0, H = 0, halfW = 1, halfH = 1;
    var quality = 1.5; // the most canvas pixels per screen pixel; lowered by itself on a device that cannot keep up
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      small = W < 800;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality));
      renderer.setSize(W, H, false);
      cam.aspect = W / H; cam.updateProjectionMatrix();
      halfH = Math.tan(34 * Math.PI / 360) * 7; halfW = halfH * cam.aspect;
      mat.uniforms.uScale.value = (H * renderer.getPixelRatio()) / (2 * Math.tan(34 * Math.PI / 360));
    }

    // What the scene should be showing: read from the section in the middle of the screen.
    var secs = $$('[data-shape]');
    var cur = { shape: 'ear', x: 0, y: 0, scale: 1, alpha: 1 };
    function pick() {
      var mid = window.innerHeight * 0.5, best = secs[0], bestD = 1e9;
      secs.forEach(function (s) {
        var r = s.getBoundingClientRect();
        var dd = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (dd < bestD) { bestD = dd; best = s; }
      });
      var shape = best.getAttribute('data-shape');
      var wide = !small;
      cur.shape = shape;
      cur.alpha = parseFloat(best.getAttribute('data-alpha'));
      cur.scale = parseFloat(best.getAttribute('data-scale')) * (wide ? 1 : (shape === 'spine' ? 0.6 : shape === 'line' ? 1 : 0.62));
      cur.x = wide ? parseFloat(best.getAttribute('data-x')) * halfW : 0;
      cur.y = wide ? parseFloat(best.getAttribute('data-y')) * halfH : (shape === 'field' || shape === 'line' ? 0 : halfH * (shape === 'spine' ? 0.3 : 0.44));
      if (!wide && shape === 'field') cur.alpha *= 0.7;
      // a shape that stands behind something on the page follows it
      var follow = best.getAttribute('data-follow'), el = follow ? $(follow, best) : null;
      if (el) {
        var fr = el.getBoundingClientRect();
        cur.x = ((fr.left + fr.width / 2) / W * 2 - 1) * halfW;
        cur.y = -((fr.top + fr.height * 0.4) / H * 2 - 1) * halfH;
        cur.scale = (fr.width / W * 2 * halfW) / 2.5 * 0.96;
      }
    }

    var gx = 0, gy = 0, gs = 0.6, rotY = 0.6, rotX = 0, rotZ = 0, alpha = 0, ringSpin = 0;
    var shown = '', morphUntil = 0;   // the points are only moved while a shape is forming
    var slow = 0, counted = 0;
    var mx = 0, my = 0, last = 0, running = false, visible = true;
    var turnFrom = -1, shift = 0;

    function targetOf(i, shape) {
      if (i >= N - CR && (shape === 'ear' || shape === 'crystals')) {
        var j = i - (N - CR);
        if (shape === 'ear') return [inVest[j * 3], inVest[j * 3 + 1], inVest[j * 3 + 2]];
        seed = 977 + j * 131 + Math.floor(shift * 40); // steady jitter, so they do not flicker
        var p = CANALS[1].at(rest[j] + shift * (0.75 + (j % 7) * 0.07), 0.8);
        return [p[0], p[1] + 0.12, p[2]];
      }
      return null;
    }

    function step(now, snap) {
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      var f = dt * 60;
      var tgt = shapes[cur.shape];

      // the head turn: the ear swings, the crystals run along the canal and come back to rest
      if (turnFrom >= 0) {
        var p = (now - turnFrom) / 3000;
        if (p >= 1) { turnFrom = -1; shift = 0; settle(); }
        else { shift = 1.9 * Math.sin(p * Math.PI) * (1 - 0.12 * Math.sin(p * Math.PI * 6)); }
      }

      if (cur.shape !== shown) { shown = cur.shape; morphUntil = now + 6000; }
      var forming = snap || now < morphUntil || turnFrom >= 0;
      if (turnFrom >= 0) morphUntil = now + 2500;
      for (var i = forming ? 0 : N; i < N; i++) {
        var k = snap ? 1 : 1 - Math.pow(1 - lag[i], f), a = i * 3;
        var c = i >= N - CR ? targetOf(i, cur.shape) : null;
        var tx = c ? c[0] : tgt[a], ty = c ? c[1] : tgt[a + 1], tz = c ? c[2] : tgt[a + 2];
        if (c && turnFrom >= 0) k = snap ? 1 : 1 - Math.pow(0.7, f);
        pos[a] += (tx - pos[a]) * k; pos[a + 1] += (ty - pos[a + 1]) * k; pos[a + 2] += (tz - pos[a + 2]) * k;
      }
      if (forming) geo.attributes.position.needsUpdate = true;

      var e = snap ? 1 : 1 - Math.pow(0.94, f);
      gx += (cur.x - gx) * e; gy += (cur.y - gy) * e; gs += (cur.scale - gs) * e; alpha += (cur.alpha - alpha) * e;
      var spinning = cur.shape === 'ear' || cur.shape === 'crystals';
      var flat = cur.shape === 'line' || cur.shape === 'ring';
      if (cur.shape === 'ring' && !reduce) ringSpin += dt * 0.07;
      if (flat) { var home = Math.round(rotY / (Math.PI * 2)) * Math.PI * 2; rotY += (home - rotY) * e; }
      else if (cur.shape === 'spine') { var sway = Math.round(rotY / (Math.PI * 2)) * Math.PI * 2 + 0.55 * Math.sin(now / 2600); rotY += (sway - rotY) * e * 0.6; }
      else if (!reduce) rotY += dt * (spinning ? 0.22 : 0.02);
      var wantZ = turnFrom >= 0 ? 0.55 * Math.sin(((now - turnFrom) / 3000) * Math.PI * 2) * (1 - (now - turnFrom) / 3000) : 0;
      rotZ += (wantZ - rotZ) * (snap ? 1 : 1 - Math.pow(0.85, f));
      rotX += ((flat ? 0 : my * 0.18 + (spinning ? 0.18 : 0)) - rotX) * e;
      group.position.set(gx, gy, 0);
      group.scale.setScalar(gs);
      group.rotation.set(rotX, rotY + (flat ? 0 : mx * 0.3), rotZ + (cur.shape === 'ring' ? ringSpin : 0));
      mat.uniforms.uAlpha.value = alpha;
      renderer.render(world, cam);
    }

    function loop(now) {
      if (!running) return;
      // a device that cannot keep up gets a lighter canvas, in two steps
      var real = now - last;
      if (real < 250) { counted++; if (real > 40) slow++; }
      if (counted >= 90) {
        if (slow > 45 && quality > 0.75) { quality = quality > 1 ? 1 : 0.75; resize(); }
        counted = 0; slow = 0;
      }
      step(now, false);
      window.requestAnimationFrame(loop);
    }
    function start() { if (running || reduce || !visible) return; running = true; last = window.performance.now(); window.requestAnimationFrame(loop); }
    function stop() { running = false; }
    function still() { pick(); step(window.performance.now(), true); } // with reduced motion: one settled picture per section

    var status = $('[data-spin-status]');
    function settle() { if (status && status.getAttribute('data-state') === 'spinning') { status.textContent = t('spinSettled'); status.setAttribute('data-state', 'still'); } }
    var btn = $('[data-spin-btn]');
    if (btn) btn.addEventListener('click', function () {
      if (reduce) { if (status) status.textContent = t('spinSettled'); return; }
      turnFrom = window.performance.now();
      if (status) { status.textContent = t('spinSpinning'); status.setAttribute('data-state', 'spinning'); }
    });

    resize(); pick();
    window.addEventListener('resize', function () { resize(); pick(); if (reduce) still(); });
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      window.requestAnimationFrame(function () { ticking = false; pick(); if (reduce) still(); });
    }, { passive: true });
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      mx = (e.clientX / W) * 2 - 1; my = (e.clientY / H) * 2 - 1;
    }, { passive: true });
    d.addEventListener('visibilitychange', function () { visible = !d.hidden; if (visible) start(); else stop(); });

    if (reduce) still(); else start();
    scene = {
      state: function () { return { shape: cur.shape, alpha: +alpha.toFixed(2), x: +gx.toFixed(2), points: N, running: running, quality: quality }; },
      // how long one frame of the scene's own work takes, in milliseconds
      bench: function (n) { var gl = renderer.getContext(), t0 = window.performance.now(); for (var q = 0; q < n; q++) step(window.performance.now(), false); gl.finish(); return +((window.performance.now() - t0) / n).toFixed(2); }
    };
    window.__scene = scene;
  }

  /* ---------- The pointer ---------- */
  function cursorSetup() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var dot = d.createElement('div'), halo = d.createElement('div');
    dot.className = 'cur cur--dot'; halo.className = 'cur cur--ring';
    dot.setAttribute('aria-hidden', 'true'); halo.setAttribute('aria-hidden', 'true');
    d.body.appendChild(halo); d.body.appendChild(dot);
    var x = 0, y = 0, hx = 0, hy = 0, raf = 0, seen = false, on = false, last = 0;

    function show(yes) { dot.classList.toggle('is-shown', yes); halo.classList.toggle('is-shown', yes); }
    function frame(now) {
      var k = reduce ? 1 : 1 - Math.pow(0.8, Math.min(4, (now - last) / 16.7)); last = now;
      hx += (x - hx) * k; hy += (y - hy) * k;
      halo.style.transform = 'translate3d(' + hx.toFixed(1) + 'px,' + hy.toFixed(1) + 'px,0)';
      raf = Math.abs(x - hx) + Math.abs(y - hy) > 0.15 ? window.requestAnimationFrame(frame) : 0;
    }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      if (!seen) { seen = true; hx = x; hy = y; root.classList.add('has-cursor'); show(true); }
      var hit = !!(e.target.closest && e.target.closest('a, button, summary, .pic, .svcs li, .steps li, .langs__list li'));
      if (hit !== on) { on = hit; dot.classList.toggle('is-on', on); halo.classList.toggle('is-on', on); }
      if (!raf) { last = window.performance.now(); raf = window.requestAnimationFrame(frame); }
    }, { passive: true });
    d.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') halo.classList.add('is-down'); });
    d.addEventListener('pointerup', function () { halo.classList.remove('is-down'); });
    root.addEventListener('mouseleave', function () { if (seen) show(false); });
    root.addEventListener('mouseenter', function () { if (seen) show(true); });
  }

  /* ---------- Entrances, the bar, small things ---------- */
  function entrances() {
    var items = $$('[data-in]');
    $$('main > section').forEach(function (s) { $$('[data-in]', s).forEach(function (el, n) { el.style.setProperty('--d', Math.min(n, 7)); }); });
    if (!root.classList.contains('anim') || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  function smallThings() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    var bar = $('[data-bar]');
    function solid() { if (bar) bar.classList.toggle('is-solid', window.pageYOffset > window.innerHeight * 0.6); }
    window.addEventListener('scroll', solid, { passive: true }); solid();
    var tog = $('[data-lang-toggle]');
    if (tog) tog.addEventListener('click', function () { applyLang(lang === 'en' ? 'fr' : 'en'); });
    // One question open at a time keeps the list short.
    var all = $$('.faq details');
    all.forEach(function (det) { det.addEventListener('toggle', function () { if (det.open) all.forEach(function (o) { if (o !== det) o.open = false; }); }); });
  }

  function start() {
    collectEnglish();
    applyLang(initialLang());
    smallThings();
    cursorSetup();
    entrances();
    if (window.__animFailsafe) window.clearTimeout(window.__animFailsafe);
    try { sceneSetup(); } catch (e) { root.classList.add('no-gl'); if (window.console) window.console.error(e); }
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})();
