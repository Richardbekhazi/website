// Street Test - furniture.js: street lights, stop signs, street-name signs, signals, mailboxes, bus stops, hydro towers, cabinets.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

// ---------- street furniture (real positions mapped in OpenStreetMap) ----------
buildCurbs();
(window.__loadT = window.__loadT || []).push(['furn:curbs', Math.round(performance.now())]);   // section timing (?debug)
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
  const allSpots = lamps.filter(([x, z]) => !inBuilding(x, z, 0.8));
  // R59 round 3: Gerry Lalonde Drive and the south end of Establish Avenue have black decorative poles with lantern
  // heads on a curled arm (Street View Sep 2025, see RESEARCH); everywhere else the slim grey LED pole.
  // INFERRED: where Establish switches style (taken as 70 m from the Gerry Lalonde corner).
  let estCorner = null;   // where Establish meets Gerry Lalonde (a shared map point)
  const gl = M.roads.filter(r => r.n === 'Gerry Lalonde Drive').flatMap(r => r.p);
  for (const r of M.roads) if (r.n === 'Establish Avenue') for (const p of r.p) if (gl.some(g => Math.hypot(g[0] - p[0], g[1] - p[1]) < 1)) estCorner = p;
  const isLantern = (x, z) => {
    const r = nearestRoadPoint(x, z); if (!r || r.d > 25) return false;
    if (r.n === 'Gerry Lalonde Drive') return true;
    return r.n === 'Establish Avenue' && estCorner && Math.hypot(x - estCorner[0], z - estCorner[1]) < 70;
  };
  const spots = [], lanterns = [];
  for (const s of allSpots) (isLantern(s[0], s[1]) ? lanterns : spots).push(s);
  const plant = (list, parts) => {
    const meshes = parts.map(([g, mat]) => new THREE.InstancedMesh(g, mat, list.length));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3();
    list.forEach(([x, z, dx, dz], i) => {
      q.setFromAxisAngle(UP, Math.atan2(-dz, dx)); ps.set(x, heightAt(x, z), z); m.compose(ps, q, one);
      for (const im of meshes) im.setMatrixAt(i, m);
      gridAdd({ kind: 'tree', x, z, r: 0.15, fall: { parts: meshes.map(im => [im, i, m.clone()]), base: ps.clone() } }, x - 1, z - 1, x + 1, z + 1);
    });
    for (const im of meshes) { im.castShadow = true; scene.add(im); }
  };
  // slim grey pole, short arm, small LED head (as on Establish Avenue, Street View Sep 2025)
  const poleG = new THREE.CylinderGeometry(0.065, 0.1, 8, 8); poleG.translate(0, 4, 0);
  const armG = new THREE.BoxGeometry(0.9, 0.06, 0.06); armG.translate(0.45, 7.85, 0);
  const headG = new THREE.CylinderGeometry(0.16, 0.2, 0.12, 12); headG.translate(0.9, 7.82, 0);
  const lampMetal = new THREE.MeshLambertMaterial({ color: 0x8b8f93 });
  plant(spots, [[poleG, lampMetal], [armG, lampMetal], [headG, new THREE.MeshLambertMaterial({ color: 0x55585c, emissive: 0x222222 })]]);
  // black lantern post: wider base, 5.6 m pole, a half-circle "shepherd's crook" arm, a hanging six-sided lantern
  const LH = 5.6, LR = 0.45, black = new THREE.MeshLambertMaterial({ color: 0x1c1d1f });
  const lBaseG = new THREE.CylinderGeometry(0.15, 0.21, 0.9, 8); lBaseG.translate(0, 0.45, 0);
  const lPoleG = new THREE.CylinderGeometry(0.055, 0.085, LH, 8); lPoleG.translate(0, LH / 2, 0);
  const lArmG = new THREE.TorusGeometry(LR, 0.03, 6, 14, Math.PI); lArmG.translate(LR, LH, 0);
  const lCapG = new THREE.ConeGeometry(0.27, 0.24, 6); lCapG.translate(2 * LR, LH - 0.15, 0);
  const lGlassG = new THREE.CylinderGeometry(0.2, 0.13, 0.45, 6); lGlassG.translate(2 * LR, LH - 0.495, 0);
  const lTipG = new THREE.ConeGeometry(0.06, 0.16, 6); lTipG.rotateX(Math.PI); lTipG.translate(2 * LR, LH - 0.8, 0);
  plant(lanterns, [[lBaseG, black], [lPoleG, black], [lArmG, black], [lCapG, black], [lTipG, black],
    [lGlassG, new THREE.MeshLambertMaterial({ color: 0xf3ead2, emissive: 0x5a5140 })]]);
  window.__lamps = { led: spots.length, lantern: lanterns.length, lanternAt: lanterns.slice(0, 5) };   // for testing

  (window.__loadT = window.__loadT || []).push(['furn:lights', Math.round(performance.now())]);   // section timing (?debug)
  // painted stop bars (white, 45 cm) across the approach lane
  const barB = makeBuilder(), white = new THREE.Color(0xf4f4f0);
  const stopBar = (x, z, dx, dz, w, ow) => {   // ow: one-way carriageway, the bar spans the whole width
    const rx = -dz, rz = dx, a = ow ? -w / 2 + 0.45 : 0.15, b = w / 2 - 0.45, t = 0.45;
    quadUp(barB, [x + rx * a, 0.135, z + rz * a], [x + rx * b, 0.135, z + rz * b], [x + rx * b + dx * t, 0.135, z + rz * b + dz * t], [x + rx * a + dx * t, 0.135, z + rz * a + dz * t], white, UV0, UV0, UV0, UV0);
  };

  // R61 loop 2 round 3: white lane arrows before each traffic light, 6 m and 30 m back from the stop line, one per lane
  // on the approach half of the road (lane count from the width, ~3.5 m lanes). With 2+ lanes: left lane turns left,
  // right lane goes straight or right, others straight; one lane: straight-left-right is left unpainted (as usual).
  // INFERRED: which turns each lane allows (OSM turn:lanes is not in the data); check intersection by intersection.
  let arrowCount = 0, oneWayApproaches = 0;
  const arrow = (cx, cz, fx, fz, kind) => {   // kind: 's' straight, 'l' left, 'sr' straight + right
    const rx = -fz, rz = fx, P = (r, f) => [cx + rx * r + fx * f, 0.137, cz + rz * r + fz * f];
    const quad = (r0, f0, r1, f1) => quadUp(barB, P(r0, f0), P(r1, f0), P(r1, f1), P(r0, f1), white, UV0, UV0, UV0, UV0);
    const tri = (a, b, c) => pushTri(barB, P(...a), P(...b), P(...c), [0, 1, 0], white);
    if (kind === 's' || kind === 'sr') { quad(-0.08, -2.6, 0.08, 0.6); tri([-0.45, 0.6], [0.45, 0.6], [0, 1.9]); }
    if (kind === 'sr') { quad(0.08, -0.6, 0.75, -0.45); tri([0.75, -0.95], [0.75, -0.1], [1.25, -0.52]); }
    if (kind === 'l') { quad(-0.08, -2.6, 0.08, -0.2); quad(-0.8, -0.35, 0.08, -0.2); tri([-0.8, -0.75], [-0.8, 0.2], [-1.35, -0.27]); }
    arrowCount++;
  };
  // is this approach on a one-way carriageway (a divided road's half)? then the whole width is the approach (R61 r10)
  const oneWayAt = (x, z, dx, dz) => {
    const px = x - dx * 8, pz = z - dz * 8; let best = null, bd = 1e9;
    for (const it of gridNear(px, pz)) {
      if (it.kind !== 'road') continue; const sg = it.seg, ex = sg.x2 - sg.x1, ez = sg.z2 - sg.z1, L2 = ex * ex + ez * ez || 1;
      const t = Math.max(0, Math.min(1, ((px - sg.x1) * ex + (pz - sg.z1) * ez) / L2)), d = Math.hypot(px - sg.x1 - t * ex, pz - sg.z1 - t * ez);
      if (d < bd) { bd = d; best = sg; }
    }
    return !!(best && best.road && best.road.ow && bd < best.w / 2 + 1);
  };
  const laneArrows = (x, z, dx, dz, w, ow) => {
    const half = ow ? w : w / 2, lanes = Math.max(1, Math.round(half / 3.5)), lw = half / lanes, o0 = ow ? -w / 2 : 0;
    if (lanes < 2) return;
    for (let k = 0; k < lanes; k++) {
      const o = o0 + lw * (k + 0.5), kind = k === 0 ? 'l' : k === lanes - 1 ? 'sr' : 's';
      for (const back of [6, 30]) arrow(x - dx * back - dz * o, z - dz * back + dx * o, dx, dz, kind);
    }
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
  const stopPosts = [];   // so the street-name blades can share the post at the same corner (R59 round 4)
  for (const [x, z, dx, dz, w, all] of stops) {
    stopBar(x, z, dx, dz, w);
    const sx = x + -dz * (w / 2 + 0.9), sz = z + dx * (w / 2 + 0.9);
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 6), metal); post.position.y = 1.3; g.add(post);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), signMat); face.position.set(0, 2.45, 0.04); g.add(face);
    if (all) { const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), tabMat); tab.position.set(0, 1.92, 0.04); g.add(tab); }
    place(g, sx, sz, yawTo(-dx, -dz)); stopPosts.push({ g, x: sx, z: sz, used: false });
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
    const done = []; let bladesOnStops = 0;
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
      // a stop sign at this corner carries the blades on top of its own post, as in Ottawa (Street View, Establish /
      // Gerry Lalonde); otherwise the blades get a post of their own
      let host = null;
      for (const sp of stopPosts) if (!sp.used && Math.hypot(sp.x - p[0], sp.z - p[1]) < 16 && (!host || Math.hypot(sp.x - p[0], sp.z - p[1]) < Math.hypot(host.x - p[0], host.z - p[1]))) host = sp;
      const g = host ? host.g : new THREE.Group(), yaw0 = host ? host.g.rotation.y : 0;
      if (host) { host.used = true; bladesOnStops++;
        const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 6), metal); ext.position.y = 3.05; ext.castShadow = true; g.add(ext);
      } else { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6), metal); post.position.y = 1.75; g.add(post); }
      [[A, na, 3.05], [B, nb, 3.4]].forEach(([d, name, y]) => {
        for (const back of [0, Math.PI]) {   // two faces back-to-back so the name reads from both directions
          const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), bladeMat(name));
          m.position.y = y; m.rotation.y = Math.atan2(-d.dz, d.dx) + back - yaw0; m.castShadow = true; g.add(m);
        }
      });
      if (!host) place(g, spot[0], spot[1], 0, 0.12);
    }
    window.__nameSigns = { onStopPosts: bladesOnStops, total: done.length };   // for testing
  }

  (window.__loadT = window.__loadT || []).push(['furn:signs', Math.round(performance.now())]);   // section timing (?debug)
  // traffic signals: pole on the right, mast arm over the lanes, 3-lamp heads facing the approaching driver
  const lampGeo = new THREE.CircleGeometry(0.1, 14);
  for (const k of ['A', 'B']) for (const c of ['r', 'y', 'g']) signalMats[k][c] = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const headM = new THREE.MeshLambertMaterial({ color: 0x1b1c1e });
  for (const sig of F.signals) for (const [x, z, dx, dz, w] of sig.lines) {
    const ow = oneWayAt(x, z, dx, dz); if (ow) oneWayApproaches++;
    stopBar(x, z, dx, dz, w, ow);
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
    laneArrows(x, z, dx, dz, w, ow);
  }
  finish(barB, flatMat(4), { drape: true });
  window.__arrows = { arrows: arrowCount, oneWayApproaches };   // for testing

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
  // hydro transmission towers. R59 round 5: from OpenStreetMap (power=tower, tools/fetch_power.py) with the wires along
  // each mapped power line. The lidar's tall points (>28 m) turned out to be mostly the wires themselves, which drew a
  // "forest" of towers ~25 m apart; they are only the fallback now when no OSM towers are in the data.
  {
    let towers = [];
    const lidarTop = (x, z) => { let h = 0; if (LD) for (const t of LD.trees) if (Math.abs(t[0] - x) < 12 && Math.abs(t[1] - z) < 12 && t[2] > h) h = t[2]; return h; };
    if (F.towers && F.towers.length) {
      for (const [x, z, h] of F.towers) { const lh = lidarTop(x, z); towers.push([x, z, h > 0 ? h : lh > 25 && lh < 55 ? lh : 36]); }
    } else if (LD) {
      for (const [x, z, h] of LD.trees) if (h > 28) {
        const t = towers.find(t => Math.hypot(t[0] - x, t[1] - z) < 18);
        if (t) { if (h > t[2]) { t[0] = x; t[1] = z; t[2] = h; } } else towers.push([x, z, h]);
      }
    }
    const lines = (F.powerlines || []);
    // line direction at each tower: average of the directions to its neighbours along the mapped line
    const dirAt = (x, z) => {
      let dx = 0, dz = 0;
      for (const l of lines) l.forEach((p, i) => {
        if (Math.hypot(p[0] - x, p[1] - z) > 1.5) return;
        for (const j of [i - 1, i + 1]) if (l[j]) { const ex = (l[j][0] - p[0]) * (j > i ? 1 : -1), ez = (l[j][1] - p[1]) * (j > i ? 1 : -1), L = Math.hypot(ex, ez) || 1; dx += ex / L; dz += ez / L; }
      });
      return dx || dz ? [dx, dz] : null;
    };
    const steel = new THREE.MeshLambertMaterial({ color: 0x9a9ea2 });
    const beam = (g, a, b, w = 0.18) => {   // thin box from point a to point b
      const d = new THREE.Vector3().subVectors(b, a), len = d.length();
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), steel);
      m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); g.add(m);
    };
    const towerTops = [];
    for (const [x, z, h] of towers) {
      const d = dirAt(x, z);
      const other = d ? null : towers.filter(t => t[0] !== x || t[1] !== z).sort((a, b) => Math.hypot(a[0] - x, a[1] - z) - Math.hypot(b[0] - x, b[1] - z))[0];
      const yaw = d ? Math.atan2(d[0], d[1]) : other ? Math.atan2(other[0] - x, other[1] - z) : 0;
      const g = new THREE.Group(), V = (a, y, b) => new THREE.Vector3(a, y, b);
      // towers of parallel lines stand only ~8 m apart: narrower arms so they don't overlap
      const nd = Math.min(...towers.filter(t => t[0] !== x || t[1] !== z).map(t => Math.hypot(t[0] - x, t[1] - z)), 99);
      const k = Math.min(1, nd * 0.45 / 7);
      const base = 3.2 * Math.max(0.6, k), top = 0.9, H = h * 0.82;
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
      for (const [y, w] of [[H * 0.78, 7 * k], [H, 5.5 * k]]) beam(g, V(-w, y, 0), V(w, y, 0), 0.3);   // cross arms
      beam(g, V(0, H, 0), V(0, h, 0), 0.2);   // peak (ground wire)
      place(g, x, z, yaw, 2.5, true);   // towers are solid steel: you crash
      towerTops.push({ x, z, yaw, H, k, y0: heightAt(x, z), peak: h });
    }
    // wires: 4 conductors (both cross-arm ends) and the ground wire on the peak between towers that follow each other
    // on a mapped line, sagging about 3% of the span. INFERRED: wire count and sag (typical double-circuit line).
    const pts = []; let spans = 0;
    const local = (t, lx, y) => [t.x + Math.cos(t.yaw) * lx, t.y0 + y, t.z - Math.sin(t.yaw) * lx];
    const towerAt = (p) => towerTops.find(t => Math.hypot(t.x - p[0], t.z - p[1]) < 1.5);
    for (const l of lines) for (let i = 0; i + 1 < l.length; i++) {
      const A = towerAt(l[i]), B = towerAt(l[i + 1]); if (!A || !B) continue;
      const span = Math.hypot(B.x - A.x, B.z - A.z), sag = span * 0.03; spans++;
      for (const [lx, which] of [[7, 'low'], [-7, 'low'], [5.5, 'high'], [-5.5, 'high'], [0, 'peak']]) {
        const yOf = t => which === 'peak' ? t.peak : which === 'high' ? t.H : t.H * 0.78;
        const a = local(A, lx * A.k, yOf(A));
        // the matching hook on B: the same arm, on whichever side is nearer (so wires don't cross)
        const c1 = local(B, lx * B.k, yOf(B)), c2 = local(B, -lx * B.k, yOf(B));
        const b = Math.hypot(c1[0] - a[0], c1[2] - a[2]) <= Math.hypot(c2[0] - a[0], c2[2] - a[2]) ? c1 : c2;
        const N = 20; let prev = a;
        for (let k = 1; k <= N; k++) {
          const t = k / N, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t), a[2] + (b[2] - a[2]) * t];
          pts.push(prev[0], prev[1], prev[2], q[0], q[1], q[2]); prev = q;
        }
      }
    }
    if (pts.length) {
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      scene.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x3a3c3f })));
    }
    window.__wires = { towers: towerTops.length, spans, fromOSM: !!(F.towers && F.towers.length) };   // for testing

    // minor power lines (OSM power=minor_line, R59 round 6): a wooden pole at every mapped point, a cross arm, three
    // wires with 1.5% sag. INFERRED: 11 m cedar poles with a 2.4 m arm, the usual Hydro Ottawa distribution pole.
    const minor = F.minorlines || [], poles = [];
    const mpts = [];
    for (const l of minor) {
      const ps = l.map(([x, z], i) => {
        const a = l[Math.max(0, i - 1)], b = l[Math.min(l.length - 1, i + 1)], yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
        const P = { x, z, yaw, y0: heightAt(x, z), ok: !inBuilding(x, z, 0.5) && !onOtherRoad(x, z, null, 0.3) };
        if (P.ok) poles.push(P); return P;
      });
      for (let i = 0; i + 1 < ps.length; i++) {
        const A = ps[i], B = ps[i + 1], span = Math.hypot(B.x - A.x, B.z - A.z); if (span > 120) continue;
        for (const lx of [-1.1, 0, 1.1]) {
          const y = lx === 0 ? 11.2 : 10.4;
          const a = [A.x + Math.cos(A.yaw) * lx, A.y0 + y, A.z - Math.sin(A.yaw) * lx], b = [B.x + Math.cos(B.yaw) * lx, B.y0 + y, B.z - Math.sin(B.yaw) * lx];
          const N = 10; let prev = a;
          for (let k = 1; k <= N; k++) { const t = k / N, q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 4 * span * 0.015 * t * (1 - t), a[2] + (b[2] - a[2]) * t]; mpts.push(...prev, ...q); prev = q; }
        }
      }
    }
    if (poles.length) {
      const wood = new THREE.MeshLambertMaterial({ color: 0x6b5641 });
      const poleG2 = new THREE.CylinderGeometry(0.12, 0.16, 11.4, 7); poleG2.translate(0, 5.7, 0);
      const armG2 = new THREE.BoxGeometry(2.4, 0.1, 0.1); armG2.translate(0, 10.3, 0);
      const insG = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6);
      const ins = [[-1.1, 10.45], [1.1, 10.45]].map(([x, y]) => insG.clone().translate(x, y, 0));
      const insMat = new THREE.MeshLambertMaterial({ color: 0xd9d6cc });
      const parts = [[poleG2, wood], [armG2, wood], [ins[0], insMat], [ins[1], insMat]];
      const ims = parts.map(([g, mt]) => new THREE.InstancedMesh(g, mt, poles.length));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3();
      poles.forEach((P, i) => {
        q.setFromAxisAngle(UP, P.yaw); ps.set(P.x, P.y0, P.z); m.compose(ps, q, one);
        for (const im of ims) im.setMatrixAt(i, m);
        gridAdd({ kind: 'tree', x: P.x, z: P.z, r: 0.2, fall: { parts: ims.map(im => [im, i, m.clone()]), base: ps.clone() } }, P.x - 1, P.z - 1, P.x + 1, P.z + 1);
      });
      for (const im of ims) { im.castShadow = true; scene.add(im); }
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mpts, 3));
      scene.add(new THREE.LineSegments(mg, new THREE.LineBasicMaterial({ color: 0x2e2f31 })));
    }
    window.__wires.minorPoles = poles.length; window.__wires.minorAt = poles.slice(0, 3).map(p => [p.x, p.z]);
  }
  (window.__loadT = window.__loadT || []).push(['furn:mail+lines', Math.round(performance.now())]);   // section timing (?debug)
  // R60 loop round 1: fire hydrants and pad-mounted transformers along the residential streets (Street View cues).
  // INFERRED: OSM maps neither here. Hydrants about every 110 m, alternating sides, ~1 m behind the curb (City of
  // Ottawa spacing for residential streets is typically 90-150 m); colour red with a yellow bonnet (check on Street
  // View). Transformers: one green pad-mount box about every 90 m on the other side, in the front-yard strip ~4.5 m
  // behind the curb. Spots on driveways, roads or buildings are skipped.
  {
    const inDriveway = (x, z) => drivewayQuads.some(q => pointInPoly(x, z, q));
    const free = (x, z) => !inBuilding(x, z, 0.8) && !onOtherRoad(x, z, null, 0.3) && !inDriveway(x, z)
      && ![...gridNear(x, z)].some(it => it.kind === 'tree' && Math.hypot(it.x - x, it.z - z) < 1.2);
    const hyd = [], trf = [];
    for (const r of M.roads) {
      if (!['residential', 'living_street', 'unclassified'].includes(r.t) || r.p.length < 2) continue;
      let acc = 40 + (hashStr(r.n || String(r.p[0][0])) % 50), side = 1, acc2 = 70;
      for (let i = 0; i + 1 < r.p.length; i++) {
        const a = r.p[i], b = r.p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
        for (let t = 0; t < L; t += 2) {
          acc += 2; acc2 += 2;
          if (acc >= 110) {
            const x = a[0] + ux * t + nx * side * (r.w / 2 + 1.0), z = a[1] + uz * t + nz * side * (r.w / 2 + 1.0);
            if (free(x, z)) { hyd.push([x, z, Math.atan2(ux, uz)]); acc = 0; side = -side; }
          }
          if (acc2 >= 90) {
            const x = a[0] + ux * t - nx * side * (r.w / 2 + 4.5), z = a[1] + uz * t - nz * side * (r.w / 2 + 4.5);
            if (free(x, z)) { trf.push([x, z, Math.atan2(ux, uz)]); acc2 = 0; }
          }
        }
      }
    }
    const inst = (list, parts, r, solid) => {
      const ims = parts.map(([g, mt]) => new THREE.InstancedMesh(g, mt, list.length));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3();
      list.forEach(([x, z, yaw], i) => {
        q.setFromAxisAngle(UP, yaw); ps.set(x, heightAt(x, z), z); m.compose(ps, q, one);
        for (const im of ims) im.setMatrixAt(i, m);
        gridAdd({ kind: 'tree', x, z, r, fall: solid ? null : { parts: ims.map(im => [im, i, m.clone()]), base: ps.clone() } }, x - 1, z - 1, x + 1, z + 1);
      });
      for (const im of ims) { im.castShadow = true; scene.add(im); }
    };
    const red = new THREE.MeshLambertMaterial({ color: 0xb3261e }), yellow = new THREE.MeshLambertMaterial({ color: 0xe0b324 });
    const hBody = new THREE.CylinderGeometry(0.13, 0.15, 0.62, 10); hBody.translate(0, 0.31, 0);
    const hTop = new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); hTop.translate(0, 0.62, 0);
    const hNut = new THREE.CylinderGeometry(0.035, 0.035, 0.08, 5); hNut.translate(0, 0.79, 0);
    const hSide = new THREE.CylinderGeometry(0.055, 0.055, 0.46, 8); hSide.rotateZ(Math.PI / 2); hSide.translate(0, 0.45, 0);
    const hFront = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8); hFront.rotateX(Math.PI / 2); hFront.translate(0, 0.42, 0.14);
    inst(hyd, [[hBody, red], [hTop, yellow], [hNut, yellow], [hSide, yellow], [hFront, yellow]], 0.18, false);
    const green = new THREE.MeshLambertMaterial({ color: 0x4f6b4a }), pad = new THREE.MeshLambertMaterial({ color: 0xa9a7a1 });
    const tBox = new THREE.BoxGeometry(1.15, 1.0, 0.95); tBox.translate(0, 0.62, 0);
    const tPad = new THREE.BoxGeometry(1.45, 0.12, 1.25); tPad.translate(0, 0.06, 0);
    inst(trf, [[tBox, green], [tPad, pad]], 0.7, true);
    window.__streetBits = { hydrants: hyd.length, transformers: trf.length, hydAt: hyd.slice(0, 3) };   // for testing
  }
  (window.__loadT = window.__loadT || []).push(['furn:towers', Math.round(performance.now())]);   // section timing (?debug)
  // R61 loop 2 round 5: fences, hedges, walls and guard rails mapped in OpenStreetMap (tools/fetch_barriers.py).
  // Wood privacy fence 1.8 m with posts every 2.4 m (chain link: grey see-through mesh 1.5 m), hedge 1.4 m tall and
  // 0.9 m thick, concrete wall 1 m, guard rail 0.75 m. A mapped height wins. All solid (the car stops at them).
  // INFERRED: heights and looks when OSM has no tag (typical Ottawa backyard / park fences).
  {
    const bars = F.barriers || [];
    const woodB = makeBuilder(), meshB = makeBuilder(), hedgeB = makeBuilder(), wallB = makeBuilder();
    const WOOD = new THREE.Color(0x8d7b62), POSTC = new THREE.Color(0x6e5f4b), MESH = new THREE.Color(0x8a8f94), HEDGE = new THREE.Color(0x3f6b33);
    const CONC = new THREE.Color(0xb3b0a8), RAIL = new THREE.Color(0xa7acb1);
    const slab = (B, a, b, y0, y1, t, col) => {   // a thin upright box along a-b, t thick
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * t / 2, nz = dx / L * t / 2;
      const A = [a[0] + nx, a[1] + nz], Bq = [b[0] + nx, b[1] + nz], C = [b[0] - nx, b[1] - nz], D = [a[0] - nx, a[1] - nz];
      wallQuad(B, A, Bq, y0, y1, [nx / (t / 2), 0, nz / (t / 2)], col, 0, 0);
      wallQuad(B, C, D, y0, y1, [-nx / (t / 2), 0, -nz / (t / 2)], col.clone().multiplyScalar(0.9), 0, 0);
      flatQuad(B, A, Bq, C, D, y1, col.clone().multiplyScalar(1.05));
    };
    let segs = 0;
    for (const b of bars) {
      const kind = b.k === 'fence' && /chain|mesh|wire|metal/.test(b.f || '') ? 'mesh' : b.k;
      const H = b.h > 0 ? Math.min(b.h, 4) : { fence: 1.8, mesh: 1.5, hedge: 1.4, wall: 1.0, retaining_wall: 0.9, guard_rail: 0.75, city_wall: 2 }[kind] || 1.2;
      for (let i = 0; i + 1 < b.p.length; i++) {
        const a = b.p[i], c = b.p[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 0.2) continue;
        if (onOtherRoad((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, null, -0.5)) continue;   // never across a carriageway
        if (kind === 'hedge') slab(hedgeB, a, c, 0, H, 0.9, HEDGE);
        else if (kind === 'mesh') slab(meshB, a, c, 0.05, H, 0.03, MESH);
        else if (kind === 'fence') slab(woodB, a, c, 0.05, H, 0.04, WOOD);
        else if (kind === 'guard_rail') slab(wallB, a, c, 0.45, H, 0.08, RAIL);
        else slab(wallB, a, c, 0, H, 0.25, CONC);
        if (kind === 'fence' || kind === 'mesh' || kind === 'guard_rail') {   // posts
          const n = Math.max(1, Math.round(L / 2.4));
          for (let k = 0; k <= n; k++) {
            const x = a[0] + (c[0] - a[0]) * k / n, z = a[1] + (c[1] - a[1]) * k / n, ux = (c[0] - a[0]) / L * 0.06, uz = (c[1] - a[1]) / L * 0.06;
            slab(kind === 'fence' ? woodB : wallB, [x - ux, z - uz], [x + ux, z + uz], 0, H + 0.08, 0.12, kind === 'fence' ? POSTC : RAIL);
          }
        }
        gridAdd({ kind: 'wall', x1: a[0], z1: a[1], x2: c[0], z2: c[1] }, Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1]));
        segs++;
      }
    }
    const lam = o => new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true, side: THREE.DoubleSide }, o));
    finish(woodB, lam({}), { drape: true, cast: true });
    finish(hedgeB, lam({}), { drape: true, cast: true });
    finish(wallB, lam({}), { drape: true, cast: true });
    finish(meshB, lam({ transparent: true, opacity: 0.45, depthWrite: false }), { drape: true });
    window.__barriers = { lines: bars.length, segments: segs, first: bars.slice(0, 3).map(b => [b.k, b.p[0]]) };   // for testing
  }
  (window.__loadT = window.__loadT || []).push(['furn:fences', Math.round(performance.now())]);   // section timing (?debug)
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
