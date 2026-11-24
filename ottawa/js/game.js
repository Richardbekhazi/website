// Street Test - game.js: input, collisions, knock-overs, minimap, main loop, HUD, debug hook.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

// ---------- input ----------
const keys = {};
if (window.Interior) Interior.init({ THREE, scene, camera, state, keys, walker, homeInfo, heightAt });   // INTERIOR hook
addEventListener('keydown', e => {
  if (typeof bigMap !== 'undefined') {   // big map (R51): M opens / closes it; while open, the game ignores keys
    if (e.code === 'KeyM') { bigMap.toggle(); return; }
    if (bigMap.open) { if (e.code === 'Escape') bigMap.hide(); e.preventDefault(); return; }
  }
  keys[e.code] = true;
  if (e.code === 'KeyC') state.cam = (state.cam + 1) % 3;
  if (e.code === 'KeyR') resetToHome();
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !(window.Interior && Interior.active)) toggleOnFoot();   // Enter: get in / out of the car
  if (e.code === 'KeyQ' && state.mode === 'walk' && !(window.Interior && Interior.active)) callCar();             // Q: call the car to you
  if (e.code === 'KeyP') setCarColor((car.userData.colorIdx + 1) % CAR_COLORS.length);
  if (e.code === 'KeyH' && T) { // cycle hill size: real -> 3x -> 6x (rebuilds the world)
    const next = { 1: 3, 3: 6, 6: 1 }[HILLS] || 3; params.set('hills', next); location.search = params.toString();
  }
  if (e.code === 'KeyE' && !(window.Interior && Interior.onKeyE())) toggleOnFoot();   // INTERIOR hook: E at the home door
  if (e.code === 'KeyI') jumpIntoHome();
  if (e.code === 'Slash') document.getElementById('help').classList.toggle('open');   // ?: show / hide the controls list
  if (e.code === 'KeyN') toggleRoadNames();                                           // N: street names painted on the road                                              // I: test shortcut, straight inside the house
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
// call the car: it appears on the nearest road beside you, in the right-hand lane, facing the way you look
function callCar() {
  const W = state.walk; let best = null;
  for (const sg of roadSegs) {
    if (sg.t === 'track') continue;
    const dx = sg.x2 - sg.x1, dz = sg.z2 - sg.z1, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((W.x - sg.x1) * dx + (W.z - sg.z1) * dz) / L2));
    const px = sg.x1 + t * dx, pz = sg.z1 + t * dz, d = Math.hypot(W.x - px, W.z - pz);
    if (!best || d < best.d) best = { d, px, pz, dx, dz, w: sg.w };
  }
  let x = W.x + 3, z = W.z, heading = W.heading;
  if (best && best.d < 120) {
    const L = Math.hypot(best.dx, best.dz) || 1; let ux = best.dx / L, uz = best.dz / L;
    const fx = -Math.sin(W.heading), fz = -Math.cos(W.heading);
    if (ux * fx + uz * fz < 0) { ux = -ux; uz = -uz; }
    heading = Math.atan2(-ux, -uz);
    const rx = -uz, rz = ux, lane = Math.max(1.5, best.w / 4);   // right of the travel direction
    x = best.px + rx * lane; z = best.pz + rz * lane;
  }
  Object.assign(state, { x, z, heading, speed: 0, steer: 0 });
  car.position.set(x, heightAt(x, z) + 0.1, z); car.rotation.set(0, heading, 0);
  crashEl.textContent = 'Car is here'; crashEl.classList.add('show'); crashTimer = 1.2;
  setTimeout(() => { crashEl.textContent = 'CRASH!'; }, 1300);
}
// testing shortcut (I key or the HUD button): from anywhere, stop the car, get out and walk in through the front door
function jumpIntoHome() {
  const IN = window.Interior;
  if (!IN || !IN.ready || IN.active || !IN.debug) return;
  if (state.mode === 'car') { state.speed = 0; state.steer = 0; toggleOnFoot(); }
  const d = IN.debug.doorOutside();
  Object.assign(state.walk, { x: d.x, z: d.z }); walker.position.set(d.x, heightAt(d.x, d.z), d.z);
  IN.debug.enter();
}
document.getElementById('help').addEventListener('click', e => e.currentTarget.classList.toggle('open'));
document.getElementById('homeBtn')?.addEventListener('click', e => { e.currentTarget.blur(); jumpIntoHome(); });   // (no button in the public copy)
function toggleOnFoot() {
  if (state.mode === 'car') {
    if (Math.abs(state.speed) > 3) return;
    const side = state.heading + Math.PI / 2;
    Object.assign(state.walk, { x: state.x - Math.sin(side) * 1.8, z: state.z - Math.cos(side) * 1.8, heading: state.heading });
    state.mode = 'walk'; state.speed = 0; walker.visible = true;
  } else if (Math.hypot(state.walk.x - state.x, state.walk.z - state.z) < 4.5) {
    state.mode = 'car'; walker.visible = false;
  }
}

