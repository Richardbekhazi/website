// Street Test - buildings.js: houses, apartments, shops: walls, roofs, Monterey fronts, entrances, plaques, apartment complex lot.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

// ---------- buildings ----------
// Establish Avenue is in Minto's Avalon community (opened 2024): mostly 2-storey townhome rows, each unit with a
// single-car garage, fronts mixing brick or stone with siding. Exact colours per house are not in the map data,
// so each row gets one consistent design and units vary between a few "elevations", like a real builder's row.
// one tile = one window bay: 3.2 m wide x 2.9 m (one floor) tall. Background = cladding pattern, white so vertex colour tints it.
function drawWindow(g) {
  g.fillStyle = '#26282b'; g.fillRect(38, 24, 52, 64);                                     // black frame (modern builds)
  const gr = g.createLinearGradient(0, 28, 0, 84); gr.addColorStop(0, '#7f97ad'); gr.addColorStop(1, '#2e3d4c');
  g.fillStyle = gr; g.fillRect(42, 28, 44, 56);
  g.fillStyle = 'rgba(255,255,255,0.20)'; g.beginPath(); g.moveTo(42, 28); g.lineTo(64, 28); g.lineTo(42, 58); g.fill();
  g.fillStyle = '#26282b'; g.fillRect(62, 28, 3, 56);                                      // mullion
  g.fillStyle = '#d8d6d0'; g.fillRect(36, 88, 56, 5);                                      // sill
}
const facade = {
  siding: g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 8) { g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, y + 6, 128, 2); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, y, 128, 1); } },
  brick: g => { g.fillStyle = '#e9e6e0'; g.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 128 / 5; row++) for (let x = (row % 2) * 6 - 6; x < 128; x += 12) {
      const v = 200 + Math.floor(Math.random() * 55); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + 1, row * 5 + 1, 10, 4); } },
  stone: g => { g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, 128, 128);
    let y = 0; while (y < 128) { const hgt = 8 + Math.floor(Math.random() * 8); let x = -Math.floor(Math.random() * 10);
      while (x < 128) { const wdt = 12 + Math.floor(Math.random() * 20), v = 190 + Math.floor(Math.random() * 65);
        g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(x + 1, y + 1, wdt - 2, hgt - 2); x += wdt; } y += hgt; } },
  // vertical board-and-batten (dark front gables on the farmhouse-style rows, seen on Street View, Sep 2025)
  batten: g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 16) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, 0, 3, 128); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 3, 0, 1, 128); } },
  // large flat cladding panels with thin reveals (the 2168-2190 Tenth Line apartment buildings)
  panel: g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 64, 128, 2); g.fillRect(0, 0, 2, 128); g.fillRect(64, 0, 2, 128);
    g.fillStyle = 'rgba(0,0,0,0.05)'; for (let y = 4; y < 128; y += 6) g.fillRect(0, y, 128, 1); },
  // wood-look vertical panels (accent on the modern flat-roof rows)
  wood: g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 11) { const v = 200 + Math.floor(Math.random() * 55); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 10, 128);
      g.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 0; y < 128; y += 6 + Math.floor(Math.random() * 10)) g.fillRect(x + 2, y, 6, 1); } },
};
// white vinyl windows with a grey surround (farmhouse-style rows)
function drawWindowWhite(g) {
  g.fillStyle = '#6d6f72'; g.fillRect(34, 20, 60, 72);
  g.fillStyle = '#f4f4f2'; g.fillRect(38, 24, 52, 64);
  const gr = g.createLinearGradient(0, 28, 0, 84); gr.addColorStop(0, '#8aa0b4'); gr.addColorStop(1, '#33424f');
  g.fillStyle = gr; g.fillRect(42, 28, 44, 56);
  g.fillStyle = 'rgba(255,255,255,0.20)'; g.beginPath(); g.moveTo(42, 28); g.lineTo(64, 28); g.lineTo(42, 58); g.fill();
  g.fillStyle = '#f4f4f2'; g.fillRect(42, 54, 44, 4);
}
// texture key -> [cladding pattern, window style]
const TEX_KEYS = { siding: ['siding', drawWindow], brick: ['brick', drawWindow], stone: ['stone', drawWindow], wood: ['wood', drawWindow],
  sidingW: ['siding', drawWindowWhite], brickW: ['brick', drawWindowWhite], batten: ['batten', drawWindowWhite], panel: ['panel', drawWindowWhite] };
const APT = { navy: 0x2c3a57, white: 0xeeeeea, orange: 0xd98a3a, glass: 0x3b4f63, rail: 0x23292f };
const aptBuildings = [], youngTrees = [];
const NEW_STREETS = new Set(['Establish Avenue']);   // opened Sep 2024 (Minto Avalon), after the lidar scan
const texWall = {};
// walls: 256 px per window bay. Brick uses a photo (ambientCG Bricks105, CC0) repeated 2 x 2 per bay (1.6 m x 1.45 m);
// siding gets a faint wood-grain photo, stone / boards / panels get fine photo grit. Windows are drawn on top.
const PHOTO_WALL = { brick: 'brick', siding: 'siding' };
for (const [k, [pat, win]] of Object.entries(TEX_KEYS)) texWall[k] = photoTex(PHOTO_WALL[pat] || 'grain', 256, 256, (g, w, h, img) => {
  g.save(); g.scale(2, 2); facade[pat](g); g.restore();
  if (img && pat === 'brick') { g.save(); g.globalCompositeOperation = 'multiply'; tileImage(g, img, w, h, 2, 2); g.restore(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, w, h); }
  else if (img && pat === 'siding') grain(g, img, w, h, 1, 0.55);
  else if (img) grain(g, img, w, h, 2, 0.7);
  g.save(); g.scale(2, 2); win(g); g.restore();
});
const texShop = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, w, 22);
  const gr = g.createLinearGradient(0, 26, 0, 120); gr.addColorStop(0, '#6d8aa6'); gr.addColorStop(1, '#273746');
  g.fillStyle = gr; g.fillRect(6, 28, 116, 96);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.moveTo(6, 28); g.lineTo(50, 28); g.lineTo(6, 80); g.fill();
  g.fillStyle = '#3a3a3a'; g.fillRect(62, 28, 4, 96);
});
const texRoof = photoTex('grain', 256, 256, (g, w, h, img) => {   // architectural asphalt shingles, with photo grit
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.save(); g.scale(4, 4);
  let sd = 3; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let row = 0; row < 4; row++) {
    const y = row * 16; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y, 64, 2);
    for (let x = (row % 2) * 7; x < 64; x += 9 + (x % 5)) { g.fillStyle = `rgba(0,0,0,${r() * 0.2})`; g.fillRect(x, y + 2, 8, 14); }
  }
  g.restore();
  if (img) grain(g, img, w, h, 2, 1);
});
const texGarage = canvasTex(64, 64, (g, w, h) => {   // sectional garage door with a window row
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 16; y < h; y += 16) g.fillRect(0, y, w, 2);
  g.fillStyle = 'rgba(0,0,0,0.08)'; for (let x = 0; x < w; x += 16) for (let y = 0; y < h; y += 16) g.fillRect(x + 3, y + 4, 10, 9);
  g.fillStyle = '#3c4a57'; for (let x = 0; x < w; x += 16) g.fillRect(x + 3, 3, 10, 9);
});

