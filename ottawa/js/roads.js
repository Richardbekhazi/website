// Street Test - roads.js: roads, sidewalks, curbs, markings, crosswalks.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

// ---------- roads ----------
// widths come from OpenStreetMap "width" tags where mappers measured them; markings follow Ontario practice
// (yellow centre line, white edge lines on arterials, no paint on quiet residential streets)
const CAR_ROADS = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'service', 'track']);

// smooth the bends: OSM stores curves as straight pieces. Chaikin corner-cutting, but never moving
// a road's ends or any point shared with another road (so junctions stay exactly where they are).
{
  const key = p => Math.round(p[0] * 4) + ',' + Math.round(p[1] * 4);
  const uses = new Map();
  for (const r of M.roads) for (const p of r.p) uses.set(key(p), (uses.get(key(p)) || 0) + 1);
  for (const r of M.roads) {
    if (r.f === 'crossing' || r.p.length < 3) continue;
    const fixed = r.p.map((p, i) => i === 0 || i === r.p.length - 1 || uses.get(key(p)) > 1);
    let pts = r.p.map((p, i) => ({ p, fixed: fixed[i] }));
    for (let it = 0; it < 3; it++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i].p, b = pts[i + 1].p, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 1.5) { out.push(pts[i + 1]); continue; }
        const f = Math.min(0.25, 6 / L);   // cut at most 6 m into each straight piece
        if (!pts[i].fixed || i > 0) out.push({ p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], fixed: false });
        out.push({ p: [a[0] + (b[0] - a[0]) * (1 - f), a[1] + (b[1] - a[1]) * (1 - f)], fixed: false });
        if (pts[i + 1].fixed) out.push(pts[i + 1]);
      }
      // drop the original corner points that were cut (non-fixed), keep fixed ones
      pts = out.filter((q, i) => i === 0 || q.p !== out[i - 1].p);
    }
    r.p = pts.map(q => q.p);
  }
}
const CURBED = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street']);
const ARTERIAL = new Set(['primary', 'secondary', 'tertiary']);
const ROAD_Y = { footway: 0.1, path: 0.1, cycleway: 0.1, steps: 0.1, pedestrian: 0.1, track: 0.1, service: 0.11 };
// one asphalt colour for every drivable road, so intersections don't show patches (R19); tracks stay gravel
const ASPHALT = { track: 0xa68a62 };
// photo asphalt (ambientCG Asphalt031, CC0): 8 m per texture, the photo repeated 2 x 2 (4 m each); drawn fallback without it
const texAsphalt = photoTex('asphalt', 1024, 1024, (g, w, h, img) => {
  g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, w, h);
  if (img) tileImage(g, img, w, h, 2, 2);
  else for (let i = 0; i < 36000; i++) { const v = 170 + Math.floor(Math.random() * 85); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  let sd = 5; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 18; k++) { const x = r() * w, y = r() * h, rad = 80 + r() * 200;   // worn / patched areas
    const pg = g.createRadialGradient(x, y, 0, x, y, rad); const v = r() < 0.6 ? '255,255,255' : '90,90,90';
    pg.addColorStop(0, `rgba(${v},0.12)`); pg.addColorStop(1, `rgba(${v},0)`); g.fillStyle = pg; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
  g.scale(4, 4);
  g.strokeStyle = 'rgba(40,40,40,0.25)'; g.lineWidth = 1.2;   // a few cracks / sealed joints
  for (let i = 0; i < 5; i++) { g.beginPath(); let x = Math.random() * w / 4, y = Math.random() * h / 4; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
});
// one sidewalk slab (1.8 m x 1.5 m) per texture: photo concrete (ambientCG Concrete034, CC0) + the joint line
const texConcrete = photoTex('concrete', 256, 256, (g, w, h, img) => {
  g.fillStyle = '#f2f2f0'; g.fillRect(0, 0, w, h);
  if (img) g.drawImage(img, 0, 0, img.width * 0.55, img.height * 0.55, 0, 0, w, h);
  else for (let i = 0; i < 6400; i++) { const v = 215 + Math.floor(Math.random() * 40); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, w, 5);   // joint between slabs
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, 5, w, 2);
});
const roadB = makeBuilder(), walkB = makeBuilder(), lineB = makeBuilder(), curbB = makeBuilder();
const roadSegs = [];
const lampSpots = [];
const curbPieces = [];      // built after the houses, so curbs can drop at driveways
const drivewayQuads = [];
const yellow = new THREE.Color(0xf2c12e), white = new THREE.Color(0xf4f4f0), curbCol = new THREE.Color(0xaeaca6);