// ---------- collisions ----------
const crashEl = document.getElementById('crash');
let crashTimer = 0;
const debris = [];
function spawnDebris(x, z, n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.15 + Math.random() * 0.25, 0.08, 0.15 + Math.random() * 0.25),
      new THREE.MeshLambertMaterial({ color: Math.random() < 0.5 ? car.userData.paint.color.getHex() : 0xbfe3ff }));
    m.position.set(x, heightAt(x, z) + 0.8, z); m.castShadow = true; scene.add(m);
    debris.push({ m, vx: (Math.random() - 0.5) * 8, vy: 3 + Math.random() * 4, vz: (Math.random() - 0.5) * 8, life: 4 });
  }
}
// ---------- knocked-over props ----------
const falling = [];
function knockOver(it, vel) {
  it.down = true;
  const sp = Math.hypot(vel.x, vel.z), dir = new THREE.Vector3(vel.x / sp, 0, vel.z / sp);
  const axis = new THREE.Vector3().crossVectors(UP, dir).normalize();   // tips away from the car
  falling.push({ it, axis, t: 0, dur: Math.max(0.5, 1.4 - sp / 25), max: Math.PI / 2 * 0.97 });
}
function updateFalling(dt) {
  const R = new THREE.Matrix4(), T1 = new THREE.Matrix4(), T2 = new THREE.Matrix4(), M = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let k = falling.length - 1; k >= 0; k--) {
    const f = falling[k]; f.t = Math.min(f.dur, f.t + dt);
    const e = f.t / f.dur, ang = f.max * e * e;   // speeds up as it falls, like gravity
    const fl = f.it.fall;
    if (fl.obj) { q.setFromAxisAngle(f.axis, ang); fl.obj.quaternion.copy(q).multiply(fl.q0); }
    else {
      R.makeRotationAxis(f.axis, ang); T1.makeTranslation(-fl.base.x, -fl.base.y, -fl.base.z); T2.makeTranslation(fl.base.x, fl.base.y, fl.base.z);
      for (const [im, idx, m0] of fl.parts) { M.copy(T2).multiply(R).multiply(T1).multiply(m0); im.setMatrixAt(idx, M); im.instanceMatrix.needsUpdate = true; }
    }
    if (f.t >= f.dur) falling.splice(k, 1);
  }
}
// push a circle out of walls/trees; returns impact speed into the obstacle
function collide(obj, r, vel) {
  let impact = 0;
  for (let iter = 0; iter < 3; iter++) {
    let hit = false;
    for (const it of gridNear(obj.x, obj.z)) {
      let cx, cz, rr = r;
      if (it.kind === 'wall') {
        const dx = it.x2-it.x1, dz = it.z2-it.z1, L2 = dx*dx + dz*dz || 1;
        const t = Math.max(0, Math.min(1, ((obj.x-it.x1)*dx + (obj.z-it.z1)*dz) / L2));
        cx = it.x1 + t*dx; cz = it.z1 + t*dz;
      } else if (it.kind === 'tree') {
        if (it.down) continue;
        cx = it.x; cz = it.z; rr = r + it.r;
        // trees, poles, signs, mailboxes: hit them with the car and they go down (no crash), GTA-style
        if (vel && it.fall && Math.hypot(obj.x - cx, obj.z - cz) < rr && Math.hypot(vel.x, vel.z) > 1.5) { knockOver(it, vel); vel.x *= 0.85; vel.z *= 0.85; continue; }
      }
      else continue;
      const ox = obj.x - cx, oz = obj.z - cz, d = Math.hypot(ox, oz);
      if (d < rr && d > 1e-6) {
        const nx = ox / d, nz = oz / d;
        obj.x += nx * (rr - d); obj.z += nz * (rr - d);
        if (vel) { const vn = vel.x * nx + vel.z * nz; if (vn < 0) { impact = Math.max(impact, -vn); vel.x -= 1.5 * vn * nx; vel.z -= 1.5 * vn * nz; } }
        hit = true;
      }
    }
    if (!hit) break;
  }
  return impact;
}