// colours (tints for the white textures)
// colours matched to 2019-2020 street-level photos of the neighbouring Avalon streets (Mapillary, used as reference only):
// warm brown / tan / beige brick and stone, beige-to-brown siding, dark brown roofs
const SIDING = [0xd9c7a6, 0xc4a983, 0xa89279, 0xcfc6b5, 0x8a6a4f, 0xe6dcc6, 0xb7a58a, 0x9c8068];
const BRICK = [0x8a5a3c, 0xa87a55, 0x7a4a36, 0x6e4c38];
const STONE = [0xc9b38f, 0xb39c7a, 0xd6c4a2, 0x9e8a6e];
const ROOFS = [0x4a3a30, 0x3e3330, 0x2e2a28, 0x5a4a3e];
const DOORS = [0x1f1f22, 0x2f4a6b, 0x7a2e2e, 0x3b4a3b, 0xeeeeea, 0x5b4636];
const wallB = Object.fromEntries(Object.keys(TEX_KEYS).map(k => [k, makeBuilder()]));
const shopB = makeBuilder(), plainB = makeBuilder(), roofB = makeBuilder(), garageB = makeBuilder(), drivewayB = makeBuilder();
// house-number plaques (Street View: dark plaque, light digits, on the brick just above each garage); one shared atlas
const NUM_ATLAS = (() => { const c = document.createElement('canvas'); c.width = 2048; c.height = 4096; return { c, g: c.getContext('2d'), cells: new Map(), next: 0, cw: 128, ch: 48 }; })();
const texNumbers = new THREE.CanvasTexture(NUM_ATLAS.c); texNumbers.anisotropy = 8;
const plaqueB = makeBuilder();
function numberCell(num) {
  const A = NUM_ATLAS; if (A.cells.has(num)) return A.cells.get(num);
  const i = A.next++, cols = A.c.width / A.cw, x = (i % cols) * A.cw, y = Math.floor(i / cols) * A.ch, g = A.g;
  g.fillStyle = '#2b2d30'; g.fillRect(x, y, A.cw, A.ch);
  g.strokeStyle = '#8a8d90'; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, A.cw - 6, A.ch - 6);
  g.fillStyle = '#f2f2ee'; g.font = 'bold 34px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(num, x + A.cw / 2, y + A.ch / 2 + 2);
  const uv = [x / A.c.width, 1 - (y + A.ch) / A.c.height, (x + A.cw) / A.c.width, 1 - y / A.c.height];   // canvas textures are flipped in v
  A.cells.set(num, uv); return uv;
}
// plaque on a wall: drawn a bit bigger than real (0.6 x 0.22 m) so it's readable in the game
function addPlaque(p, dir, n, along, y, num) {
  let [u0, v0, u1, v1] = numberCell(num);
  if (dir[0] * n[2] - dir[1] * n[0] < 0) [u0, u1] = [u1, u0];   // text reads left-to-right for someone facing the wall
  const w = 0.6, h = 0.22, o = 0.075, P = (a, yy) => [p[0] + dir[0] * a + n[0] * o, yy, p[1] + dir[1] * a + n[2] * o];
  const A = P(along - w / 2, y), B = P(along + w / 2, y), C = P(along + w / 2, y + h), D = P(along - w / 2, y + h), col = new THREE.Color(1, 1, 1);
  pushTri(plaqueB, A, B, C, n, col, [u0, v0], [u1, v0], [u1, v1]); pushTri(plaqueB, A, C, D, n, col, [u0, v0], [u1, v1], [u0, v1]);
}
const LIFTED = [...Object.values(wallB), shopB, plainB, roofB, garageB, plaqueB];
// the two designs on Establish Avenue (Google Street View, Sep 2025), for rows built after the 2020 lidar scan
const FARM = { siding: [0xb3a892, 0x8d8a84, 0x6e5d50, 0xc7bca8, 0x9a948a], brick: [0xcbb89c, 0xc2b29a, 0xd3c4aa], batten: 0x3d4045,
  roof: [0x5b524b, 0x544c46], garage: 0x4a3c34, column: 0xddd5c6 };
const MODERN = { stone: 0x5d6064, wood: 0x7a4a30, siding: [0xbdbbb6, 0xa9aaa8], sideWall: 0x6f7276, garage: 0xd6d6d2, trim: 0x34373b };
const homeInfo = { x: 0, z: 0, h: 8 };
const RESIDENTIAL = new Set(['house', 'detached', 'residential', 'terrace', 'apartments']);
const FLOOR = 2.9;
const newHouses = [];   // homes built after the 2020 lidar scan (they get young front-yard trees)
// typical peak height of the townhomes the lidar did see (median), used for homes built after the scan
const TYPICAL_TOP = (() => {
  if (!LD) return 9;
  const tops = LD.buildings.filter(b => b && b[2] && b[0] - b[1] > 0.8 && b[0] < 14).map(b => b[0]).sort((a, b) => a - b);
  return tops.length ? tops[Math.floor(tops.length / 2)] : 9;
})();