// pass 1: every drivable segment goes in the collision / lookup grid first, so pass 2 can clip curbs and paint at junctions
for (const r of M.roads) {
  if (!CAR_ROADS.has(r.t)) continue;
  for (let i = 0; i < r.p.length - 1; i++) {
    const [x1, z1] = r.p[i], [x2, z2] = r.p[i+1], hw = r.w / 2;
    if (Math.hypot(x2 - x1, z2 - z1) < 0.01) continue;
    const seg = { x1, z1, x2, z2, w: r.w, n: r.n, t: r.t, road: r };
    roadSegs.push(seg);
    gridAdd({ kind: 'road', seg }, Math.min(x1, x2) - hw, Math.min(z1, z2) - hw, Math.max(x1, x2) + hw, Math.max(z1, z2) + hw);
  }
}
// is this point on the surface of some other drivable road?
function onOtherRoad(x, z, self, margin = 0.05) {
  for (const it of gridNear(x, z)) {
    if (it.kind !== 'road' || it.seg.road === self || it.seg.t === 'track') continue; const s = it.seg;
    const dx = s.x2-s.x1, dz = s.z2-s.z1, L2 = dx*dx + dz*dz || 1;
    const t = Math.max(0, Math.min(1, ((x-s.x1)*dx + (z-s.z1)*dz) / L2));
    if (Math.hypot(x - (s.x1 + t*dx), z - (s.z1 + t*dz)) < s.w / 2 - margin) return true;
  }
  return false;
}
function quadUp(B, a, b, c, d, color, ua, ub, uc, ud) {
  pushTri(B, a, b, c, [0,1,0], color, ua, ub, uc); pushTri(B, a, c, d, [0,1,0], color, ua, uc, ud);
}
// painted line along a segment: offset sideways from centre, solid or dashed, clipped at junctions
function paintLine(r, x1, z1, x2, z2, y, offset, width, color, dash, gap) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz, pz = ux;
  const step = dash ? dash + gap : 2;
  for (let s = 0; s < L; s += step) {
    const e = Math.min(s + (dash || 2), L);
    const cx = x1 + ux * (s + e) / 2 + px * offset, cz = z1 + uz * (s + e) / 2 + pz * offset;
    if (onOtherRoad(cx, cz, r, -0.3)) continue;
    const o1 = offset - width / 2, o2 = offset + width / 2;
    const P = (d, o) => [x1 + ux * d + px * o, y, z1 + uz * d + pz * o];
    quadUp(lineB, P(s, o1), P(e, o1), P(e, o2), P(s, o2), color, UV0, UV0, UV0, UV0);
  }
}