// ---------- minimap ----------
const mini = document.getElementById('minimap'), mctx = mini.getContext('2d');
const MAPS = Math.min(1.2, 4000 / Math.max(1, maxX - minX + 200, maxZ - minZ + 200)); // px per metre (image kept under ~4000 px)
const mapCanvas = document.createElement('canvas');
mapCanvas.width = Math.ceil((maxX - minX) * MAPS) + 200; mapCanvas.height = Math.ceil((maxZ - minZ) * MAPS) + 200;
{
  const c = mapCanvas.getContext('2d'), ox = -minX * MAPS + 100, oz = -minZ * MAPS + 100;
  c.fillStyle = '#86a55c'; c.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const r of M.roads) {
    c.strokeStyle = r.w < 3 ? '#d8d2c4' : '#3c3f43'; c.lineWidth = Math.max(1, r.w * MAPS);
    c.beginPath(); r.p.forEach((p, i) => i ? c.lineTo(p[0]*MAPS+ox, p[1]*MAPS+oz) : c.moveTo(p[0]*MAPS+ox, p[1]*MAPS+oz)); c.stroke();
  }
  for (const b of M.buildings) {
    c.fillStyle = b.home && !M.public ? '#ffc94d' : '#cfc6b4';
    c.beginPath(); b.p.forEach((p, i) => i ? c.lineTo(p[0]*MAPS+ox, p[1]*MAPS+oz) : c.moveTo(p[0]*MAPS+ox, p[1]*MAPS+oz)); c.fill();
  }
  if (M.route) {   // the drive to Bergeron Private: blue route line + destination dot
    c.strokeStyle = 'rgba(40,140,255,0.9)'; c.lineWidth = Math.max(3, 6 * MAPS * 2);
    c.beginPath(); M.route.p.forEach((p, i) => i ? c.lineTo(p[0]*MAPS+ox, p[1]*MAPS+oz) : c.moveTo(p[0]*MAPS+ox, p[1]*MAPS+oz)); c.stroke();
  }
  mapCanvas.ox = ox; mapCanvas.oz = oz;
}
function drawMini(px, pz, heading) {
  const W = mini.width, H = mini.height;
  mctx.save(); mctx.clearRect(0, 0, W, H);
  mctx.drawImage(mapCanvas, px * MAPS + mapCanvas.ox - W / 2, pz * MAPS + mapCanvas.oz - H / 2, W, H, 0, 0, W, H);
  if (!M.public) {   // home dot (not in the public copy, R56)
    const hx = (homeInfo.x - px) * MAPS + W / 2, hz = (homeInfo.z - pz) * MAPS + H / 2;
    mctx.fillStyle = '#ffc94d'; mctx.strokeStyle = '#2a1c00'; mctx.lineWidth = 1.5;
    mctx.beginPath(); mctx.arc(Math.max(6, Math.min(W-6, hx)), Math.max(6, Math.min(H-6, hz)), 5, 0, 7); mctx.fill(); mctx.stroke();
  }
  if (M.route) {   // destination dot, pinned to the minimap edge when it is off the map
    const dx = (M.route.dest[0] - px) * MAPS + W / 2, dz = (M.route.dest[1] - pz) * MAPS + H / 2;
    mctx.fillStyle = '#2f8cff'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(Math.max(6, Math.min(W-6, dx)), Math.max(6, Math.min(H-6, dz)), 5, 0, 7); mctx.fill(); mctx.stroke();
  }
  mctx.translate(W / 2, H / 2); mctx.rotate(-heading);
  mctx.fillStyle = '#ff3b30'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2;
  mctx.beginPath(); mctx.moveTo(0, -8); mctx.lineTo(6, 6); mctx.lineTo(0, 3); mctx.lineTo(-6, 6); mctx.closePath(); mctx.fill(); mctx.stroke();
  mctx.restore();
}