function wallQuad(B, p, q, y0, y1, n, color, bayW, floorH) {
  const L = Math.hypot(q[0]-p[0], q[1]-p[1]);
  const bays = bayW ? Math.round(L / bayW) : 0;
  const u0 = bays ? 0 : 0.05, u1 = bays ? bays : 0.05 + (bayW === 0 && floorH ? L / 3.2 * 0.2 : 0);
  const v0 = floorH ? y0 / floorH : 0, v1 = floorH ? y1 / floorH : 0;
  const A = [p[0], y0, p[1]], Bq = [q[0], y0, q[1]], C = [q[0], y1, q[1]], D = [p[0], y1, p[1]];
  pushTri(B, A, Bq, C, n, color, [u0, v0], [u1, v0], [u1, v1]);
  pushTri(B, A, C, D, n, color, [u0, v0], [u1, v1], [u0, v1]);
}
function outwardNormal(p, q, poly) {
  const dx = q[0]-p[0], dz = q[1]-p[1], L = Math.hypot(dx, dz) || 1;
  let n = [dz / L, 0, -dx / L];
  if (pointInPoly((p[0]+q[0])/2 + n[0]*0.05, (p[1]+q[1])/2 + n[2]*0.05, poly)) n = [-n[0], 0, -n[2]];
  return n;
}
function orientedBox(poly) {
  let best = null;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i+1) % poly.length], a = Math.atan2(q[1]-p[1], q[0]-p[0]), c = Math.cos(a), s = Math.sin(a);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const r of poly) { const u = r[0]*c + r[1]*s, v = -r[0]*s + r[1]*c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const A = (u1-u0) * (v1-v0); if (!best || A < best.A) best = { A, c, s, u0, u1, v0, v1 };
  }
  if (best.v1 - best.v0 > best.u1 - best.u0) rotateBox(best);
  return best;
}
function rotateBox(o) { const { c, s, u0, u1, v0, v1 } = o; Object.assign(o, { c: -s, s: c, u0: v0, u1: v1, v0: -u1, v1: -u0 }); }
const boxPt = (o, u, v, y) => [u*o.c - v*o.s, y, u*o.s + v*o.c];
function upNormal(a, b, c) {
  const n = new THREE.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]).cross(new THREE.Vector3(c[0]-a[0], c[1]-a[1], c[2]-a[2])).normalize();
  if (n.y < 0) n.negate(); return [n.x, n.y, n.z];
}
function gableRoof(o, wallH, roofCol, wallCol, chimney, riseOverride) {
  const half = (o.v1 - o.v0) / 2, vc = (o.v0 + o.v1) / 2, oh = 0.45;
  const rh = riseOverride > 0 ? Math.min(riseOverride, half * 1.2) : Math.min(3.2, Math.max(1.5, half * 0.62)), slope = rh / half;
  const ridge = wallH + rh, eave = wallH - slope * oh;
  const U0 = o.u0 - oh, U1 = o.u1 + oh, slopeLen = Math.hypot(half + oh, rh + slope * oh);
  for (const Ve of [o.v0 - oh, o.v1 + oh]) {
    const a = boxPt(o, U0, Ve, eave), b = boxPt(o, U1, Ve, eave), c = boxPt(o, U1, vc, ridge), d = boxPt(o, U0, vc, ridge);
    const n = upNormal(a, b, c), col = roofCol.clone().multiplyScalar(0.75 + 0.3 * n[1]);
    pushTri(roofB, a, b, c, n, col, [U0, 0], [U1, 0], [U1, slopeLen * 1.6]);
    pushTri(roofB, a, c, d, n, col, [U0, 0], [U1, slopeLen * 1.6], [U0, slopeLen * 1.6]);
    // fascia board along the eave
    const fa = boxPt(o, U0, Ve, eave - 0.2), fb = boxPt(o, U1, Ve, eave - 0.2), fn = boxPt(o, 0, Ve > vc ? 1 : -1, 0);
    const fl = Math.hypot(fn[0], fn[2]); const fnn = [fn[0] / fl, 0, fn[2] / fl];
    wallQuad(plainB, [fa[0], fa[2]], [fb[0], fb[2]], eave - 0.2, eave, fnn, new THREE.Color(0xf2f2ee), 0, 0);
  }
  for (const [u, sg] of [[o.u0, -1], [o.u1, 1]]) {   // triangular gable walls, in siding
    const a = boxPt(o, u, o.v0, wallH), b = boxPt(o, u, o.v1, wallH), c = boxPt(o, u, vc, ridge), L = o.v1 - o.v0;
    pushTri(wallB.siding, a, b, c, [o.c*sg, 0, o.s*sg], wallCol.clone().multiplyScalar(0.92),
      [0.05, wallH / FLOOR], [0.05 + L / 16, wallH / FLOOR], [0.05 + L / 32, ridge / FLOOR]);
  }
  if (chimney) {
    const cu = o.u0 + (o.u1 - o.u0) * chimney, cv = vc + half * 0.45;
    const y0 = wallH + rh * 0.3, y1 = ridge + 0.9, w = 0.45, brick = new THREE.Color(0x8a4a3a);
    const corners = [[-w, -w], [w, -w], [w, w], [-w, w]].map(([du, dv]) => [cu + du, cv + dv]);
    for (let i = 0; i < 4; i++) {
      const [ua, va] = corners[i], [ub, vb] = corners[(i+1) % 4];
      const a = boxPt(o, ua, va, 0), b = boxPt(o, ub, vb, 0), mid = boxPt(o, (ua+ub)/2 - cu, (va+vb)/2 - cv, 0);
      const len = Math.hypot(mid[0], mid[2]) || 1;
      wallQuad(wallB.brick, [a[0], a[2]], [b[0], b[2]], y0, y1, [mid[0]/len, 0, mid[2]/len], brick, 0, FLOOR);
    }
    const top = corners.map(([u, v]) => boxPt(o, u, v, y1));
    pushTri(plainB, top[0], top[1], top[2], [0,1,0], new THREE.Color(0x3a3a3a)); pushTri(plainB, top[0], top[2], top[3], [0,1,0], new THREE.Color(0x3a3a3a));
  }
  lastRoofSlope = slope;
  return ridge;
}
let lastRoofSlope = 0.6;
// front-facing gable over a townhome unit (as seen in photos of the neighbouring streets): a steep triangular
// wall rising above the eave on the street side, with its own little roof running back into the main roof
function frontGable(front, wallH, roofCol, wallCol, mainSlope, centreAt, gableKey = 'siding') {
  const { p, q, n, L } = front, dir = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
  const gw = Math.min(L * 0.62, 5.2), gh = gw / 2 * 0.95, oh = 0.35, out = 0.04;
  const cx = p[0] + dir[0] * centreAt, cz = p[1] + dir[1] * centreAt;
  const at = (along, off, y) => [cx + dir[0] * along + n[0] * off, y, cz + dir[1] * along + n[2] * off];
  // triangular siding wall, slightly proud of the facade
  pushTri(wallB[gableKey], at(-gw / 2, out, wallH), at(gw / 2, out, wallH), at(0, out, wallH + gh), n, wallCol,
    [0.05, wallH / FLOOR], [0.05 + gw / 16, wallH / FLOOR], [0.05 + gw / 32, (wallH + gh) / FLOOR]);
  // small attic window
  wallQuad(plainB, [cx - dir[0] * 0.35 + n[0] * 0.06, cz - dir[1] * 0.35 + n[2] * 0.06], [cx + dir[0] * 0.35 + n[0] * 0.06, cz + dir[1] * 0.35 + n[2] * 0.06],
    wallH + gh * 0.25, wallH + gh * 0.55, n, new THREE.Color(0x2e3d4c), 0, 0);
  // the two roof slopes: from the overhang at the front back to where they meet the main roof
  const back = gh / Math.max(0.3, mainSlope);
  for (const side of [-1, 1]) {
    const e1 = at(side * (gw / 2 + 0.25), oh, wallH - 0.2), e2 = at(side * (gw / 2), -0.01, wallH);
    const r1 = at(0, oh, wallH + gh + 0.05), r2 = at(0, -back, wallH + gh + 0.05);
    const nn = upNormal(e1, r1, r2), col = roofCol.clone().multiplyScalar(0.75 + 0.3 * nn[1]);
    pushTri(roofB, e1, r1, r2, nn, col, [0, 0], [0, 2], [back, 2]);
    pushTri(roofB, e1, r2, e2, nn, col, [0, 0], [back, 2], [0.5, 0]);
    // white fascia under the gable edge
    const f1 = at(side * (gw / 2 + 0.25), oh + 0.01, wallH - 0.2), f2 = at(0, oh + 0.01, wallH + gh + 0.05);
    pushTri(plainB, f1, f2, [f2[0], f2[1] - 0.18, f2[2]], n, new THREE.Color(0xf2f2ee));
    pushTri(plainB, f1, [f2[0], f2[1] - 0.18, f2[2]], [f1[0], f1[1] - 0.18, f1[2]], n, new THREE.Color(0xf2f2ee));
  }
}
function hipRoof(poly, wallH, roofCol, cx, cz) {
  const rh = 2.4;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i+1) % poly.length], L = Math.hypot(q[0]-p[0], q[1]-p[1]);
    const e1 = [p[0], wallH, p[1]], e2 = [q[0], wallH, q[1]], top = [cx, wallH + rh, cz];
    const n = upNormal(e1, e2, top), sl = Math.hypot(Math.hypot(cx - (p[0]+q[0])/2, cz - (p[1]+q[1])/2), rh);
    pushTri(roofB, e1, e2, top, n, roofCol.clone().multiplyScalar(0.75 + 0.3 * n[1]), [0, 0], [L, 0], [L / 2, sl * 1.6]);
  }
  return wallH + rh;
}
function nearestRoadPoint(x, z) {
  let best = null;
  for (const it of gridNear(x, z)) {
    if (it.kind !== 'road') continue; const s = it.seg;
    if (s.t === 'service' && s.w < 5) continue;
    const dx = s.x2-s.x1, dz = s.z2-s.z1, L2 = dx*dx + dz*dz || 1;
    const t = Math.max(0, Math.min(1, ((x-s.x1)*dx + (z-s.z1)*dz) / L2));
    const px = s.x1 + t*dx, pz = s.z1 + t*dz, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { d, x: px, z: pz, w: s.w };
  }
  return best;
}
function flatQuad(B, a, b, c, d, y, color, uv) {
  const U = uv || [UV0, UV0, UV0, UV0];
  pushTri(B, [a[0], y, a[1]], [b[0], y, b[1]], [c[0], y, c[1]], [0,1,0], color, U[0], U[1], U[2]);
  pushTri(B, [a[0], y, a[1]], [c[0], y, c[1]], [d[0], y, d[1]], [0,1,0], color, U[0], U[2], U[3]);
}
// a flat panel standing just in front of a wall (doors, garage doors)
function wallPanel(B, p, dir, n, along, width, y0, y1, color, out = 0.04, uvScale = 0) {
  const ox = n[0] * out, oz = n[2] * out;
  const a = [p[0] + dir[0]*(along - width/2) + ox, p[1] + dir[1]*(along - width/2) + oz];
  const b = [p[0] + dir[0]*(along + width/2) + ox, p[1] + dir[1]*(along + width/2) + oz];
  if (!uvScale) { wallQuad(B, a, b, y0, y1, n, color, 0, 0); return; }
  const A = [a[0], y0, a[1]], Bq = [b[0], y0, b[1]], C = [b[0], y1, b[1]], D = [a[0], y1, a[1]];
  const u1 = Math.max(1, Math.round(width / 0.62)) / 4, v1 = (y1 - y0) / 0.55 / 4;
  pushTri(B, A, Bq, C, n, color, [0, 0], [u1, 0], [u1, v1]); pushTri(B, A, C, D, n, color, [0, 0], [u1, v1], [0, v1]);
}
// a small box (porch canopy, front step)
function box(B, cx, cz, dir, n, w, d, y0, y1, color) {
  const P = (a, b) => [cx + dir[0] * a + n[0] * b, cz + dir[1] * a + n[2] * b];
  const c = [P(-w/2, 0), P(w/2, 0), P(w/2, d), P(-w/2, d)];
  flatQuad(B, c[0], c[1], c[2], c[3], y1, color);
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i+1) % 4], mx = (a[0]+b[0])/2 - (c[0][0]+c[2][0])/2, mz = (a[1]+b[1])/2 - (c[0][1]+c[2][1])/2, l = Math.hypot(mx, mz) || 1;
    wallQuad(B, a, b, y0, y1, [mx/l, 0, mz/l], color.clone().multiplyScalar(0.85), 0, 0);
  }
}
// which wall faces the street
function findFront(poly) {
  let best = null;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i+1) % poly.length], L = Math.hypot(q[0]-p[0], q[1]-p[1]);
    if (L < 2.6) continue;
    const n = outwardNormal(p, q, poly), mx = (p[0]+q[0])/2, mz = (p[1]+q[1])/2;
    const r = nearestRoadPoint(mx + n[0] * 3, mz + n[2] * 3); if (!r) continue;
    const facing = ((r.x - mx) * n[0] + (r.z - mz) * n[2]) / (r.d || 1);
    const score = r.d - facing * 8 - L * 0.3;
    if (facing > 0.3 && (!best || score < best.score)) best = { score, i, p, q, n, L, r };
  }
  return best;
}
// front door, porch, garage and driveway
function addEntrance(front, kind, hsh, style, unitIdx) {
  const { p, q, n, L, r } = front, dir = [(q[0]-p[0]) / L, (q[1]-p[1]) / L];
  let garageW = 0;
  if (kind === 'house') garageW = L >= 8.5 ? 4.9 : (L >= 5.2 ? 2.6 : 0);
  // garages of neighbouring units sit side by side (mirrored plans), like real townhome rows
  const garageLeft = style.garageAtStart ?? (unitIdx % 2 === 0);
  const Rr = style.recess || 0, bw = style.bumpW || 0;
  let gAt = garageLeft ? 0.35 + garageW / 2 : L - 0.35 - garageW / 2;
  let doorAt = garageW ? (garageLeft ? (gAt + garageW / 2 + L) / 2 : (gAt - garageW / 2) / 2) : L * 0.5;
  if (Rr && garageW) { gAt = garageLeft ? bw / 2 : L - bw / 2; doorAt = garageLeft ? bw + (L - bw) * 0.4 : (L - bw) * 0.6; }
  // the front door sits in the recess (Monterey plan); everything else on the front line
  const pD = Rr ? [p[0] - n[0] * Rr, p[1] - n[2] * Rr] : p;
  const trim = new THREE.Color(0xf2f2ee), doorCol = new THREE.Color(DOORS[(hsh >> 2) % DOORS.length]);
  wallPanel(plainB, pD, dir, n, doorAt, 1.25, 0, 2.3, trim);
  wallPanel(plainB, pD, dir, n, doorAt, 0.95, 0, 2.15, doorCol, 0.06);
  wallPanel(plainB, pD, dir, n, doorAt + 0.33, 0.06, 1.0, 1.1, new THREE.Color(0xc9a85a), 0.08);   // handle
  if (kind === 'apartments' || kind === 'shop') return;
  const dx = p[0] + dir[0] * doorAt, dz = p[1] + dir[1] * doorAt;
  if (style.kind === 'farmhouse' && garageW && Rr) {
    // porch in the recess beside the garage block: shed roof, two columns on brick bases at the front line, slab
    const a0 = garageLeft ? bw : 0, a1 = garageLeft ? L : L - bw, pw = a1 - a0, pc = (a0 + a1) / 2;
    const bx = pD[0] + dir[0] * pc, bz = pD[1] + dir[1] * pc;
    box(roofB, bx, bz, dir, n, pw + 0.1, Rr + 0.35, 2.8, 3.0, style.roof.clone().multiplyScalar(1.05));
    const outer = garageLeft ? a1 - 0.25 : a0 + 0.25, inner = garageLeft ? a0 + 0.25 : a1 - 0.25;
    for (const ca of [outer, inner]) {
      const cpx = pD[0] + dir[0] * ca + n[0] * (Rr - 0.35), cpz = pD[1] + dir[1] * ca + n[2] * (Rr - 0.35);
      box(plainB, cpx, cpz, dir, n, 0.28, 0.28, 0.9, 2.8, new THREE.Color(FARM.column));
      box(wallB.brickW, cpx, cpz, dir, n, 0.4, 0.4, -0.1, 0.9, style.brickCol || new THREE.Color(FARM.brick[0]));
    }
    box(plainB, bx, bz, dir, n, pw, Rr, -0.2, 0.2, new THREE.Color(0xc9c7c0));   // porch slab
    box(plainB, pD[0] + dir[0] * doorAt + n[0] * Rr, pD[1] + dir[1] * doorAt + n[2] * Rr, dir, n, 1.4, 0.6, -0.2, 0.1, new THREE.Color(0xc9c7c0));   // step
  } else if (style.kind === 'farmhouse' && garageW) {
    // long covered porch beside the garage, square columns on brick bases (as on Street View)
    const a0 = garageLeft ? gAt + garageW / 2 + 0.15 : 0.1, a1 = garageLeft ? L - 0.1 : gAt - garageW / 2 - 0.15;
    const pw = a1 - a0, pc = (a0 + a1) / 2, depth = 1.8;
    if (pw > 1) {
      const px0 = p[0] + dir[0] * pc, pz0 = p[1] + dir[1] * pc;
      box(roofB, px0, pz0, dir, n, pw + 0.3, depth + 0.15, 2.8, 3.0, style.roof.clone().multiplyScalar(1.05));
      for (const s of [-1, 1]) {
        const ca = pc + s * (pw / 2 - 0.2), cpx = p[0] + dir[0] * ca + n[0] * (depth - 0.35), cpz = p[1] + dir[1] * ca + n[2] * (depth - 0.35);
        box(plainB, cpx, cpz, dir, n, 0.28, 0.28, 0.9, 2.8, new THREE.Color(FARM.column));
        box(wallB.brickW, cpx, cpz, dir, n, 0.4, 0.4, -0.1, 0.9, style.brickCol || new THREE.Color(FARM.brick[0]));
      }
      box(plainB, px0, pz0, dir, n, pw, depth - 0.1, -0.2, 0.2, new THREE.Color(0xc9c7c0));   // porch slab
    }
  } else {
    // small canopy and front step
    box(plainB, dx, dz, dir, n, 1.9, 1.3, 2.55, 2.7, style.kind === 'modern' ? new THREE.Color(MODERN.trim) : style.roof.clone().multiplyScalar(1.1));
    box(plainB, dx, dz, dir, n, 1.6, 1.0, -0.2, 0.18, new THREE.Color(0xc9c7c0));
  }
  const toRoadDoor = (r.x - dx) * n[0] + (r.z - dz) * n[2] - r.w / 2;
  if (!garageW && toRoadDoor > 1 && toRoadDoor < 22) {   // walkway to the sidewalk
    const w = 0.6, e = toRoadDoor;
    flatQuad(drivewayB, [dx - dir[0]*w + n[0], dz - dir[1]*w + n[2]], [dx + dir[0]*w + n[0], dz + dir[1]*w + n[2]],
      [dx + dir[0]*w + n[0]*e, dz + dir[1]*w + n[2]*e], [dx - dir[0]*w + n[0]*e, dz - dir[1]*w + n[2]*e], 0.085, new THREE.Color(0xc4c0b6));
  }
  if (!garageW) { if (style.num) addPlaque(pD, dir, n, doorAt + 0.95, 1.7, style.num); return; }
  wallPanel(plainB, p, dir, n, gAt, garageW + 0.3, 0, 2.45, trim);
  wallPanel(garageB, p, dir, n, gAt, garageW, 0, 2.2, style.garage, 0.06, 1);
  if (style.num) addPlaque(p, dir, n, gAt, 2.55, style.num);   // number plaque above the garage
  const gx = p[0] + dir[0]*gAt, gz = p[1] + dir[1]*gAt;
  const toRoad = (r.x - gx) * n[0] + (r.z - gz) * n[2] - r.w / 2 + 0.3;
  if (toRoad > 1 && toRoad < 30) {
    const w = garageW / 2 + 0.25, e = toRoad;
    const quad = [[gx - dir[0]*w, gz - dir[1]*w], [gx + dir[0]*w, gz + dir[1]*w],
      [gx + dir[0]*w + n[0]*e, gz + dir[1]*w + n[2]*e], [gx - dir[0]*w + n[0]*e, gz - dir[1]*w + n[2]*e]];
    flatQuad(drivewayB, ...quad, 0.085, new THREE.Color(0x4b4d51));   // asphalt driveways are the norm in Ottawa suburbs
    blockedAreas.push(quad); drivewayQuads.push(quad);
  }
}

