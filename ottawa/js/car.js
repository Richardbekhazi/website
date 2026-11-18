// Street Test - car.js: the QX50, the walker, spawn/reset, calling the car.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

// ---------- car & walker ----------
// 2025 Infiniti QX50 (low-poly). Real size: 4.70 m long, 1.90 m wide, 1.68 m tall, 2.80 m wheelbase, 255/45R20 tyres.
// Built from side profiles extruded across the width; the car faces -z.
const CAR_COLORS = [
  { name: 'Graphite grey', hex: 0x45484c }, { name: 'Pearl white', hex: 0xe8e8e4 }, { name: 'Black', hex: 0x121315 },
  { name: 'Deep red', hex: 0x7c1418 }, { name: 'Deep blue', hex: 0x1d3557 }, { name: 'Silver', hex: 0xaeb2b6 },
];
function buildCar() {
  const g = new THREE.Group(), body = new THREE.Group();
  const LEN = 4.70, HALF_L = LEN / 2;
  const paint = new THREE.MeshPhongMaterial({ color: CAR_COLORS[1].hex, shininess: 90, specular: 0x666666 });   // owner's car: pearl white
  const glass = new THREE.MeshPhongMaterial({ color: 0x0f1418, shininess: 120, specular: 0x8899aa });
  const black = new THREE.MeshLambertMaterial({ color: 0x141516 });
  const chrome = new THREE.MeshPhongMaterial({ color: 0xc8ccd0, shininess: 140, specular: 0xffffff });
  const ledW = new THREE.MeshBasicMaterial({ color: 0xf4f8ff }), ledR = new THREE.MeshBasicMaterial({ color: 0xc8141b });

  // side profile points as [distance from the front bumper, height], extruded across `width`
  function extrude(profile, width, mat, bevel = 0.04) {
    const shape = new THREE.Shape(profile.map(([s, y]) => new THREE.Vector2(HALF_L - s, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 3, curveSegments: 8 });
    geo.translate(0, 0, -(width - bevel * 2) / 2); geo.rotateY(Math.PI / 2);
    const m = new THREE.Mesh(geo, mat); body.add(m); return m;
  }
  const arch = (cs, from, to) => { const pts = []; for (let k = 0; k <= 10; k++) { const t = Math.PI * k / 10; pts.push([cs + 0.45 * Math.cos(t), 0.37 + 0.45 * Math.sin(t)]); } return pts; };
  // lower body up to the beltline, with wheel arches cut out
  extrude([[0.10, 0.36], [0.00, 0.48], [0.02, 0.70], [0.09, 0.84], [0.32, 0.93], [1.25, 1.05], [2.6, 1.10], [4.35, 1.14],
    [4.62, 1.10], [4.70, 0.98], [4.71, 0.62], [4.62, 0.36], ...arch(3.75), [2.9, 0.34], [1.6, 0.34], ...arch(0.95)], 1.90, paint, 0.08);
  // glasshouse: steep windscreen, coupe-like sloping roof into the hatch
  extrude([[1.24, 1.05], [2.05, 1.57], [2.35, 1.63], [3.55, 1.645], [3.98, 1.55], [4.45, 1.14], [4.40, 1.10], [1.32, 1.06]], 1.58, glass, 0.06);
  // painted roof panel (the glass shows below it as the black pillars / window line)
  extrude([[2.02, 1.585], [2.35, 1.665], [3.55, 1.68], [3.97, 1.585], [3.90, 1.57], [3.55, 1.64], [2.35, 1.625], [2.08, 1.565]], 1.50, paint, 0.04);
  // painted C-pillar with the QX50's forward-swept kink
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape([[3.62, 1.62], [3.98, 1.55], [4.44, 1.14], [4.10, 1.14], [3.80, 1.36]].map(([s, y]) => new THREE.Vector2(HALF_L - s, y)));
    const geo = new THREE.ShapeGeometry(shape); geo.rotateY(Math.PI / 2);
    const m = new THREE.Mesh(geo, paint); m.position.x = side * 0.805; m.material.side = THREE.DoubleSide; body.add(m);
  }
  // black lower cladding and wheel-arch trim
  for (const side of [-1, 1]) {
    const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 1.85), black); rocker.position.set(side * 0.955, 0.42, 0.0); body.add(rocker);
    for (const zc of [-1.40, 1.40]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.52, 18, 1, 0, Math.PI), black);
      ring.rotation.y = side * Math.PI / 2; ring.position.set(side * 0.955, 0.37, zc); ring.material.side = THREE.DoubleSide; body.add(ring);
    }
    // chrome window line
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 3.05), chrome); strip.position.set(side * 0.80, 1.075, 0.45); body.add(strip);
    // mirrors
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.12), paint); mir.position.set(side * 1.0, 1.13, -0.98); body.add(mir);
    // roof rails
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 1.65), chrome); rail.position.set(side * 0.62, 1.70, 0.6); body.add(rail);
    // headlight: thin LED "eye", and the slim tail light
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.05), ledW); hl.position.set(side * 0.6, 0.86, -2.30); hl.rotation.z = side * 0.12; body.add(hl);
    const hlb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.04), black); hlb.position.set(side * 0.6, 0.83, -2.29); hlb.rotation.z = side * 0.12; body.add(hlb);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.05), ledR); tl.position.set(side * 0.58, 1.02, 2.37); body.add(tl);
    const fog = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), ledW); fog.position.set(side * 0.68, 0.48, -2.37); body.add(fog);
  }
  // double-arch grille with chrome surround
  {
    const pts = [[-0.30, 0.46], [0.30, 0.46], [0.40, 0.76], [0.2, 0.83], [0, 0.85], [-0.2, 0.83], [-0.40, 0.76]];
    const mk = (scale, mat, z) => {
      const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * scale, 0.655 + (y - 0.655) * scale)));
      const geo = new THREE.ShapeGeometry(sh); geo.rotateY(Math.PI);
      const m = new THREE.Mesh(geo, mat); m.position.z = z; body.add(m);
    };
    mk(1.1, chrome, -2.385); mk(1.0, new THREE.MeshPhongMaterial({ color: 0x0c0c0d, shininess: 60 }), -2.39);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.01), chrome); bar.position.set(0, 0.66, -2.395); body.add(bar);
    const intake = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.04), black); intake.position.set(0, 0.38, -2.36); body.add(intake);
    const tbar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.04), chrome); tbar.position.set(0, 1.02, 2.37); body.add(tbar);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.15, 0.02), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 })); plate.position.set(0, 0.78, 2.38); body.add(plate);
  }
  // 20-inch wheels: tyre, dark machined rim with 5 split spokes
  const tyreG = new THREE.CylinderGeometry(0.37, 0.37, 0.24, 26); tyreG.rotateZ(Math.PI / 2);
  const rimG = new THREE.CylinderGeometry(0.255, 0.255, 0.245, 22); rimG.rotateZ(Math.PI / 2);
  const rimM = new THREE.MeshPhongMaterial({ color: 0x5d6166, shininess: 80 }), spokeM = new THREE.MeshPhongMaterial({ color: 0xb9bdc2, shininess: 120 });
  const wheels = [];
  for (const [x, z] of [[-0.83, -1.40], [0.83, -1.40], [-0.83, 1.40], [0.83, 1.40]]) {
    const w = new THREE.Group(); w.rotation.order = 'YXZ';
    w.add(new THREE.Mesh(tyreG, black), new THREE.Mesh(rimG, rimM));
    for (let k = 0; k < 10; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.23, 0.035), spokeM);
      const a = (Math.floor(k / 2) * 2 * Math.PI / 5) + (k % 2 ? 0.12 : -0.12);
      sp.position.set(Math.sign(x) * 0.125, Math.sin(a) * 0.12, Math.cos(a) * 0.12); sp.rotation.x = -a; w.add(sp);
    }
    w.position.set(x, 0.37, z); g.add(w); wheels.push(w);
  }
  g.add(body);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { body, wheels, paint, colorIdx: 1 };
  return g;
}
function setCarColor(idx) {
  car.userData.colorIdx = idx; car.userData.paint.color.setHex(CAR_COLORS[idx].hex);
}
// The walker: a 1.80 m adult in a tee, jeans and white sneakers, with jointed arms and legs.
// Faces -z (like the car). It animates itself: each frame it measures how far it moved and swings
// its limbs to match (walk / run blend), so game.js and interior.js only need to move the root.
function buildWalker() {
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const M = { skin: mat(0xc99a78), shirt: mat(0x2e6f8e), jeans: mat(0x3a4e6b), shoe: mat(0xf2f2f0), sole: mat(0x6b6b6b),
    hair: mat(0x2a1f17), eye: mat(0x1b1b1b), belt: mat(0x3a2a1e) };
  const g = new THREE.Group();
  const add = (parent, geo, m, x, y, z, sx, sy, sz) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (sx) o.scale.set(sx, sy, sz); parent.add(o); return o;
  };
  const cyl = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 12);
  const sph = r => new THREE.SphereGeometry(r, 14, 10);
  const pivot = (parent, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };

  // legs: hip -> thigh -> knee -> shin -> sneaker
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = pivot(g, s * 0.1, 0.95, 0);
    add(hip, cyl(0.082, 0.068, 0.44), M.jeans, 0, -0.22, 0);
    const knee = pivot(hip, 0, -0.44, 0);
    add(knee, sph(0.068), M.jeans, 0, 0, 0);
    add(knee, cyl(0.066, 0.052, 0.42), M.jeans, 0, -0.21, 0);
    add(knee, new THREE.BoxGeometry(0.11, 0.075, 0.27), M.shoe, 0, -0.44, -0.05);
    add(knee, new THREE.BoxGeometry(0.115, 0.022, 0.28), M.sole, 0, -0.485, -0.05);
    legs.push({ hip, knee });
  }
  // body: pelvis, belt, torso (chest wider than waist), neck
  const spine = pivot(g, 0, 1.0, 0);
  add(spine, cyl(0.16, 0.17, 0.16), M.jeans, 0, -0.04, 0, 1, 1, 0.7);
  add(spine, cyl(0.163, 0.163, 0.035), M.belt, 0, 0.045, 0, 1, 1, 0.72);
  const torso = add(spine, cyl(0.2, 0.162, 0.48), M.shirt, 0, 0.29, 0, 1, 1, 0.62);
  add(spine, sph(0.2), M.shirt, 0, 0.5, 0, 1.04, 0.36, 0.7);                       // shoulder line
  add(spine, cyl(0.048, 0.052, 0.12), M.skin, 0, 0.6, 0);
  // head: skull, hair, ears, eyes, brows, nose
  const head = pivot(spine, 0, 0.71, 0);
  add(head, sph(0.112), M.skin, 0, 0, 0, 0.9, 1.1, 1.0);
  add(head, new THREE.SphereGeometry(0.118, 14, 10, 0, Math.PI * 2, 0, 1.62), M.hair, 0, 0.01, 0.01, 0.93, 1.1, 1.03).rotation.x = -0.75;
  for (const s of [-1, 1]) {
    add(head, sph(0.026), M.skin, s * 0.1, -0.005, 0.005, 0.5, 1, 0.8);
    add(head, sph(0.0095), M.eye, s * 0.037, 0.006, -0.099);
    add(head, new THREE.BoxGeometry(0.036, 0.008, 0.01), M.hair, s * 0.037, 0.03, -0.103);
  }
  add(head, new THREE.BoxGeometry(0.022, 0.04, 0.03), M.skin, 0, -0.012, -0.11);
  // arms: shoulder -> short sleeve + upper arm -> elbow -> forearm -> hand
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = pivot(spine, s * 0.215, 0.47, 0);
    add(sh, sph(0.068), M.shirt, 0, 0, 0);
    add(sh, cyl(0.066, 0.06, 0.15), M.shirt, 0, -0.07, 0);
    add(sh, cyl(0.05, 0.045, 0.3), M.skin, 0, -0.15, 0);
    const el = pivot(sh, 0, -0.3, 0);
    add(el, sph(0.045), M.skin, 0, 0, 0);
    add(el, cyl(0.044, 0.035, 0.26), M.skin, 0, -0.13, 0);
    add(el, sph(0.045), M.skin, 0, -0.29, -0.005, 0.7, 1.2, 1.0);
    arms.push({ sh, el, s });
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });

  // self-animation (runs once per drawn frame; the shadow pass would call it again, hence the time guard)
  let last = 0, px = null, pz = null, phase = 0, spd = 0;
  torso.onBeforeRender = () => {
    const now = performance.now(); if (now - last < 4) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    let d = px === null ? 0 : Math.hypot(g.position.x - px, g.position.z - pz); px = g.position.x; pz = g.position.z;
    if (d > 1.2) d = 0;                                   // a teleport, not a step
    spd += ((dt > 0 ? d / dt : 0) - spd) * Math.min(1, dt * 8);
    const walk = Math.min(1, spd / 2.5), run = Math.max(0, Math.min(1, (spd - 3) / 2.5));
    phase += d / (0.75 + 0.35 * run) * Math.PI;           // one step = half a cycle
    const legA = 0.42 * walk + 0.35 * run, armA = 0.35 * walk + 0.55 * run;
    legs.forEach((l, i) => {
      const p = phase + i * Math.PI;
      l.hip.rotation.x += (Math.sin(p) * legA - l.hip.rotation.x) * 0.5;
      l.knee.rotation.x += (-(0.05 + Math.max(0, Math.cos(p)) * (0.55 * walk + 0.7 * run)) * Math.min(1, walk * 3) - l.knee.rotation.x) * 0.5;
    });
    arms.forEach((a, i) => {
      const p = phase + (1 - i) * Math.PI;                 // opposite to the leg on the same side
      a.sh.rotation.x += (Math.sin(p) * armA - a.sh.rotation.x) * 0.5;
      a.sh.rotation.z = a.s * (0.07 + 0.01 * Math.sin(now / 900));
      a.el.rotation.x += ((0.18 + 0.25 * walk + 1.0 * run + Math.max(0, Math.sin(p)) * 0.3 * walk) - a.el.rotation.x) * 0.5;
    });
    spine.rotation.x += (-0.14 * run - spine.rotation.x) * 0.3;   // lean into a run
    spine.rotation.y = Math.sin(phase) * 0.06 * walk;
    torso.scale.x = 1 + Math.sin(now / 700) * 0.008 * (1 - walk);  // breathing when standing
  };
  return g;
}
const car = buildCar(); scene.add(car);