// ---------- big map (R51): click the minimap or press M; drag to move, wheel to zoom, click a spot to go there ----------
const bigMap = (() => {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,20,0.82);display:none;z-index:20;cursor:crosshair;user-select:none';
  const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:50%;top:14px;transform:translateX(-50%);color:#f2f4f7;background:rgba(15,20,28,0.85);' +
    'border-radius:10px;padding:8px 14px;font:13px system-ui,Segoe UI,sans-serif;pointer-events:none;text-align:center';
  bar.innerHTML = '<b style="color:#ffc94d">Click</b> a spot to go there · <b style="color:#ffc94d">Drag</b> to move · ' +
    '<b style="color:#ffc94d">Wheel</b> to zoom · <b style="color:#ffc94d">M</b> or <b style="color:#ffc94d">Esc</b> to close<div id="bigMapHover" style="opacity:.85;min-height:1.4em"></div>';
  const close = document.createElement('button'); close.textContent = '✕';
  close.style.cssText = 'position:absolute;right:16px;top:14px;font:700 18px system-ui;color:#f2f4f7;background:rgba(15,20,28,0.85);' +
    'border:1px solid rgba(255,255,255,0.3);border-radius:8px;width:38px;height:38px;cursor:pointer';
  wrap.append(cv, bar, close); document.body.appendChild(wrap);
  const ctx = cv.getContext('2d'), hoverEl = bar.querySelector('#bigMapHover');
  let open = false, cx = 0, cz = 0, zoom = 1, drag = null, hover = null;   // cx/cz: world point at the screen centre; zoom: screen px per metre
  const toWorld = (sx, sy) => [cx + (sx - cv.width / 2) / zoom, cz + (sy - cv.height / 2) / zoom];
  const toScreen = (x, z) => [(x - cx) * zoom + cv.width / 2, (z - cz) * zoom + cv.height / 2];
  // nearest drivable road to a world point (only public streets, not footpaths)
  function nearestRoad(x, z) {
    let best = null;
    for (const sg of roadSegs) {
      if (!CAR_ROADS.has(sg.t) || sg.t === 'track') continue;
      const dx = sg.x2 - sg.x1, dz = sg.z2 - sg.z1, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - sg.x1) * dx + (z - sg.z1) * dz) / L2));
      const px = sg.x1 + t * dx, pz = sg.z1 + t * dz, d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) best = { d, px, pz, dx, dz, w: sg.w, n: sg.n };
    }
    return best;
  }
  function draw() {
    if (!open) return;
    const W = cv.width = innerWidth, H = cv.height = innerHeight;
    ctx.imageSmoothingEnabled = true; ctx.clearRect(0, 0, W, H);
    const [sx, sy] = toScreen(minX - 100 / MAPS, minZ - 100 / MAPS), k = zoom / MAPS;
    ctx.drawImage(mapCanvas, sx, sy, mapCanvas.width * k, mapCanvas.height * k);
    const dot = (x, z, fill, stroke, r) => { const [a, b] = toScreen(x, z); ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); ctx.stroke(); return [a, b]; };
    const label = (t, a, b, bg, fg) => { ctx.font = '600 13px system-ui,Segoe UI,sans-serif'; const w = ctx.measureText(t).width + 12;
      ctx.fillStyle = bg; ctx.fillRect(a - w / 2, b - 30, w, 20); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.fillText(t, a, b - 16); };
    let p; if (!M.public) { p = dot(homeInfo.x, homeInfo.z, '#ffc94d', '#2a1c00', 7); label('HOME', p[0], p[1], '#ffc94d', '#2a1c00'); }   // public copy (R56): no home marker
    if (M.route) { p = dot(M.route.dest[0], M.route.dest[1], '#2f8cff', '#fff', 7); label('Bergeron Pvt', p[0], p[1], '#2f8cff', '#fff'); }
    // you
    const f = state.mode === 'car' ? { x: state.x, z: state.z, h: state.heading } : { x: state.walk.x, z: state.walk.z, h: state.walk.heading };
    const [ya, yb] = toScreen(f.x, f.z);
    ctx.save(); ctx.translate(ya, yb); ctx.rotate(-f.h); ctx.fillStyle = '#ff3b30'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 8); ctx.lineTo(0, 4); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    // where a click would put you
    if (hover) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; const [a, b] = toScreen(hover.px, hover.pz);
      ctx.beginPath(); ctx.arc(a, b, 9, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(a - 14, b); ctx.lineTo(a + 14, b); ctx.moveTo(a, b - 14); ctx.lineTo(a, b + 14); ctx.stroke(); }
  }
  function show() {
    if (window.Interior && Interior.active) return;   // not from inside the house
    open = true; wrap.style.display = 'block';
    for (const k in keys) keys[k] = false;
    cx = state.mode === 'car' ? state.x : state.walk.x; cz = state.mode === 'car' ? state.z : state.walk.z;
    zoom = Math.min(innerWidth, innerHeight) / 1400;   // about 1.4 km across to start
    draw();
  }
  function hide() { open = false; wrap.style.display = 'none'; hover = null; hoverEl.textContent = ''; }
  // put the car on that road, right-hand lane, facing along the street, and snap the camera there
  function goTo(r) {
    const L = Math.hypot(r.dx, r.dz) || 1, ux = r.dx / L, uz = r.dz / L, rx = -uz, rz = ux, lane = Math.max(1.5, r.w / 4);
    const x = r.px + rx * lane, z = r.pz + rz * lane, heading = Math.atan2(-ux, -uz);
    Object.assign(state, { x, z, heading, speed: 0, steer: 0, mode: 'car' }); walker.visible = false;
    car.position.set(x, heightAt(x, z) + 0.1, z); car.rotation.set(0, heading, 0);
    camera.position.set(x + Math.sin(heading) * 9.5, heightAt(x, z) + 3.8, z + Math.cos(heading) * 9.5);
    cullT = 0;   // show nearby props straight away
    updateChunks(x, z, Infinity, 350); chunkScanT = 0;   // build the squares around the new spot before showing it
    hide();
  }
  mini.style.cursor = 'pointer'; document.getElementById('mapbox').style.pointerEvents = 'auto';
  mini.title = 'Open the big map (M)';
  mini.addEventListener('click', show);
  close.addEventListener('click', e => { e.stopPropagation(); hide(); });
  cv.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, cx, cz, moved: false }; });
  addEventListener('mouseup', e => {
    if (!open || !drag) return;
    const d = drag; drag = null;
    if (!d.moved && e.target === cv) { const [x, z] = toWorld(e.clientX, e.clientY), r = nearestRoad(x, z); if (r && r.d < 150) goTo(r); }
  });
  cv.addEventListener('mousemove', e => {
    if (drag) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
      if (drag.moved) { cx = drag.cx - (e.clientX - drag.x) / zoom; cz = drag.cz - (e.clientY - drag.y) / zoom; hover = null; draw(); return; }
    }
    const [x, z] = toWorld(e.clientX, e.clientY), r = nearestRoad(x, z);
    hover = r && r.d < 150 ? r : null;
    hoverEl.textContent = hover ? 'Go to: ' + (hover.n || 'unnamed road') : 'No road near here';
    draw();
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const [x, z] = toWorld(e.clientX, e.clientY), f = e.deltaY < 0 ? 1.25 : 0.8;
    zoom = Math.max(0.08, Math.min(6, zoom * f));
    cx = x - (e.clientX - cv.width / 2) / zoom; cz = z - (e.clientY - cv.height / 2) / zoom;   // keep the point under the mouse
    draw();
  }, { passive: false });
  addEventListener('resize', draw);
  return { show, hide, toggle: () => (open ? hide() : show()), get open() { return open; }, goTo, nearestRoad, toWorld };
})();