// group attached units into rows (attached townhomes share corner points in the map data)
const rowOf = new Map();
{
  const parent = M.buildings.map((_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const owner = new Map();
  M.buildings.forEach((b, i) => {
    for (const p of b.p) {
      const k = Math.round(p[0] * 5) + ',' + Math.round(p[1] * 5);
      if (owner.has(k)) parent[find(i)] = find(owner.get(k)); else owner.set(k, i);
    }
  });
  const order = new Map();
  M.buildings.forEach((b, i) => { const r = find(i); if (!order.has(r)) order.set(r, 0); rowOf.set(i, { row: r, idx: order.get(r) }); order.set(r, order.get(r) + 1); });
}
function rowStyle(row) {
  const h = hashStr('row' + row);
  return {
    roof: new THREE.Color(ROOFS[h % ROOFS.length]),
    garage: new THREE.Color([0xf2f2ee, 0xe6dcc6, 0xf2f2ee, 0x6b5240][(h >> 3) % 4]),
    sidingA: new THREE.Color(SIDING[(h >> 5) % SIDING.length]), sidingB: new THREE.Color(SIDING[(h >> 9) % SIDING.length]),
    brick: new THREE.Color(BRICK[(h >> 12) % BRICK.length]), stone: new THREE.Color(STONE[(h >> 14) % STONE.length]),
  };
}

const HOME_ROW = (() => { const i = M.buildings.findIndex(b => b.home); return i >= 0 ? rowOf.get(i).row : -1; })();
function shopSign(front, name, y, bg = '#1d2a36', fg = '#ffffff', h = 0.8) {
  const { p, q, n, L } = front;
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = 'bold 56px Arial, sans-serif'; const tw = g.measureText(name).width;
  c.width = Math.ceil(tw + 48); c.height = 80;
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg; g.font = 'bold 56px Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText(name, 24, 42);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
  const w = Math.min(L * 0.8, h * c.width / c.height);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshLambertMaterial({ map: tex, emissive: 0x222222 }));
  sign.position.set((p[0] + q[0]) / 2 + n[0] * 0.12, y, (p[1] + q[1]) / 2 + n[2] * 0.12);
  sign.rotation.y = Math.atan2(n[0], n[2]);
  scene.add(sign);
}
M.buildings.forEach((b, bi) => {
  if (b.am === 'shelter') return;   // open park shelters are drawn by js/parks.js
  let poly = ring(b.p); if (poly.length < 3) return;
  if (signedArea(poly) < 0) poly = poly.slice().reverse();
  const area = Math.abs(signedArea(poly));
  const hsh = hashStr(poly[0][0] * 1000 + poly[0][1]);
  // in this area most homes are only tagged "building=yes"; anything bigger than a shed is treated as a house
  // a plain "building=yes" with a business name or businesses inside is a shop, not a house
  const isBiz = b.t === 'yes' && (b.n || b.pois) && area > 60;
  const isRes = (RESIDENTIAL.has(b.t) || (b.t === 'yes' && area > 40 && !isBiz)) && area > 35;
  const isShop = ['retail', 'commercial', 'public', 'supermarket', 'industrial', 'warehouse', 'office'].includes(b.t) || isBiz;
  const { row, idx } = rowOf.get(bi), style = rowStyle(row);
  style.num = b.a;   // house number from OpenStreetMap
  // measured heights from the 2020 lidar scan: [roof top, median height, existed in 2020]
  // streets opened after the May 2020 lidar scan: whatever the scan saw on those lots (trees, earthworks) is not the house
  const lbRaw = LD && LD.buildings[bi];
  const lb = lbRaw && NEW_STREETS.has(b.s) ? [0, 0, 0] : lbRaw;
  const isNew = !!(lb && !lb[2]);
  // design: rows built after the scan follow the two designs on Street View (Sep 2025); older rows keep the 2020 look
  style.kind = 'classic';
  if (isRes && isNew && b.t !== 'apartments' && area < 1500) style.kind = (row === HOME_ROW || hashStr('k' + row) % 2) ? 'farmhouse' : 'modern';
  // 5-storey apartments built after 2020 (2168-2190 Tenth Line Rd): navy panels, orange accents, white top floor (Street View)
  if (b.t === 'apartments' && isNew && (parseInt(b.lv) || 0) >= 4) style.kind = 'apt';
  // elevation A / B / C, cycling along the row
  const elev = (idx + (hashStr(row) % 3)) % 3;
  let sidingCol = elev === 1 ? style.sidingB : style.sidingA;
  let baseKind = elev === 2 ? 'stone' : 'brick', baseCol = elev === 2 ? style.stone : style.brick, roofCol = style.roof;
  if (style.kind === 'farmhouse') {
    const h = hashStr('f' + row);
    sidingCol = new THREE.Color(FARM.siding[(idx * 3 + h) % FARM.siding.length]);
    baseKind = 'brickW'; baseCol = new THREE.Color(FARM.brick[h % FARM.brick.length]); style.brickCol = baseCol;
    roofCol = style.roof = new THREE.Color(FARM.roof[h % 2]); style.garage = new THREE.Color(FARM.garage);
  } else if (style.kind === 'modern') {
    sidingCol = new THREE.Color(MODERN.siding[idx % 2]); baseKind = 'stone'; baseCol = new THREE.Color(MODERN.stone);
    style.garage = new THREE.Color(MODERN.garage);
  }
  if (!isRes && !isShop) { sidingCol = new THREE.Color(0xbdb6a8); roofCol = new THREE.Color(0x6a6a6a); }
  let shopCol = new THREE.Color([0xd8d2c4, 0xc4b59c, 0xbfc5c9][hsh % 3]);
  let cx = 0, cz = 0; for (const p of poly) { cx += p[0]; cz += p[1]; } cx /= poly.length; cz /= poly.length;

  // sit the building level on the slope: floor at the highest corner, a foundation down to the lowest
  const groundHs = poly.map(p => heightAt(p[0], p[1]));
  const lowG = Math.min(...groundHs), floorY = Math.max(...groundHs) + 0.15;
  for (const B of LIFTED) B.lift = floorY;

  let wallH, roof, roofRise = 0;
  if (isRes && b.t !== 'apartments' && area < 1500) { wallH = (area < 70 ? 1 : 2) * FLOOR; roof = 'pitched'; }
  else if (isRes) { wallH = Math.max(6, b.h); roof = 'flat'; }
  else if (isShop) { wallH = Math.max(4.5, b.h); roof = 'flat'; }
  else { wallH = Math.max(2.4, Math.min(b.h, 3)); roof = 'shed'; }
  if (lb && lb[2] && lb[0] > 2.4) {
    const top = lb[0], rise = lb[0] - lb[1];
    if (roof === 'pitched' && rise > 0.8) { roofRise = Math.min(4.5, Math.max(1.2, rise * 2)); wallH = Math.max(2.5, top - roofRise); }
    else if (roof === 'pitched') { roof = 'flat'; wallH = Math.max(2.5, top - 0.7); }
    else if (roof === 'flat') wallH = Math.max(2.5, top - 0.7);
    else if (roof === 'shed') wallH = Math.max(2.2, Math.min(top, 4));
  } else if (roof === 'pitched' && wallH > FLOOR) {
    roofRise = TYPICAL_TOP - wallH;   // built after the scan: use the measured height of this area's townhomes
  }
  if (style.kind === 'modern') { roof = 'flat'; wallH = 2 * FLOOR + 0.4; }
  if (style.kind === 'apt') { roof = 'flat'; wallH = (parseInt(b.lv) || 5) * 3.1; sidingCol = new THREE.Color(APT.white); aptBuildings.push({ poly, cx, cz }); }
  if (isNew && roof === 'pitched') newHouses.push({ poly, bi });

  const front = (isRes || isShop) ? findFront(poly) : null;
  // Minto "Monterey" front (home model from the interior session, R20): the garage block (bedroom 2 above it)
  // stands at the front line; the door/porch half of the unit is set back about 2 m, both floors.
  let rec = null;
  if (style.kind === 'farmhouse' && front && roof === 'pitched' && front.L >= 5.2 && front.L < 9) {
    const { p, q, n, L } = front, dir = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
    let atStart = idx % 2 === 0;
    // the home: garage on the LEFT as seen from the street (user confirmed)
    if (b.home) atStart = !(dir[0] * -n[2] + dir[1] * n[0] > 0);
    const R = 2.0, bw = Math.min(L * 0.5, 3.4);
    const sh = v => [v[0] - n[0] * R, v[1] - n[2] * R];
    rec = { R, bw, atStart, p, q, n, L, dir, pR: sh(p), qR: sh(q) };
    style.garageAtStart = atStart; style.recess = R; style.bumpW = bw;
  }
  const roofPoly = rec ? poly.map((v, k) => (k === front.i || k === (front.i + 1) % poly.length) ? [v[0] - rec.n[0] * rec.R, v[1] - rec.n[2] * rec.R] : v) : poly;
  // roof box and front gable decided before the walls, so the wall under the gable can match it
  let o = null, fill = 0, gableAt = -1;
  if (roof === 'pitched') {
    o = orientedBox(roofPoly);
    fill = area / ((o.u1 - o.u0) * (o.v1 - o.v0));
    if (o.v1 - o.v0 < 7.5 && o.u1 - o.u0 < 20) rotateBox(o);   // row units: ridge runs along the row
    if (front && fill > 0.82 && front.L >= 4) {
      const fd = [(front.q[0] - front.p[0]) / front.L, (front.q[1] - front.p[1]) / front.L];
      if (Math.abs(fd[0] * o.c + fd[1] * o.s) > 0.8) {
        // farmhouse rows: the gable sits over the door/porch half, not the garage (Minto block plan); classic rows vary
        if (style.kind === 'farmhouse') gableAt = rec ? (rec.atStart ? (rec.bw + front.L) / 2 : (front.L - rec.bw) / 2) : front.L * (idx % 2 === 0 ? 0.7 : 0.3);
        else gableAt = front.L * (idx % 3 === 2 ? 0.5 : idx % 2 === 0 ? 0.36 : 0.64);
      }
    }
  }
  const gw = rec ? Math.min((front.L - rec.bw) * 0.95, 5.2) : front ? Math.min(front.L * 0.62, 5.2) : 0;
  const segOf = (p, q, L, t0, t1) => [[p[0] + (q[0] - p[0]) * t0 / L, p[1] + (q[1] - p[1]) * t0 / L], [p[0] + (q[0] - p[0]) * t1 / L, p[1] + (q[1] - p[1]) * t1 / L]];

  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i+1) % poly.length];
    const n = outwardNormal(p, q, poly), shade = 0.86 + 0.14 * Math.abs(n[0]);
    const isFront = front && i === front.i;
    wallQuad(plainB, p, q, lowG - floorY - 0.4, 0, n, new THREE.Color(0x8f8b84), 0, 0);   // foundation
    if (style.kind === 'apt') {
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]), dir = [(q[0] - p[0]) / L, (q[1] - p[1]) / L], top = wallH - 3.1;
      wallQuad(wallB.panel, p, q, 0, top, n, new THREE.Color(APT.navy).multiplyScalar(shade), 3.4, 3.1);     // navy panels
      wallQuad(wallB.panel, p, q, top, wallH, n, new THREE.Color(APT.white).multiplyScalar(shade), 3.4, 3.1); // white top floor
      const orange = new THREE.Color(APT.orange);
      wallPanel(plainB, p, dir, n, L / 2, L, top - 0.3, top, orange, 0.07);                                    // orange band
      for (let a = 0.2; a < L; a += Math.max(6, L / Math.max(1, Math.round(L / 11)))) wallPanel(plainB, p, dir, n, a, 0.35, 0, top, orange, 0.07);
      wallPanel(plainB, p, dir, n, L - 0.2, 0.35, 0, top, orange, 0.07);
      // balconies on the long sides (white slab, dark rail), skipping the lobby on the front
      if (L > 14) for (let a = 3; a < L - 3; a += 6.8) {
        if (isFront && Math.abs(a - L / 2) < 4.5) continue;
        for (let k = 1; k < (parseInt(b.lv) || 5); k++) {
          const y = k * 3.1, bx = p[0] + dir[0] * a, bz = p[1] + dir[1] * a;
          box(plainB, bx, bz, dir, n, 2.8, 1.5, y - 0.18, y, new THREE.Color(APT.white));
          wallPanel(plainB, p, dir, n, a, 2.8, y, y + 1.05, new THREE.Color(APT.rail), 1.5);
        }
      }
      if (isFront) {   // two-storey glass lobby with a white canopy
        wallPanel(plainB, p, dir, n, L / 2, 5.2, 0, 6.0, new THREE.Color(APT.glass), 0.09);
        for (const o of [-1.3, 0, 1.3]) wallPanel(plainB, p, dir, n, L / 2 + o, 0.08, 0, 6.0, new THREE.Color(APT.rail), 0.1);
        box(plainB, p[0] + dir[0] * L / 2, p[1] + dir[1] * L / 2, dir, n, 4.2, 3.0, 3.2, 3.55, new THREE.Color(APT.white));
      }
    } else if (isRes && style.kind === 'farmhouse' && isFront && rec) {
      // stepped front: garage block at the front line, door/porch half recessed, return wall between them
      const sc = sidingCol.clone().multiplyScalar(shade), bc = baseCol.clone().multiplyScalar(shade);
      const { R, bw, atStart, L, dir } = rec;
      const [g0, g1] = atStart ? [0, bw] : [L - bw, L], [r0, r1] = atStart ? [bw, L] : [0, L - bw];
      { const [a, c] = segOf(p, q, L, g0, g1); wallQuad(wallB.brickW, a, c, 0, FLOOR, n, bc, 0, FLOOR); wallQuad(wallB.sidingW, a, c, FLOOR, wallH, n, sc, 3.2, FLOOR); }
      { const [a, c] = segOf(rec.pR, rec.qR, L, r0, r1); wallQuad(wallB.brickW, a, c, 0, FLOOR, n, bc, 3.2, FLOOR); wallQuad(wallB.batten, a, c, FLOOR, wallH, n, new THREE.Color(FARM.batten), 2.6, FLOOR); }
      const bAt = atStart ? bw : L - bw, sideN = atStart ? [dir[0], 0, dir[1]] : [-dir[0], 0, -dir[1]];
      const f = [p[0] + dir[0] * bAt, p[1] + dir[1] * bAt], bk = [f[0] - n[0] * R, f[1] - n[2] * R];
      wallQuad(wallB.brickW, f, bk, 0, FLOOR, sideN, bc.clone().multiplyScalar(0.9), 0, FLOOR);
      wallQuad(wallB.sidingW, f, bk, FLOOR, wallH, sideN, sc.clone().multiplyScalar(0.9), 0, FLOOR);
      for (const [a, c] of [segOf(p, q, L, g0, g1), [f, bk], segOf(rec.pR, rec.qR, L, r0, r1)])
        gridAdd({ kind: 'wall', x1: a[0], z1: a[1], x2: c[0], z2: c[1] }, Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1]));
      continue;
    } else if (isRes && style.kind === 'farmhouse' && front && rec && n[0] * rec.n[0] + n[2] * rec.n[2] < -0.9) {
      // rear wall (Monterey plan): patio door + triple window downstairs, triple + small window upstairs
      const sc = sidingCol.clone().multiplyScalar(shade), L = Math.hypot(q[0] - p[0], q[1] - p[1]), dir = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
      wallQuad(wallB.sidingW, p, q, 0, wallH, n, sc, 0, FLOOR);
      const white = new THREE.Color(0xf4f4f2), glass = new THREE.Color(0x34444f);
      const opening = (at, w, y0, y1, panes) => {
        wallPanel(plainB, p, dir, n, at, w + 0.16, y0 - 0.08, y1 + 0.08, white, 0.04);
        wallPanel(plainB, p, dir, n, at, w, y0, y1, glass, 0.06);
        for (let k = 1; k < panes; k++) wallPanel(plainB, p, dir, n, at - w / 2 + w * k / panes, 0.06, y0, y1, white, 0.07);
      };
      const flip = rec.atStart ? 1 : -1, A = t => L / 2 + flip * (t - 0.5) * L;   // keep the kitchen/patio side behind the garage
      opening(A(0.7), 1.9, 0, 2.1, 2);              // sliding patio door (behind the kitchen, garage side)
      opening(A(0.3), 2.4, 0.9, 2.2, 3);            // living-room triple window (door side)
      opening(A(0.33), 2.4, FLOOR + 0.8, FLOOR + 2.1, 3);   // master bedroom triple window
      opening(A(0.8), 0.75, FLOOR + 1.3, FLOOR + 2.0, 1);   // ensuite
      box(plainB, p[0] + dir[0] * A(0.7), p[1] + dir[1] * A(0.7), dir, n, 2.4, 1.2, -0.2, 0.15, new THREE.Color(0xc9c7c0));   // pad outside the patio door
    } else if (isRes && style.kind === 'farmhouse') {
      const sc = sidingCol.clone().multiplyScalar(shade);
      if (isFront) {
        // beige brick ground floor; upstairs siding, with dark board-and-batten under the gable
        wallQuad(wallB.brickW, p, q, 0, FLOOR, n, baseCol.clone().multiplyScalar(shade), 3.2, FLOOR);
        const L = front.L;
        if (gableAt > 0) {
          const g0 = Math.max(0, gableAt - gw / 2), g1 = Math.min(L, gableAt + gw / 2);
          if (g0 > 0.05) { const [a, c] = segOf(p, q, L, 0, g0); wallQuad(wallB.sidingW, a, c, FLOOR, wallH, n, sc, 3.2, FLOOR); }
          { const [a, c] = segOf(p, q, L, g0, g1); wallQuad(wallB.batten, a, c, FLOOR, wallH, n, new THREE.Color(FARM.batten), 2.6, FLOOR); }
          if (g1 < L - 0.05) { const [a, c] = segOf(p, q, L, g1, L); wallQuad(wallB.sidingW, a, c, FLOOR, wallH, n, sc, 3.2, FLOOR); }
        } else wallQuad(wallB.sidingW, p, q, FLOOR, wallH, n, sc, 3.2, FLOOR);
      } else {
        wallQuad(wallB.sidingW, p, q, 0, wallH, n, sc, 4.2, FLOOR);
      }
    } else if (isRes && style.kind === 'modern') {
      if (isFront) {
        // dark stacked stone downstairs; upstairs light siding with a wood-look panel bay at one end
        wallQuad(wallB.stone, p, q, 0, FLOOR, n, baseCol.clone().multiplyScalar(shade), 3.2, FLOOR);
        const L = front.L, ww = Math.min(3.2, L * 0.45), left = idx % 2 === 0;
        const [a0, a1] = left ? [0, ww] : [L - ww, L], [b0, b1] = left ? [ww, L] : [0, L - ww];
        { const [a, c] = segOf(p, q, L, a0, a1); wallQuad(wallB.wood, a, c, FLOOR, wallH, n, new THREE.Color(MODERN.wood).multiplyScalar(shade), 3.2, FLOOR); }
        { const [a, c] = segOf(p, q, L, b0, b1); wallQuad(wallB.siding, a, c, FLOOR, wallH, n, sidingCol.clone().multiplyScalar(shade), 3.2, FLOOR); }
      } else {
        wallQuad(wallB.siding, p, q, 0, wallH, n, new THREE.Color(MODERN.sideWall).multiplyScalar(shade), 4.2, FLOOR);
      }
    } else if (isRes) {
      const sc = sidingCol.clone().multiplyScalar(shade);
      if (isFront && roof === 'pitched') {
        // the street-facing wall: masonry on the ground floor, siding above (or masonry all the way up)
        const full = elev === 2;
        wallQuad(wallB[baseKind], p, q, 0, full ? wallH : FLOOR, n, baseCol.clone().multiplyScalar(shade), 3.2, FLOOR);
        if (!full) wallQuad(wallB.siding, p, q, FLOOR, wallH, n, sc, 3.2, FLOOR);
      } else {
        wallQuad(wallB.siding, p, q, 0, wallH, n, sc, isFront ? 3.2 : 4.2, FLOOR);
      }
    } else if (isShop) {
      const c = shopCol.clone().multiplyScalar(shade);
      wallQuad(shopB, p, q, 0, Math.min(wallH, 4.5), n, c, 4, 4.5);
      if (wallH > 4.5) wallQuad(plainB, p, q, 4.5, wallH, n, c, 0, 0);
    } else {
      wallQuad(wallB.siding, p, q, 0, wallH, n, sidingCol.clone().multiplyScalar(shade), 0, FLOOR);
    }
    if (roof === 'flat') {
      // modern rows: thin dark fascia instead of a tall parapet
      const ph = style.kind === 'modern' ? 0.35 : 0.7;
      const c = style.kind === 'modern' ? new THREE.Color(MODERN.trim) : (isShop ? shopCol : sidingCol).clone().multiplyScalar(shade);
      wallQuad(plainB, p, q, wallH, wallH + ph, n, c, 0, 0);
      wallQuad(plainB, p, q, wallH, wallH + ph, [-n[0], 0, -n[2]], c.clone().multiplyScalar(0.8), 0, 0);
    }
    gridAdd({ kind: 'wall', x1: p[0], z1: p[1], x2: q[0], z2: q[1] }, Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1]));
  }
  if (roof === 'flat') {
    addFlatPoly(plainB, poly, wallH + 0.15, new THREE.Color(style.kind === 'modern' ? 0x5a5c5f : 0x8c8c88));
    if (style.kind !== 'modern') for (let k = 0; k < Math.min(4, Math.floor(area / 250)); k++) {   // rooftop AC units
      const ux = cx + ((hsh >> (k*3)) % 7 - 3) * 1.5, uz = cz + ((hsh >> (k*3+2)) % 7 - 3) * 1.5;
      if (!pointInPoly(ux, uz, poly)) continue;
      box(plainB, ux, uz, [1, 0], [0, 0, 1], 1.6, 1.6, wallH + 0.15, wallH + 1.25, new THREE.Color(0xa9aeb2));
    }
  } else if (roof === 'shed') {
    addFlatPoly(plainB, poly, wallH, roofCol);
  }

  let topY = wallH;
  if (roof === 'pitched') {
    const chimney = !isNew && (hsh % 10) < 2 ? 0.2 + ((hsh >> 4) % 60) / 100 : 0;   // gas-heated new builds have no chimneys
    topY = fill > 0.82 ? gableRoof(o, wallH, roofCol, sidingCol, chimney, roofRise) : hipRoof(poly, wallH, roofCol, cx, cz);
    if (front && isNew) newHouses[newHouses.length - 1].front = front;
    if (rec && fill > 0.82) {
      // garage block roof: low slope from its front eave back into the main roof (meets it 2 m behind the recess)
      const { R, bw, atStart, L, dir, p: P0, n: N } = rec, s = lastRoofSlope, sb = s / 2;
      const [g0, g1] = atStart ? [-0.15, bw] : [L - bw, L + 0.15];
      const at = (a, off, y) => [P0[0] + dir[0] * a + N[0] * off, y, P0[1] + dir[1] * a + N[2] * off];
      const e0 = at(g0, 0.3, wallH - sb * 0.3), e1 = at(g1, 0.3, wallH - sb * 0.3), k1 = at(g1, -2 * R, wallH + s * R), k0 = at(g0, -2 * R, wallH + s * R);
      const rn = upNormal(e0, e1, k1), rc = roofCol.clone().multiplyScalar(0.75 + 0.3 * rn[1]);
      pushTri(roofB, e0, e1, k1, rn, rc, [0, 0], [bw, 0], [bw, 4]); pushTri(roofB, e0, k1, k0, rn, rc, [0, 0], [bw, 4], [0, 4]);
      const bAt = atStart ? bw : L - bw, sideN = atStart ? [dir[0], 0, dir[1]] : [-dir[0], 0, -dir[1]];
      const wc = sidingCol.clone().multiplyScalar(0.85);
      pushTri(wallB.sidingW, at(bAt, 0, wallH), at(bAt, -R, wallH), at(bAt, -R, wallH + sb * R), sideN, wc);
      pushTri(wallB.sidingW, at(bAt, -R, wallH), at(bAt, -R, wallH + sb * R), at(bAt, -2 * R, wallH + s * R), sideN, wc);
      wallQuad(plainB, [e0[0], e0[2]], [e1[0], e1[2]], wallH - sb * 0.3 - 0.2, wallH - sb * 0.3, [N[0], 0, N[2]], new THREE.Color(0xf2f2ee), 0, 0);   // fascia
    }
    if (gableAt > 0) {
      if (style.kind === 'farmhouse') frontGable(rec ? { ...front, p: rec.pR, q: rec.qR } : front, wallH, roofCol, new THREE.Color(FARM.batten), lastRoofSlope, gableAt, 'batten');
      else frontGable(front, wallH, roofCol, sidingCol, lastRoofSlope, gableAt);
    }
    if (front) addEntrance(front, 'house', hsh, style, idx);
  } else if (front && style.kind === 'modern') {
    addEntrance(front, 'house', hsh, style, idx);
  } else if (front && (b.t === 'apartments' || isShop)) {
    addEntrance(front, isShop ? 'shop' : 'apartments', hsh, style, idx);
  }
  // business name sign over the shop front (names from the map; brand logos are left out on purpose)
  // building name on the front; big stores (over 1,500 m2) get a big sign higher up, above the individual shop signs
  if (front && b.n && (isShop || !isRes)) {
    const big = area > 1500;
    shopSign(front, b.n, floorY + Math.min(wallH - (big ? 1.2 : 0.6), big ? 6.5 : 4.2), '#1d2a36', '#ffffff', big ? 1.8 : 0.8);
  }
  // each business inside (strip malls): its own sign on the outside wall nearest to it
  if (b.pois && isShop) for (const [px, pz, name] of b.pois) {
    let best = null;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], ex = q[0] - p[0], ez = q[1] - p[1], L = Math.hypot(ex, ez); if (L < 3) continue;
      const t = Math.max(0, Math.min(1, ((px - p[0]) * ex + (pz - p[1]) * ez) / (L * L))), d = Math.hypot(p[0] + ex * t - px, p[1] + ez * t - pz);
      if (!best || d < best.d) best = { d, p, q, t, L, ex, ez };
    }
    if (!best) continue;
    const half = Math.min(best.L, 7) / 2, c = Math.max(half, Math.min(best.L - half, best.t * best.L)), ux = best.ex / best.L, uz = best.ez / best.L;
    const sp = [best.p[0] + ux * (c - half), best.p[1] + uz * (c - half)], sq = [best.p[0] + ux * (c + half), best.p[1] + uz * (c + half)];
    if (name === b.n) continue;
    shopSign({ p: sp, q: sq, n: outwardNormal(best.p, best.q, poly), L: half * 2 }, name, floorY + Math.min(wallH - 0.6, 3.4), '#1d2a36', '#ffffff', 0.7);
  }
  if (front && style.kind === 'apt' && b.a) shopSign(front, b.a, floorY + 4.1, '#f4f4f2', '#1d2a36');   // street number over the lobby

  const bb = poly.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  gridAdd({ kind: 'bld', poly }, bb[0], bb[1], bb[2], bb[3]);
  if (b.home) Object.assign(homeInfo, { x: cx, z: cz, h: topY + floorY,
    poly, front, floorY, wallH, idx, gableAt, gw, rec });   // INTERIOR hook: shell data for interior.js
});
for (const B of LIFTED) B.lift = 0;
// shared parking lot in the middle of the apartment complex (layout from satellite view): asphalt between the
// buildings, a main aisle with stalls both sides, concrete walks around each building, planted islands with young trees
if (aptBuildings.length >= 3) {
  const pts = aptBuildings.map(a => [a.cx, a.cz]);
  const hull = (() => {   // convex hull of the building centres
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
    const lo = [], hi = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length-2], lo[lo.length-1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of P.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length-2], hi[hi.length-1], p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  })();
  const asphalt = new THREE.Color(0x56585b), lineW = new THREE.Color(0xe8e8e2), concrete = new THREE.Color(0xbdbab3);
  addFlatPoly(drivewayB, hull, 0.08, asphalt);
  // main aisle along the longest diagonal of the lot
  let A = hull[0], B2 = hull[1], best = 0;
  for (const a of hull) for (const b of hull) { const d = Math.hypot(a[0]-b[0], a[1]-b[1]); if (d > best) { best = d; A = a; B2 = b; } }
  const ux = (B2[0] - A[0]) / best, uz = (B2[1] - A[1]) / best, px = -uz, pz = ux;
  const mx = (A[0] + B2[0]) / 2, mz = (A[1] + B2[1]) / 2;
  const P = (s, o) => [mx + ux * s + px * o, mz + uz * s + pz * o];
  const inLot = (x, z) => pointInPoly(x, z, hull) && !inBuilding(x, z, 2.5);
  for (let s2 = -best / 2 + 8; s2 < best / 2 - 8; s2 += 2.7) {
    for (const side of [-1, 1]) {
      const a = P(s2, side * 3.5), b = P(s2, side * 9);
      if (!inLot(a[0], a[1]) || !inLot(b[0], b[1])) continue;
      const w = 0.06;
      flatQuad(drivewayB, [a[0] - ux * w, a[1] - uz * w], [a[0] + ux * w, a[1] + uz * w], [b[0] + ux * w, b[1] + uz * w], [b[0] - ux * w, b[1] - uz * w], 0.095, lineW);
    }
  }
  // planted islands at the ends of the stall rows, each with a young tree
  for (const s2 of [-best / 2 + 6, best / 2 - 6]) for (const side of [-1, 1]) {
    const c = P(s2, side * 6.2);
    if (!inLot(c[0], c[1])) continue;
    box(plainB, c[0], c[1], [ux, uz], [px * side, 0, pz * side], 4.5, 2.2, 0, 0.18, new THREE.Color(0xc4c0b6));
    box(plainB, c[0] + px * side * 0.2, c[1] + pz * side * 0.2, [ux, uz], [px * side, 0, pz * side], 4.0, 1.8, 0, 0.22, new THREE.Color(0x5a3f2c));
    youngTrees.push([c[0] + px * side * 1.1, c[1] + pz * side * 1.1, 4.5, 1.3]);
  }
  // concrete walk around each building, and planting beds with young trees along the street side
  for (const a of aptBuildings) {
    const poly = a.poly;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], n = outwardNormal(p, q, poly), w = 2.2;
      flatQuad(drivewayB, p, q, [q[0] + n[0] * w, q[1] + n[2] * w], [p[0] + n[0] * w, p[1] + n[2] * w], 0.1, concrete);
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (L > 20 && !pointInPoly(p[0] + n[0] * 6 + (q[0] - p[0]) / 2, p[1] + n[2] * 6 + (q[1] - p[1]) / 2, hull))
        for (let t = 0.2; t < 0.9; t += 0.3) youngTrees.push([p[0] + (q[0] - p[0]) * t + n[0] * 4.5, p[1] + (q[1] - p[1]) * t + n[2] * 4.5, 4 + (t * 10 % 2), 1.2]);
    }
  }
}
for (const k of Object.keys(wallB)) finish(wallB[k], new THREE.MeshLambertMaterial({ vertexColors: true, map: texWall[k] }), { cast: true });
finish(shopB, new THREE.MeshLambertMaterial({ vertexColors: true, map: texShop }), { cast: true });
finish(plainB, new THREE.MeshLambertMaterial({ vertexColors: true }), { cast: true });
finish(garageB, new THREE.MeshLambertMaterial({ vertexColors: true, map: texGarage }), { cast: true });
texNumbers.needsUpdate = true;
finish(plaqueB, new THREE.MeshLambertMaterial({ vertexColors: true, map: texNumbers }));
finish(roofB, new THREE.MeshLambertMaterial({ vertexColors: true, map: texRoof, side: THREE.DoubleSide }), { cast: true });
finish(drivewayB, flatMat(1.5), { drape: true });