// Blender model (data/car.js, made by tools/blender/qx50.py): replaces the simple car above once it has loaded.
// Keeps the same pieces the game drives: car.userData.body (tilts), .wheels (spin/steer), .paint (P key, damage).
(function upgradeCar() {
  if (!window.CAR_GLB || !THREE.GLTFLoader) return;   // no model or no loader: keep the simple car
  const bin = atob(window.CAR_GLB), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer, '', gltf => {
    let bodyMesh = null, wheelMesh = null;
    gltf.scene.traverse(o => { if (o.name === 'Body') bodyMesh = o; if (o.name === 'Wheel') wheelMesh = o; });
    if (!bodyMesh || !wheelMesh) return;
    const ud = car.userData, mats = new Set();
    const prep = o => o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => mats.add(x)); } });
    bodyMesh.position.set(0, 0, 0); prep(bodyMesh);
    ud.body.clear(); ud.body.add(bodyMesh);
    for (const w of ud.wheels) {
      const c = wheelMesh.clone(); c.position.set(0, 0, 0);
      if (w.position.x < 0) c.scale.x = -1;          // left wheels: mirror so the spokes face outward
      w.position.x = Math.sign(w.position.x) * 0.81; w.position.y = 0.369;   // 1.62 m track, 255/45R20
      w.clear(); w.add(c); prep(c);
    }
    for (const m of mats) {
      if (m.name === 'Paint') { ud.paint = m; m.color.setHex(CAR_COLORS[ud.colorIdx].hex); }
      if (m.name === 'Glass') { m.roughness = 0.05; m.metalness = 0.1; }
      carMats.push(m);
    }
    applyCarEnv();
  }, err => console.warn('car model failed to load, keeping the simple car', err));
})();
// sky reflections on the car's paint, glass and chrome: the sky photo above, a grey-green ground below
const carMats = [];
let carEnv = null;
function applyCarEnv() { if (carEnv) for (const m of carMats) { m.envMap = carEnv; m.envMapIntensity = 1.0; m.needsUpdate = true; } }
if (TX.sky) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#5b6150'; g.fillRect(0, 0, 1024, 512);
    g.drawImage(img, 0, 0, 1024, 264);
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer); carEnv = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    applyCarEnv();
  };
  img.src = TX.sky;
}
const walker = buildWalker(); walker.visible = false; scene.add(walker);