// ---------- loop ----------
const destEl = document.getElementById('dest');
const speedEl = document.getElementById('speed'), modeEl = document.getElementById('mode'), streetEl = document.getElementById('street');
const CAM_NAMES = ['Chase camera', 'Driver view', 'Top-down'];
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let last = performance.now(), streetTimer = 0;
function streetAt(x, z) {
  let best = null, bd = 18;
  for (const it of gridNear(x, z)) {
    if (it.kind !== 'road' || !it.seg.n) continue; const s = it.seg;
    const dx = s.x2-s.x1, dz = s.z2-s.z1, L2 = dx*dx + dz*dz || 1;
    const t = Math.max(0, Math.min(1, ((x-s.x1)*dx + (z-s.z1)*dz) / L2));
    const d = Math.hypot(x - (s.x1 + t*dx), z - (s.z1 + t*dz)); if (d < bd) { bd = d; best = s.n; }
  }
  return best;
}

// where am I (R55): the street sign shows the street, or off the street the named park / plaza you are in; under it the
// neighbourhood and suburb from OpenStreetMap outlines ("Avalon · Orléans")
const areaEl = document.getElementById('area');
const bboxOf = rs => { let a = [Infinity, Infinity, -Infinity, -Infinity]; for (const r of rs) for (const [x, z] of r) a = [Math.min(a[0], x), Math.min(a[1], z), Math.max(a[2], x), Math.max(a[3], z)]; return a; };
const NAMED_AREAS = M.areas.filter(a => a.n).map(a => { const r = ring(a.p), b = bboxOf([r]); return { n: a.n, t: a.t, r, b, size: (b[2] - b[0]) * (b[3] - b[1]) }; });
const PLACES = (M.places || []).map(p => ({ ...p, b: bboxOf(p.r) }));
const PARKISH = new Set(['park', 'play', 'pitch', 'wood', 'ice', 'grass', 'dirt']);
const inRings = (x, z, p) => x >= p.b[0] && x <= p.b[2] && z >= p.b[1] && z <= p.b[3] && p.r.some(r => pointInPoly(x, z, r));
function showWhere(x, z) {
  const street = streetAt(x, z);
  let place = null;
  if (!street) for (const a of NAMED_AREAS) if (x >= a.b[0] && x <= a.b[2] && z >= a.b[1] && z <= a.b[3] && pointInPoly(x, z, a.r) && (!place || a.size < place.size)) place = a;
  const text = street || (place && place.n.replace(/^Splash Pad - /, 'Splash pad · '));
  streetEl.style.display = text ? '' : 'none';
  if (text && streetEl.textContent !== text) streetEl.textContent = text;
  streetEl.className = 'hud' + (street || !place ? '' : PARKISH.has(place.t) ? ' park' : ' plaza');
  areaEl.style.top = text ? '' : '16px';
  const hood = PLACES.find(p => p.k === 'neighbourhood' && inRings(x, z, p)), sub = PLACES.find(p => (p.k === 'suburb' || p.k === 'quarter') && inRings(x, z, p));
  const ward = !hood && PLACES.find(p => p.k === 'ward' && inRings(x, z, p));
  const line = [hood ? hood.n : ward ? ward.n : null, sub && (!hood || hood.n.indexOf(sub.n) < 0) ? sub.n : null].filter(Boolean).join(' · ');
  if (areaEl.textContent !== line) areaEl.textContent = line;
}