// pass 2: geometry
const jkey = p => Math.round(p[0] * 4) + ',' + Math.round(p[1] * 4), jointUse = new Map();   // how many roads use each point
for (const r of M.roads) for (const p of r.p) jointUse.set(jkey(p), (jointUse.get(jkey(p)) || 0) + 1);
for (const r of M.roads) {
  const isCar = CAR_ROADS.has(r.t), hw = r.w / 2;
  const y = ROAD_Y[r.t] ?? 0.12;
  // crosswalks: paint on the road instead of a concrete strip
  if (r.f === 'crossing') {
    if (r.cm === 'no' || r.cm === 'surface') continue;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i+1], dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); if (L < 0.5) continue;
      const ux = dx / L, uz = dz / L, px = -uz, pz = ux, half = 1.5, yy = 0.135;
      const P = (d, o) => [x1 + ux * d + px * o, yy, z1 + uz * d + pz * o];
      if (r.cm === 'lines') {
        for (const o of [-half, half - 0.2]) quadUp(lineB, P(0, o), P(L, o), P(L, o + 0.2), P(0, o + 0.2), white, UV0, UV0, UV0, UV0);
      } else {
        for (let s = 0.3; s < L - 0.3; s += 1.0) quadUp(lineB, P(s, -half), P(s + 0.5, -half), P(s + 0.5, half), P(s, half), white, UV0, UV0, UV0, UV0);
        if (r.cm && r.cm.startsWith('ladder')) for (const o of [-half, half - 0.15]) quadUp(lineB, P(0, o), P(L, o), P(L, o + 0.15), P(0, o + 0.15), white, UV0, UV0, UV0, UV0);
      }
    }
    continue;
  }
  const B = isCar && r.t !== 'track' ? roadB : walkB;
  const col = isCar ? new THREE.Color(ASPHALT[r.t] ?? 0x55575a) : new THREE.Color(r.t === 'path' ? 0xb9ae95 : 0xbdbab3);
  let dist = 0;
  for (let i = 0; i < r.p.length - 1; i++) {
    const [x1, z1] = r.p[i], [x2, z2] = r.p[i+1];
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); if (L < 0.01) continue;
    const ux = dx / L, uz = dz / L, nx = -uz * hw, nz = ux * hw;
    const A = [x1+nx, y, z1+nz], Bp = [x1-nx, y, z1-nz], C = [x2-nx, y, z2-nz], D = [x2+nx, y, z2+nz];
    if (B === roadB) { // asphalt: texture in world coordinates so it tiles seamlessly
      const W = p => [p[0] / 8, p[2] / 8];
      quadUp(B, A, Bp, C, D, col, W(A), W(Bp), W(C), W(D));
    } else {        // sidewalk slabs every 1.5 m
      const s0 = dist / 1.5, s1 = (dist + L) / 1.5;
      quadUp(B, A, Bp, C, D, col, [0, s0], [1, s0], [1, s1], [0, s1]);
    }
    dist += L;

    // curbs on both sides, cut where another road joins
    if (CURBED.has(r.t)) {
      const pieces = Math.ceil(L / 2.5);
      for (const side of [1, -1]) {
        for (let k = 0; k < pieces; k++) {
          const s = k / pieces * L, e = (k + 1) / pieces * L, m = (s + e) / 2;
          const ex = x1 + ux * m + nx * side * 1.06, ez = z1 + uz * m + nz * side * 1.06;
          if (onOtherRoad(ex, ez, r, 0.05)) continue;
          curbPieces.push({ x1, z1, ux, uz, px: nx * side / hw, pz: nz * side / hw, s, e, hw, y, t: r.t });
        }
      }
      // generated street lights only if the map has none mapped
      if (!(M.furniture && M.furniture.lamps.length)) for (let s = 12; s < L; s += 38) {
        const lx = x1 + ux * s + nx * (1 + 1.4 / hw), lz = z1 + uz * s + nz * (1 + 1.4 / hw);
        if (!onOtherRoad(lx, lz, r, -2)) lampSpots.push([lx, lz, -nx / hw, -nz / hw]);   // last two: direction toward the road
      }
    }
    // markings on arterial roads (street photos show Gerry Lalonde Drive with no painted lines, so it gets none)
    const UNPAINTED = new Set(['Gerry Lalonde Drive']);
    if (ARTERIAL.has(r.t) && !UNPAINTED.has(r.n)) {
      const lanes = parseInt(r.ln) || 2, ly = y + 0.012;
      if (r.ow) {
        for (let k = 1; k < lanes; k++) paintLine(r, x1, z1, x2, z2, ly, -hw + k * r.w / lanes, 0.12, white, 3, 6);
      } else if (lanes >= 3 || r.w >= 10.5) {
        paintLine(r, x1, z1, x2, z2, ly, -0.12, 0.1, yellow, 0, 0); paintLine(r, x1, z1, x2, z2, ly, 0.12, 0.1, yellow, 0, 0);
        if (lanes >= 4) for (const o of [-hw / 2, hw / 2]) paintLine(r, x1, z1, x2, z2, ly, o, 0.12, white, 3, 6);
      } else {
        paintLine(r, x1, z1, x2, z2, ly, 0, 0.12, yellow, 3, 6);
      }
      for (const o of [-hw + 0.35, hw - 0.35]) paintLine(r, x1, z1, x2, z2, ly, o, 0.12, white, 0, 0);
    }
  }
  // round joints so corners don't show gaps
  for (let i = 0; i < r.p.length; i++) {
    const [cx, cz] = r.p[i], N = 12;
    // speed (R52): a bend in the middle of a road only needs the two small wedges between its pieces (2 triangles,
    // not 12); road ends and junctions still get the full round patch
    if (i > 0 && i < r.p.length - 1 && (jointUse.get(jkey(r.p[i])) || 0) < 2) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i + 1], L1 = Math.hypot(cx - ax, cz - az) || 1, L2 = Math.hypot(bx - cx, bz - cz) || 1;
      const n1x = -(cz - az) / L1 * hw, n1z = (cx - ax) / L1 * hw, n2x = -(bz - cz) / L2 * hw, n2z = (bx - cx) / L2 * hw;
      for (const sg of [1, -1]) {
        const P1 = [cx, y, cz], P2 = [cx + n1x * sg, y, cz + n1z * sg], P3 = [cx + n2x * sg, y, cz + n2z * sg];
        if (B === roadB) pushTri(B, P1, P2, P3, [0,1,0], col, [P1[0]/8, P1[2]/8], [P2[0]/8, P2[2]/8], [P3[0]/8, P3[2]/8]);
        else pushTri(B, P1, P2, P3, [0,1,0], col);
      }
      continue;
    }
    for (let k = 0; k < N; k++) {
      const a1 = k / N * Math.PI * 2, a2 = (k + 1) / N * Math.PI * 2;
      const P1 = [cx, y, cz], P2 = [cx + Math.cos(a1)*hw, y, cz + Math.sin(a1)*hw], P3 = [cx + Math.cos(a2)*hw, y, cz + Math.sin(a2)*hw];
      if (B === roadB) pushTri(B, P1, P2, P3, [0,1,0], col, [P1[0]/8, P1[2]/8], [P2[0]/8, P2[2]/8], [P3[0]/8, P3[2]/8]);
      else pushTri(B, P1, P2, P3, [0,1,0], col);
    }
  }
}
finish(roadB, new THREE.MeshLambertMaterial({ vertexColors: true, map: texAsphalt, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }), { drape: true });
finish(walkB, new THREE.MeshLambertMaterial({ vertexColors: true, map: texConcrete, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -6 }), { drape: true });
finish(lineB, flatMat(3), { drape: true });
// curb + gutter: concrete gutter pan on the road edge, barrier curb behind it, dropped where a driveway crosses
function buildCurbs() {
  const gutter = new THREE.Color(0xb9b7b0);
  // driveways bucketed in 16 m cells, so each curb piece only checks the few driveways next to it
  const dw = new Map(), key = (i, j) => i + ',' + j;
  for (const q of drivewayQuads) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of q) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    for (let i = Math.floor(x0 / 16); i <= Math.floor(x1 / 16); i++) for (let j = Math.floor(z0 / 16); j <= Math.floor(z1 / 16); j++) {
      const k = key(i, j); if (!dw.has(k)) dw.set(k, []); dw.get(k).push(q);
    }
  }
  // speed (R52): the 2.5 m pieces are only for finding driveways; neighbouring pieces with the same drop are joined into
  // one long piece, so the 5 km world has ~5x fewer curb triangles
  const runs = [];
  for (const c of curbPieces) {
    const m = (c.s + c.e) / 2, ox = c.x1 + c.ux * m + c.px * (c.hw + 0.15), oz = c.z1 + c.uz * m + c.pz * (c.hw + 0.15);
    const dropped = (dw.get(key(Math.floor(ox / 16), Math.floor(oz / 16))) || []).some(q => pointInPoly(ox, oz, q));
    const last = runs[runs.length - 1];
    if (last && last.dropped === dropped && last.x1 === c.x1 && last.z1 === c.z1 && last.px === c.px && last.pz === c.pz && Math.abs(last.e - c.s) < 1e-6) last.e = c.e;
    else runs.push({ ...c, dropped });
  }
  for (const c of runs) {
    const { x1, z1, ux, uz, px, pz, s, e, hw, y, dropped } = c;
    const P = (d, off, yy) => [x1 + ux * d + px * off, yy, z1 + uz * d + pz * off];
    const inward = [-px, 0, -pz], outward = [px, 0, pz];
    if (c.t === 'residential' || c.t === 'living_street') {
      // new residential streets have a low rounded "roll-over" curb (seen on Street View): a gentle slope up, no gutter pan
      const top = dropped ? y + 0.03 : 0.24, slope = 0.35, wC = 0.2;
      const sn = [-px * 0.4, 0.92, -pz * 0.4];
      pushTri(curbB, P(s, hw - slope, y + 0.002), P(e, hw - slope, y + 0.002), P(e, hw, top), sn, curbCol.clone().multiplyScalar(0.92));
      pushTri(curbB, P(s, hw - slope, y + 0.002), P(e, hw, top), P(s, hw, top), sn, curbCol.clone().multiplyScalar(0.92));
      quadUp(curbB, P(s, hw, top), P(e, hw, top), P(e, hw + wC, top), P(s, hw + wC, top), curbCol, UV0, UV0, UV0, UV0);
      pushTri(curbB, P(s, hw + wC, top), P(e, hw + wC, top), P(e, hw + wC, 0), outward, curbCol.clone().multiplyScalar(0.8));
      pushTri(curbB, P(s, hw + wC, top), P(e, hw + wC, 0), P(s, hw + wC, 0), outward, curbCol.clone().multiplyScalar(0.8));
      continue;
    }
    const top = dropped ? y + 0.04 : 0.3, wC = 0.25, gw = 0.4;
    quadUp(curbB, P(s, hw - gw, y + 0.004), P(e, hw - gw, y + 0.004), P(e, hw, y + 0.004), P(s, hw, y + 0.004), gutter, UV0, UV0, UV0, UV0);
    pushTri(curbB, P(s, hw, y), P(e, hw, y), P(e, hw, top), inward, curbCol.clone().multiplyScalar(0.85));
    pushTri(curbB, P(s, hw, y), P(e, hw, top), P(s, hw, top), inward, curbCol.clone().multiplyScalar(0.85));
    quadUp(curbB, P(s, hw, top), P(e, hw, top), P(e, hw + wC, top), P(s, hw + wC, top), curbCol, UV0, UV0, UV0, UV0);
    pushTri(curbB, P(s, hw + wC, top), P(e, hw + wC, top), P(e, hw + wC, 0), outward, curbCol.clone().multiplyScalar(0.8));
    pushTri(curbB, P(s, hw + wC, top), P(e, hw + wC, 0), P(s, hw + wC, 0), outward, curbCol.clone().multiplyScalar(0.8));
  }
  finish(curbB, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2.5, polygonOffsetUnits: -10 }), { drape: true, cast: true });
}

(window.__loadT = window.__loadT || []).push(['roads', Math.round(performance.now())]);   // load timing (see ?debug)