// contact shading: a soft dark band on the ground along every outside wall (cheap "ambient occlusion"). It multiplies
// whatever is underneath (lawn, driveway, path), darkest at the wall and fading out over 1.4 m.
{
  const aoB = makeBuilder(), W = new THREE.Color(1, 1, 1), BAND = 1.4;
  for (const b of M.buildings) {
    if (b.am === 'shelter') continue;
    let poly = ring(b.p); if (poly.length < 3) continue;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.3) continue;
      const n = outwardNormal(p, q, poly), dx = (q[0] - p[0]) / L * 0.3, dz = (q[1] - p[1]) / L * 0.3;
      const a = [p[0] - dx, 0.16, p[1] - dz], c = [q[0] + dx, 0.16, q[1] + dz];
      const a2 = [a[0] + n[0] * BAND, 0.16, a[2] + n[2] * BAND], c2 = [c[0] + n[0] * BAND, 0.16, c[2] + n[2] * BAND];
      quadUp(aoB, a, c, c2, a2, W, [0, 0], [1, 0], [1, 1], [0, 1]);
    }
  }
  const aoTex = canvasTex(4, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgb(150,150,150)'); gr.addColorStop(0.35, 'rgb(205,205,205)'); gr.addColorStop(1, 'rgb(255,255,255)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  aoTex.wrapS = aoTex.wrapT = THREE.ClampToEdgeWrapping;
  const m = finish(aoB, new THREE.MeshBasicMaterial({ map: aoTex, blending: THREE.MultiplyBlending, transparent: true, depthWrite: false,
    fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16 }), { drape: true, receive: false });
  m.renderOrder = 2;
}

(window.__loadT = window.__loadT || []).push(['buildings', Math.round(performance.now())]);   // load timing (see ?debug)