function frame(now, manual) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = Math.max(last, now);
  const fwd = keys.KeyW || keys.ArrowUp, back = keys.KeyS || keys.ArrowDown;
  const left = keys.KeyA || keys.ArrowLeft, right = keys.KeyD || keys.ArrowRight;

  if (state.mode === 'car') {
    // arcade driving
    const MAX = 27, REV = 7;
    if (fwd) state.speed += (state.speed < 0 ? 18 : 9) * dt;
    else if (back) state.speed -= (state.speed > 0 ? 18 : 6) * dt;
    else state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), 3 * dt);
    if (keys.Space) state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), 25 * dt);
    state.speed = Math.max(-REV, Math.min(MAX, state.speed));
    const target = (left ? 1 : 0) - (right ? 1 : 0);
    state.steer += (target - state.steer) * Math.min(1, dt * 6);
    const grip = 1 / (1 + Math.abs(state.speed) / 18);
    state.heading += state.steer * state.speed * 0.09 * grip * dt * (Math.abs(state.speed) > 0.2 ? 1 : 0);
    const vel = { x: -Math.sin(state.heading) * state.speed, z: -Math.cos(state.heading) * state.speed };
    const steps = Math.ceil(Math.abs(state.speed) * dt / 0.4) || 1;
    let impact = 0;
    for (let i = 0; i < steps; i++) {
      state.x += vel.x * dt / steps; state.z += vel.z * dt / steps;
      // car body ~ two circles (front and rear)
      for (const off of [1.3, -1.3]) {
        const c = { x: state.x - Math.sin(state.heading) * off, z: state.z - Math.cos(state.heading) * off };
        const ix = collide(c, 1.05, vel); impact = Math.max(impact, ix);
        state.x += c.x - (state.x - Math.sin(state.heading) * off); state.z += c.z - (state.z - Math.cos(state.heading) * off);
      }
    }
    if (impact > 0.5) {
      const newSpeed = -(vel.x * Math.sin(state.heading) + vel.z * Math.cos(state.heading));
      state.speed = newSpeed * 0.45;
      if (impact > 6) {
        state.crashes++; state.shake = Math.min(1.2, impact / 15); state.tilt = Math.min(0.35, impact / 60) * (Math.random() < 0.5 ? -1 : 1);
        crashEl.classList.add('show'); crashTimer = 0.9; spawnDebris(state.x - Math.sin(state.heading) * 2, state.z - Math.cos(state.heading) * 2, Math.min(18, Math.floor(impact)));
        const dmg = Math.min(1, state.crashes / 8); car.userData.paint.color.setHex(CAR_COLORS[car.userData.colorIdx].hex).lerp(new THREE.Color(0x3a3530), dmg * 0.6);
      }
    }
    // follow the ground: height under the car, nose up/down on slopes, lean on side slopes
    const sh = Math.sin(state.heading), ch = Math.cos(state.heading);
    const hF = heightAt(state.x - sh * 1.4, state.z - ch * 1.4), hB = heightAt(state.x + sh * 1.4, state.z + ch * 1.4);
    const hL = heightAt(state.x - ch * 0.9, state.z + sh * 0.9), hR = heightAt(state.x + ch * 0.9, state.z - sh * 0.9);
    const pitch = Math.atan2(hF - hB, 2.8), roll = Math.atan2(hR - hL, 1.8);
    state.speed -= 9.8 * Math.sin(pitch) * dt * 0.6;   // rolls downhill, slows uphill
    car.position.set(state.x, (hF + hB + hL + hR) / 4 + 0.1, state.z);   // tyres sit on the road surface
    car.rotation.order = 'YXZ'; car.rotation.set(pitch, state.heading, roll);
    state.tilt *= Math.pow(0.02, dt);
    car.userData.body.rotation.z = state.tilt + state.steer * Math.min(1, Math.abs(state.speed) / 25) * 0.04;
    for (const w of car.userData.wheels) w.rotation.x -= state.speed * dt / 0.36;
    car.userData.wheels[0].rotation.y = car.userData.wheels[1].rotation.y = state.steer * 0.45;
  } else if (window.Interior && Interior.active) {   // INTERIOR hook: walking inside the home
    Interior.walk(dt, now);
  } else {
    // on foot
    const W = state.walk, run = keys.ShiftLeft || keys.ShiftRight ? 8 : 3.6;
    W.heading += ((left ? 1 : 0) - (right ? 1 : 0)) * 2.6 * dt;
    const mv = (fwd ? 1 : 0) - (back ? 0.6 : 0);
    W.x -= Math.sin(W.heading) * mv * run * dt; W.z -= Math.cos(W.heading) * mv * run * dt;
    collide(W, 0.35, null);
    // can't walk through the car
    const cx = W.x - state.x, cz = W.z - state.z, cd = Math.hypot(cx, cz); if (cd < 1.6 && cd > 1e-6) { W.x = state.x + cx / cd * 1.6; W.z = state.z + cz / cd * 1.6; }
    walker.position.set(W.x, heightAt(W.x, W.z) + Math.abs(Math.sin(now / (run > 5 ? 90 : 160))) * 0.08 * (mv ? 1 : 0), W.z); walker.rotation.y = W.heading;
  }

  // debris
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i]; d.life -= dt; d.vy -= 18 * dt;
    const gy = heightAt(d.m.position.x, d.m.position.z) + 0.05;
    d.m.position.x += d.vx * dt; d.m.position.y = Math.max(gy, d.m.position.y + d.vy * dt); d.m.position.z += d.vz * dt;
    if (d.m.position.y <= gy) { d.vx *= 0.8; d.vz *= 0.8; d.vy = Math.abs(d.vy) * 0.3; }
    d.m.rotation.x += d.vx * dt; d.m.rotation.y += d.vz * dt;
    if (d.life <= 0) { scene.remove(d.m); d.m.geometry.dispose(); debris.splice(i, 1); }
  }
  if (crashTimer > 0) { crashTimer -= dt; if (crashTimer <= 0) crashEl.classList.remove('show'); }

  // camera
  const focus = state.mode === 'car' ? { x: state.x, z: state.z, h: state.heading } : { x: state.walk.x, z: state.walk.z, h: state.walk.heading };
  focus.y = heightAt(focus.x, focus.z);
  const fx = -Math.sin(focus.h), fz = -Math.cos(focus.h);
  if (window.Interior && Interior.active) Interior.camera(dt, camLook);   // INTERIOR hook: indoor camera
  else if (window.__street && window.__street.view) {   // debug-only fixed camera, relative to the car
    const v = window.__street.view, c = car.position, cs = Math.cos(state.heading), sn = Math.sin(state.heading);
    if (v.length === 6) { camera.position.set(v[0], v[1], v[2]); camLook.set(v[3], v[4], v[5]); }   // world camera + target
    else { camera.position.set(c.x + v[0] * cs + v[2] * sn, c.y + v[1], c.z - v[0] * sn + v[2] * cs); camLook.set(c.x, c.y + 0.8, c.z); }
  } else if (state.cam === 0) {
    const dist = state.mode === 'car' ? 9.5 : 5, high = state.mode === 'car' ? 3.8 : 2.4;
    const cx = focus.x - fx * dist, cz = focus.z - fz * dist;
    camPos.set(cx, Math.max(heightAt(cx, cz), focus.y) + high, cz);
    camera.position.lerp(camPos, Math.min(1, dt * 6)); camLook.set(focus.x + fx * 4, focus.y + 1.2, focus.z + fz * 4);
  } else if (state.cam === 1) {
    const eye = state.mode === 'car' ? 1.35 : 1.7;
    camera.position.set(focus.x + fx * (state.mode === 'car' ? 0.2 : 0.3), focus.y + eye, focus.z + fz * (state.mode === 'car' ? 0.2 : 0.3));
    camLook.set(focus.x + fx * 20, heightAt(focus.x + fx * 20, focus.z + fz * 20) + eye - 0.3, focus.z + fz * 20);
  } else {
    camPos.set(focus.x, focus.y + 70, focus.z + 30); camera.position.lerp(camPos, Math.min(1, dt * 4)); camLook.set(focus.x, focus.y, focus.z);
  }
  walker.visible = state.mode === 'walk' && !(state.cam === 1);
  car.visible = !(state.mode === 'car' && state.cam === 1);
  if (state.shake > 0) { camera.position.x += (Math.random() - 0.5) * state.shake; camera.position.y += (Math.random() - 0.5) * state.shake * 0.6; state.shake = Math.max(0, state.shake - dt * 2); }
  camera.lookAt(camLook);
  skyDome.position.set(camera.position.x, camera.position.y - 5, camera.position.z);   // sky travels with you (R52: it ended 2.5 km from home)

  // sun follows the player so shadows stay sharp nearby
  sun.position.set(focus.x + 60, focus.y + 110, focus.z + 40); sun.target.position.set(focus.x, focus.y, focus.z);

  // HUD
  // HUD (R54: speedometer bottom centre, no crash counter, hills shown only in the controls list)
  const spTxt = state.mode === 'car' ? Math.round(Math.abs(state.speed) * 3.6) + '<small>km/h</small>' : 'On foot';
  if (speedEl.innerHTML !== spTxt) speedEl.innerHTML = spTxt;
  modeEl.textContent = (state.mode === 'car' ? '' : 'Walking · ') + CAM_NAMES[state.cam];
  if (M.route) { const d = Math.hypot(M.route.dest[0] - focus.x, M.route.dest[1] - focus.z);
    destEl.textContent = d < 40 ? 'You have arrived: Bergeron Pvt' : 'Bergeron Pvt · ' + (d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d / 10) * 10 + ' m'); }
  streetTimer -= dt; if (streetTimer <= 0) { streetTimer = 0.4; showWhere(focus.x, focus.z); }
  drawMini(focus.x, focus.z, focus.h);

  updateSignals(now / 1000); updateParks(now / 1000); cullProps(dt, focus);
  updateChunks(focus.x, focus.z);   // load when near (R54): drape the next squares around you
  updateFalling(dt);
  renderer.render(scene, camera);
  if (!manual) requestAnimationFrame(frame);
}
updateChunks(state.x, state.z, Infinity, 400);   // load when near (R54): only the squares around home before the first frame
// small props (signs, posts, mailboxes, benches...) are only drawn within 320 m of the player: the map now reaches 5 km,
// and drawing ~11,000 tiny objects every frame was the main slowdown
const cullList = [];
{
  const box = new THREE.Box3(), sph = new THREE.Sphere();
  const skip = new Set([car, walker, skyDome]);
  if (window.Interior && Interior.debug && Interior.debug.group) skip.add(Interior.debug.group());
  for (const o of scene.children) {
    // streamed layers (finish(..., {drape})) show / hide per 200 m square themselves; treating one as a small prop hid the
    // whole layer whenever you were far from its few triangles near home (R61: drive-throughs vanished)
    if (skip.has(o) || o.isLight || o.isInstancedMesh || o.isSprite || o.userData.streamed) continue;
    box.setFromObject(o); if (box.isEmpty()) continue;
    box.getBoundingSphere(sph); if (sph.radius > 20) continue;
    cullList.push({ o, x: sph.center.x, z: sph.center.z });
  }
}
let cullT = 0;
function cullProps(dt, f) {
  cullT -= dt; if (cullT > 0) return; cullT = 0.3;
  const R2 = 320 * 320;
  for (const c of cullList) { const dx = c.x - f.x, dz = c.z - f.z; c.o.visible = dx * dx + dz * dz < R2; }
}
requestAnimationFrame(frame);
// ?debug exposes a tiny test hook that simulates N seconds at 60 fps
if (location.search.includes('debug')) window.__street = { state, keys, scene, knocked() { let n = 0; for (const l of grid.values()) for (const it of l) if (it.down) n++; return n; }, run(sec) { let t = last; for (let i = 0; i < sec * 60; i++) frame(t += 1000 / 60, true); } };

(window.__loadT = window.__loadT || []).push(['game', Math.round(performance.now())]);   // load timing (see ?debug)