// spawn: on Establish Avenue in front of home, facing along the street
function spawnPoint() {
  let best = null;
  for (const s of roadSegs) {
    if (s.n !== 'Establish Avenue') continue;
    const dx = s.x2-s.x1, dz = s.z2-s.z1, L2 = dx*dx + dz*dz || 1;
    const t = Math.max(0, Math.min(1, ((homeInfo.x-s.x1)*dx + (homeInfo.z-s.z1)*dz) / L2));
    const px = s.x1 + t*dx, pz = s.z1 + t*dz, d = Math.hypot(px - homeInfo.x, pz - homeInfo.z);
    if (!best || d < best.d) best = { d, x: px, z: pz, heading: Math.atan2(-dx, -dz), dx, dz };
  }
  if (!best) return { x: 0, z: 10, heading: 0 };
  // face the way out: toward where Establish Avenue meets Gerry Lalonde Drive
  const exit = exitPoint('Establish Avenue', 'Gerry Lalonde Drive');
  if (exit && (exit[0] - best.x) * best.dx + (exit[1] - best.z) * best.dz < 0) best.heading += Math.PI;
  // keep right: sit in the right-hand lane (Ontario drives on the right)
  const fx = -Math.sin(best.heading), fz = -Math.cos(best.heading);
  best.x += -fz * 1.9; best.z += fx * 1.9;
  return best;
}
function exitPoint(from, to) {
  const ends = M.roads.filter(r => r.n === from).flatMap(r => [r.p[0], r.p[r.p.length - 1]]);
  const target = M.roads.filter(r => r.n === to).flatMap(r => r.p);
  for (const e of ends) for (const t of target) if (Math.hypot(e[0] - t[0], e[1] - t[1]) < 1) return e;
  return null;
}
const state = { mode: 'car', cam: 0, speed: 0, heading: 0, x: 0, z: 0, steer: 0, crashes: 0,
  walk: { x: 0, z: 0, heading: 0 }, shake: 0, tilt: 0 };
function resetToHome() {
  const s = spawnPoint();
  Object.assign(state, { x: s.x, z: s.z, heading: s.heading, speed: 0, steer: 0, mode: 'car' });
  walker.visible = false; car.userData.body.rotation.set(0, 0, 0);
}
resetToHome();

(window.__loadT = window.__loadT || []).push(['car', Math.round(performance.now())]);   // load timing (see ?debug)
