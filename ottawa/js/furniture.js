// Street Test - furniture.js: street lights, stop signs, street-name signs, signals, mailboxes, bus stops, hydro towers, cabinets.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

// ---------- street furniture (real positions mapped in OpenStreetMap) ----------
buildCurbs();
const signalMats = { A: {}, B: {} };
{
  const F = M.furniture || { lamps: [], stops: [], signals: [], mail: [], bus: [], cabinets: [] };
  const metal = new THREE.MeshLambertMaterial({ color: 0x6f7377 });
  const facing = (x, z) => { const r = nearestRoadPoint(x, z); return r && r.d < 25 ? [(r.x - x) / (r.d || 1), (r.z - z) / (r.d || 1)] : [1, 0]; };
  const yawTo = (dx, dz) => Math.atan2(dx, dz);   // rotates local +z to face (dx, dz)
  const place = (obj, x, z, yaw, r = 0.15, solid = false) => {
    obj.position.set(x, heightAt(x, z), z); obj.rotation.y = yaw; obj.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(obj);
    gridAdd({ kind: 'tree', x, z, r, fall: solid ? null : { obj, q0: obj.quaternion.clone() } }, x - 1, z - 1, x + 1, z + 1);
  };

  // street lights: real mapped lamps, arm reaching over the road (falls back to generated ones)
  const lamps = F.lamps.length ? F.lamps.map(([x, z]) => { const [dx, dz] = facing(x, z); return [x, z, dx, dz]; }) : lampSpots;
  const spots = lamps.filter(([x, z]) => !inBuilding(x, z, 0.8));
  // slim grey pole, short arm, small LED head (as on Establish Avenue, Street View Sep 2025)
  const poleG = new THREE.CylinderGeometry(0.065, 0.1, 8, 8); poleG.translate(0, 4, 0);
  const armG = new THREE.BoxGeometry(0.9, 0.06, 0.06); armG.translate(0.45, 7.85, 0);
  const headG = new THREE.CylinderGeometry(0.16, 0.2, 0.12, 12); headG.translate(0.9, 7.82, 0);
  const lampMetal = new THREE.MeshLambertMaterial({ color: 0x8b8f93 });
  const meshes = [new THREE.InstancedMesh(poleG, lampMetal, spots.length), new THREE.InstancedMesh(armG, lampMetal, spots.length),
    new THREE.InstancedMesh(headG, new THREE.MeshLambertMaterial({ color: 0x55585c, emissive: 0x222222 }), spots.length)];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3();
  spots.forEach(([x, z, dx, dz], i) => {
    q.setFromAxisAngle(UP, Math.atan2(-dz, dx)); ps.set(x, heightAt(x, z), z); m.compose(ps, q, one);
    for (const im of meshes) im.setMatrixAt(i, m);
    gridAdd({ kind: 'tree', x, z, r: 0.15, fall: { parts: meshes.map(im => [im, i, m.clone()]), base: ps.clone() } }, x - 1, z - 1, x + 1, z + 1);
  });
  for (const im of meshes) { im.castShadow = true; scene.add(im); }

  // painted stop bars (white, 45 cm) across the approach lane
  const barB = makeBuilder(), white = new THREE.Color(0xf4f4f0);
  const stopBar = (x, z, dx, dz, w) => {
    const rx = -dz, rz = dx, a = 0.15, b = w / 2 - 0.45, t = 0.45;
    quadUp(barB, [x + rx * a, 0.135, z + rz * a], [x + rx * b, 0.135, z + rz * b], [x + rx * b + dx * t, 0.135, z + rz * b + dz * t], [x + rx * a + dx * t, 0.135, z + rz * a + dz * t], white, UV0, UV0, UV0, UV0);
  };

  // stop signs: red octagon, plus the Ontario "ALL-WAY" tab at all-way stops
  const signTex = canvasTex(128, 128, g => {
    g.translate(64, 64); g.fillStyle = '#fff'; g.beginPath();
    for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; g.lineTo(Math.cos(a) * 62, Math.sin(a) * 62); } g.fill();
    g.fillStyle = '#c8102e'; g.beginPath();
    for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; g.lineTo(Math.cos(a) * 56, Math.sin(a) * 56); } g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 38px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 0, 2);
  });
  const tabTex = canvasTex(128, 48, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 48); g.strokeStyle = '#c8102e'; g.lineWidth = 5; g.strokeRect(3, 3, 122, 42);
    g.fillStyle = '#c8102e'; g.font = 'bold 26px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ALL-WAY', 64, 25); });
  const signMat = new THREE.MeshLambertMaterial({ map: signTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const tabMat = new THREE.MeshLambertMaterial({ map: tabTex, side: THREE.DoubleSide });
  // inferred stops: where a residential street ends at a bigger road and the map has no stop sign or signal nearby
  // (standard Ottawa practice; these are guesses, unlike the mapped ones)
  const controlled = [...F.stops.map(s => [s[0], s[1]]), ...F.signals.flatMap(s => s.lines.map(l => [l[0], l[1]]))];
  const stops = F.stops.slice();
  const MINOR = new Set(['residential', 'unclassified', 'living_street']);
  for (const r of M.roads) {
    if (!MINOR.has(r.t) || r.p.length < 2) continue;
    for (const [end, prev] of [[r.p[0], r.p[1]], [r.p[r.p.length - 1], r.p[r.p.length - 2]]]) {
      const near = [...gridNear(end[0], end[1])].filter(it => it.kind === 'road').map(it => it.seg);   // spatial grid, not all segments
      const major = near.find(s => ARTERIAL.has(s.t) && s.road !== r &&
        (Math.hypot(s.x1 - end[0], s.z1 - end[1]) < 0.5 || Math.hypot(s.x2 - end[0], s.z2 - end[1]) < 0.5));
      if (!major) continue;
      if (controlled.some(([cx, cz]) => Math.hypot(cx - end[0], cz - end[1]) < 25)) continue;
      const dx = end[0] - prev[0], dz = end[1] - prev[1], L = Math.hypot(dx, dz) || 1, back = major.w / 2 + 1.8;
      stops.push([end[0] - dx / L * back, end[1] - dz / L * back, dx / L, dz / L, r.w, 0]);
    }
  }
  for (const [x, z, dx, dz, w, all] of stops) {
    stopBar(x, z, dx, dz, w);
    const sx = x + -dz * (w / 2 + 0.9), sz = z + dx * (w / 2 + 0.9);
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), metal); post.position.y = 1.3; g.add(post);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), signMat); face.position.set(0, 2.45, 0.04); g.add(face);
    if (all) { const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), tabMat); tab.position.set(0, 1.92, 0.04); g.add(tab); }
    place(g, sx, sz, yawTo(-dx, -dz));
  }

  // street-name signs: City of Ottawa style (blue blade, white text), one post at each corner where two named
  // streets meet. Blades are drawn bigger than real (1.7 x 0.32 m) so names are readable while driving.
  {
    const ABBR = { Avenue: 'Ave', Street: 'St', Drive: 'Dr', Road: 'Rd', Boulevard: 'Blvd', Crescent: 'Cres', Place: 'Pl',
      Private: 'Pvt', Terrace: 'Terr', Circle: 'Circ', Court: 'Crt', Lane: 'Lane', Way: 'Way', Grove: 'Grove', Walk: 'Walk', Row: 'Row' };
    const short = name => name.replace(/\b(\w+)$/, w => ABBR[w] || w);
    const mats = new Map();
    const bladeMat = name => {
      if (mats.has(name)) return mats.get(name);
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
      g.fillStyle = '#1d4f9c'; g.fillRect(0, 0, 512, 96);
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeRect(6, 6, 500, 84);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      let fs = 56; do { g.font = `bold ${fs}px Arial, sans-serif`; fs -= 2; } while (g.measureText(short(name)).width > 470 && fs > 24);
      g.fillText(short(name), 256, 50);
      const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
      const m = new THREE.MeshLambertMaterial({ map: t, emissive: 0x111111 }); mats.set(name, m); return m;
    };
    const key = p => Math.round(p[0] * 4) + ',' + Math.round(p[1] * 4);
    const at = new Map();
    for (const r of M.roads) {
      if (!r.n || !CAR_ROADS.has(r.t) || r.t === 'service' || r.t === 'track') continue;
      r.p.forEach((p, i) => { const k = key(p); if (!at.has(k)) at.set(k, { p, arms: [] }); at.get(k).arms.push({ r, i }); });
    }
    const done = [];
    for (const { p, arms } of at.values()) {
      const names = [...new Set(arms.map(a => a.r.n))];
      if (names.length < 2) continue;
      const [na, nb] = names;
      if (done.some(d => d.pair === na + '|' + nb && Math.hypot(d.x - p[0], d.z - p[1]) < 30)) continue;
      const arm = name => { const o = arms.find(a => a.r.n === name), P = o.r.p, j = o.i < P.length - 1 ? o.i + 1 : o.i - 1;
        const dx = P[j][0] - P[o.i][0], dz = P[j][1] - P[o.i][1], L = Math.hypot(dx, dz) || 1; return { dx: dx / L, dz: dz / L, w: o.r.w }; };
      const A = arm(na), B = arm(nb);
      // pick a corner that is off both carriageways
      let spot = null;
      for (const [sa, sb] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const x = p[0] + A.dx * sa * (B.w / 2 + 1.8) + B.dx * sb * (A.w / 2 + 1.8), z = p[1] + A.dz * sa * (B.w / 2 + 1.8) + B.dz * sb * (A.w / 2 + 1.8);
        if (!onOtherRoad(x, z, null, -0.8) && !inBuilding(x, z, 0.5)) { spot = [x, z]; break; }
      }
      if (!spot) continue;
      done.push({ pair: na + '|' + nb, x: p[0], z: p[1] });
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6), metal); post.position.y = 1.75; g.add(post);
      [[A, na, 3.05], [B, nb, 3.4]].forEach(([d, name, y]) => {
        for (const back of [0, Math.PI]) {   // two faces back-to-back so the name reads from both directions
          const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), bladeMat(name));
          m.position.y = y; m.rotation.y = Math.atan2(-d.dz, d.dx) + back; g.add(m);
        }
      });
      place(g, spot[0], spot[1], 0, 0.12);
    }
  }

  // traffic signals: pole on the right, mast arm over the lanes, 3-lamp heads facing the approaching driver
  const lampGeo = new THREE.CircleGeometry(0.1, 14);
  for (const k of ['A', 'B']) for (const c of ['r', 'y', 'g']) signalMats[k][c] = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const headM = new THREE.MeshLambertMaterial({ color: 0x1b1c1e });
  for (const sig of F.signals) for (const [x, z, dx, dz, w] of sig.lines) {
    stopBar(x, z, dx, dz, w);
    const group = Math.abs(dx) > Math.abs(dz) ? 'A' : 'B';
    const off = w / 2 + 1.0, sx = x + -dz * off, sz = z + dx * off;
    const g = new THREE.Group(), arm = off - w / 4;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.2, 8), metal); pole.position.y = 3.1; g.add(pole);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(arm, 0.12, 0.12), metal); mast.position.set(-arm / 2, 5.9, 0); g.add(mast);
    for (const hx of [-arm + 0.2, -arm / 2]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.0, 0.28), headM); head.position.set(hx, 5.3, 0); g.add(head);
      [['r', 0.3], ['y', 0], ['g', -0.3]].forEach(([c, dy]) => { const l = new THREE.Mesh(lampGeo, signalMats[group][c]); l.position.set(hx, 5.3 + dy, 0.145); g.add(l); });
    }
    place(g, sx, sz, yawTo(-dx, -dz), 0.2);
  }
  finish(barB, flatMat(4), { drape: true });

  // Canada Post community mailboxes on a concrete pad
  const mailTex = canvasTex(128, 128, g => { g.fillStyle = '#d6d9dc'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#8c9196'; g.lineWidth = 2;
    for (let x = 4; x < 128; x += 20) for (let y = 4; y < 100; y += 16) g.strokeRect(x, y, 18, 14); g.fillStyle = '#c8102e'; g.fillRect(0, 108, 128, 20); });
  const mailMat = [metal, metal, new THREE.MeshLambertMaterial({ color: 0xc9ccd0 }), metal, new THREE.MeshLambertMaterial({ map: mailTex }), metal];
  for (const [x, z] of F.mail) {
    const [dx, dz] = facing(x, z), g = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.6), new THREE.MeshLambertMaterial({ color: 0xc9c7c0 })); pad.position.y = 0.06; g.add(pad);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.55, 0.65), mailMat); box.position.y = 1.1; g.add(box);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 0.5), metal); legs.position.y = 0.22; g.add(legs);
    place(g, x, z, yawTo(dx, dz), 0.8);
  }
  // bus stops: pole and stop flag
  const busTex = canvasTex(64, 96, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 96); g.fillStyle = '#c8102e'; g.fillRect(0, 0, 64, 30);
    g.fillStyle = '#fff'; g.font = 'bold 18px Arial'; g.textAlign = 'center'; g.fillText('BUS', 32, 22); g.fillStyle = '#222'; g.font = 'bold 14px Arial'; g.fillText('STOP', 32, 56); g.fillText('ARRÊT', 32, 78); });
  for (const [x, z] of F.bus) {
    const [dx, dz] = facing(x, z), g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), metal); post.position.y = 1.5; g.add(post);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.68), new THREE.MeshLambertMaterial({ map: busTex, side: THREE.DoubleSide }));
    flag.position.set(0.24, 2.6, 0); flag.rotation.y = Math.PI / 2; g.add(flag);
    place(g, x, z, yawTo(dx, dz));
  }
  // businesses mapped as a point outside any building: a small roadside pylon sign with the name (no logos)
  for (const [x, z, name] of (F.pylons || [])) {
    if (inBuilding(x, z, 0.5)) continue;
    const [dx, dz] = facing(x, z), g = new THREE.Group();
    const c = document.createElement('canvas'), cg = c.getContext('2d'); cg.font = 'bold 48px Arial, sans-serif';
    c.width = Math.max(256, Math.ceil(cg.measureText(name).width + 40)); c.height = 72;
    cg.fillStyle = '#1d2a36'; cg.fillRect(0, 0, c.width, c.height); cg.fillStyle = '#fff'; cg.font = 'bold 48px Arial, sans-serif';
    cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillText(name, c.width / 2, 38);
    const tex = new THREE.CanvasTexture(c), w = Math.min(3.2, 0.7 * c.width / c.height);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), metal); leg.position.set(s * w * 0.4, 1.3, 0); g.add(leg); }
    const face = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x222222 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, w * c.height / c.width, 0.12), [metal, metal, metal, metal, face, face]); board.position.y = 2.5; g.add(board);
    place(g, x, z, yawTo(dx, dz), 0.4);
  }
  // hydro transmission towers: the lidar's tall (>28 m) features, merged when several peaks belong to one tower
  if (LD) {
    const towers = [];
    for (const [x, z, h] of LD.trees) if (h > 28) {
      const t = towers.find(t => Math.hypot(t[0] - x, t[1] - z) < 18);
      if (t) { if (h > t[2]) { t[0] = x; t[1] = z; t[2] = h; } } else towers.push([x, z, h]);
    }
    const steel = new THREE.MeshLambertMaterial({ color: 0x9a9ea2 });
    const beam = (g, a, b, w = 0.18) => {   // thin box from point a to point b
      const d = new THREE.Vector3().subVectors(b, a), len = d.length();
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), steel);
      m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); g.add(m);
    };
    // line direction: towards the nearest other tower
    for (const [x, z, h] of towers) {
      const other = towers.filter(t => t[0] !== x || t[1] !== z).sort((a, b) => Math.hypot(a[0] - x, a[1] - z) - Math.hypot(b[0] - x, b[1] - z))[0];
      const yaw = other ? Math.atan2(other[0] - x, other[1] - z) : 0;
      const g = new THREE.Group(), V = (a, y, b) => new THREE.Vector3(a, y, b);
      const base = 3.2, top = 0.9, H = h * 0.82;
      const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      legs.forEach(([a, b]) => beam(g, V(a * base, 0, b * base), V(a * top, H, b * top), 0.25));
      for (let k = 1; k <= 6; k++) {   // horizontal rings with cross bracing
        const y0 = H * (k - 1) / 6, y1 = H * k / 6, s0 = base + (top - base) * (k - 1) / 6, s1 = base + (top - base) * k / 6;
        for (let j = 0; j < 4; j++) {
          const [a0, b0] = legs[j], [a1, b1] = legs[(j + 1) % 4];
          beam(g, V(a0 * s1, y1, b0 * s1), V(a1 * s1, y1, b1 * s1), 0.12);
          beam(g, V(a0 * s0, y0, b0 * s0), V(a1 * s1, y1, b1 * s1), 0.08);
        }
      }
      for (const [y, w] of [[H * 0.78, 7], [H, 5.5]]) beam(g, V(-w, y, 0), V(w, y, 0), 0.3);   // cross arms
      beam(g, V(0, H, 0), V(0, h, 0), 0.2);   // peak (ground wire)
      place(g, x, z, yaw, 2.5, true);   // towers are solid steel: you crash
    }
  }
  // utility cabinets
  for (const [x, z] of F.cabinets) {
    const [dx, dz] = facing(x, z), g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.55), new THREE.MeshLambertMaterial({ color: 0x6f7a6a })); b.position.y = 0.65; g.add(b);
    place(g, x, z, yawTo(dx, dz), 0.5);
  }
}
// traffic light cycle: one direction green 18 s, yellow 3 s, all red 2 s, then the other direction
function updateSignals(t) {
  const c = t % 46, phaseA = c < 18 ? 'g' : c < 21 ? 'y' : 'r', phaseB = c >= 23 && c < 41 ? 'g' : c >= 41 && c < 44 ? 'y' : 'r';
  const on = { r: 0xff2a1a, y: 0xffb300, g: 0x2bff6a };
  for (const [k, ph] of [['A', phaseA], ['B', phaseB]]) for (const col of ['r', 'y', 'g']) signalMats[k][col].color.setHex(col === ph ? on[col] : 0x222222);
}

(window.__loadT = window.__loadT || []).push(['furniture', Math.round(performance.now())]);   // load timing (see ?debug)
