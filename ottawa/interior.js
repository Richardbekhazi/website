// interior.js — walk-in interior of the player's own home (owned by the interior session).
// Room layout and sizes follow Minto's published Monterey plan (reference only, nothing copied); everything is
// modelled here from simple boxes. The real house has the garage sticking out ~2 m past the front door; the game's
// exterior is a flat 2-storey box, so the foyer and the front bedrooms are stretched to the front wall.
//
// Local frame: u = across the house (0 = garage side), v = depth from the front wall (0) to the back,
// y = height above the main floor. index.html calls Interior.init(), .onKeyE(), .walk(), .camera().
(function () {
'use strict';
const I = window.Interior = { active: false, ready: false };
let H, T, group, lamp, hud;
let O, A, N, IN, W, D, Y0, doorU;
const walls = [], surfaces = [], rooms = [], builders = {};
const cur = { u: 0, v: 0, y: 0 };
const E = 0.15;                                   // exterior wall thickness inside the shell
let R, BK;                                         // inner faces of the right and back walls
// second-floor ceiling kept under the exterior roof's front eave (about 5.53 m above the main floor)
const F2 = 2.9, BASE = -2.6, CEIL1 = 2.65, CEIL2 = 5.45, CEIL0 = -0.25;
const S = { u0: E, u1: 2.7, uL: 1.37, vB0: 7.0, vM: 8.09, vA1: 9.18 };   // U-shaped stair block (bands B front, A back)

// ---------- colours ----------
// Style follows Minto's "Montgomery" model home as seen by eye in its public 3D tour (reference only, nothing copied):
// pale natural oak floors, warm greige walls, a two-tone kitchen (light oak uppers, navy lowers and island, brass pulls,
// cream tile backsplash, pale quartz), glass globe pendants, carpeted stairs with a dark oak rail on black spindles,
// cream sofa, marble coffee table, floor-to-ceiling taupe drapes.
const C = { wall: 0xf4f2ee, ceil: 0xf6f5f1, trim: 0xf4f3ef, door: 0xf1f0ec, wood: 0xf3eee6, tile: 0xd9d5cd, carpet: 0xb1a797,
  cab: 0xc9a476, navy: 0x29364a, brass: 0xb8913f, quartz: 0xe6e4df, island: 0x29364a, concrete: 0x9a9893, tread: 0xa59d92,
  rail: 0x4a3324, black: 0x1d1e20, steel: 0xb9bcc0, cream: 0xe7e1d6, drape: 0x8c7559, marble: 0xeceae5,
  sofa: 0xe3ddd2, fabric: 0xe0d8ca, bed: 0xf2f0ea, duvet: 0xc9d2da, wood2: 0x7a5a3e, rug: 0xb9a68a, glass: 0xbfd8e8,
  garage: 0xe9e6df, frost: 0xdfe6ea };
// paint colour of each room (soft, lived-in colours instead of one white everywhere). Any wall face built with C.wall is
// repainted after the build with the colour of the room it faces (see paintRooms); closets/outside faces keep C.wall.
// The owner wants every wall white, as in the real house (R49), so the table is empty: all walls use C.wall (white).
// To colour a room again later, add e.g. 'Dining room': 0xaeb999.
const ROOM_PAINT = {};
const paintFaces = [];   // wall faces waiting for their room colour: [first vertex, normal, centre]
const deferredWalls = []; let painting = false;

// ---------- geometry builders (local coordinates) ----------
function bld(k) { return builders[k] || (builders[k] = { pos: [], nor: [], col: [], uv: [] }); }
function tri(b, a, p, q, n, c, ta, tb, tc) {
  const ux = p[0]-a[0], uy = p[1]-a[1], uz = p[2]-a[2], vx = q[0]-a[0], vy = q[1]-a[1], vz = q[2]-a[2];
  if ((uy*vz-uz*vy)*n[0] + (uz*vx-ux*vz)*n[1] + (ux*vy-uy*vx)*n[2] < 0) { let t = p; p = q; q = t; t = tb; tb = tc; tc = t; }
  for (const v of [a, p, q]) { const f = shade(v[1], n); b.pos.push(v[0], v[1], v[2]); b.nor.push(n[0], n[1], n[2]); b.col.push(c.r * f, c.g * f, c.b * f); }
  b.uv.push(ta[0], ta[1], tb[0], tb[1], tc[0], tc[1]);
}
// baked light: on upright faces, 0.78 at the floor rising to 1.0 at the ceiling of that storey; ceilings slightly dimmer
function shade(y, n) {
  if (n[1] > 0.5) return 1;
  if (n[1] < -0.5) return 0.93;
  const [f0, f1] = y < -0.35 ? [BASE, CEIL0] : y < F2 - 0.05 ? [0, CEIL1] : [F2, CEIL2];
  const h = Math.max(0, Math.min(1, (y - f0) / (f1 - f0)));
  return 0.78 + 0.22 * Math.sqrt(h);
}
// a flat quad from 4 corners (u, y, v), normal n, uv per corner (used for the shadow strips, blobs and sun patches)
function quad(k, a, b, c, d, n, uv) { const b_ = bld(k), w = new T.Color(0xffffff); tri(b_, a, b, c, n, w, uv[0], uv[1], uv[2]); tri(b_, a, c, d, n, w, uv[0], uv[2], uv[3]); }
const pendingAO = [], pendingBlob = [], glassOps = [];
const LEVELS = [[BASE, CEIL0], [0, CEIL1], [F2, CEIL2]];
// axis-aligned box: material key, u range, y range, v range, colour; collide = also a solid for the walker
function box(k, u0, u1, y0, y1, v0, v1, color, collide) {
  if (u1 < u0) [u0, u1] = [u1, u0]; if (v1 < v0) [v0, v1] = [v1, v0]; if (y1 < y0) [y0, y1] = [y1, y0];
  if (u1 - u0 < 1e-4 || v1 - v0 < 1e-4 || y1 - y0 < 1e-4) return;
  const wallish = k === 'paint' && color === C.wall;
  if (wallish && !painting) {   // plain walls are drawn later by paintRooms, cut where each room ends
    deferredWalls.push([u0, u1, y0, y1, v0, v1]);
    if (collide) walls.push({ u0, u1, v0, v1, y0, y1 });
    return;
  }
  const b = bld(k), c = new T.Color(color);
  const f = (p0, p1, p2, p3, n, uv) => {
    if (wallish && n[1] === 0) paintFaces.push([b.pos.length / 3, n, [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2, (p0[2] + p2[2]) / 2]]);
    tri(b, p0, p1, p2, n, c, uv[0], uv[1], uv[2]); tri(b, p0, p2, p3, n, c, uv[0], uv[2], uv[3]);
  };
  f([u0,y1,v0], [u1,y1,v0], [u1,y1,v1], [u0,y1,v1], [0,1,0], [[u0,v0],[u1,v0],[u1,v1],[u0,v1]]);
  f([u0,y0,v0], [u1,y0,v0], [u1,y0,v1], [u0,y0,v1], [0,-1,0], [[u0,v0],[u1,v0],[u1,v1],[u0,v1]]);
  f([u0,y0,v0], [u0,y0,v1], [u0,y1,v1], [u0,y1,v0], [-1,0,0], [[v0,y0],[v1,y0],[v1,y1],[v0,y1]]);
  f([u1,y0,v0], [u1,y0,v1], [u1,y1,v1], [u1,y1,v0], [1,0,0], [[v0,y0],[v1,y0],[v1,y1],[v0,y1]]);
  f([u0,y0,v0], [u1,y0,v0], [u1,y1,v0], [u0,y1,v0], [0,0,-1], [[u0,y0],[u1,y0],[u1,y1],[u0,y1]]);
  f([u0,y0,v1], [u1,y0,v1], [u1,y1,v1], [u0,y1,v1], [0,0,1], [[u0,y0],[u1,y0],[u1,y1],[u0,y1]]);
  if (collide) {
    walls.push({ u0, u1, v0, v1, y0, y1 });
    // furniture standing on a floor gets a soft contact shadow (walls are too thin to qualify)
    const fl = LEVELS.find(L => y0 >= L[0] - 0.02 && y0 <= L[0] + 0.12);
    if (fl && y1 - y0 > 0.25 && Math.min(u1 - u0, v1 - v0) >= 0.25 && (u1 - u0) * (v1 - v0) < 5) pendingBlob.push([u0, u1, v0, v1, fl[0]]);
  }
}
const solid = (k, u0, u1, y0, y1, v0, v1, c) => box(k, u0, u1, y0, y1, v0, v1, c, true);
// a wall along u (thin in v) or along v (thin in u), with door/window openings [a0, a1, b0, b1] (along, bottom, top)
function wall(u0, u1, v0, v1, y0, y1, opens = [], color = C.wall) {
  const alongU = (u1 - u0) >= (v1 - v0), a0 = alongU ? u0 : v0, a1 = alongU ? u1 : v1;
  const piece = (s, e, b0, b1) => {
    if (alongU) solid('paint', s, e, b0, b1, v0, v1, color); else solid('paint', u0, u1, b0, b1, s, e, color);
    for (const fl of [BASE, 0, F2]) if (b0 <= fl + 0.02 && b1 >= fl + 0.3) {   // white baseboard, 10 cm
      if (alongU) box('paint', s, e, fl, fl + 0.1, v0 - 0.014, v1 + 0.014, C.trim); else box('paint', u0 - 0.014, u1 + 0.014, fl, fl + 0.1, s, e, C.trim);
      pendingAO.push({ alongU, s, e, lo: alongU ? v0 - 0.014 : u0 - 0.014, hi: alongU ? v1 + 0.014 : u1 + 0.014, y: fl, ceil: false });
    }
    for (const [fl, cl] of LEVELS) if (b1 >= cl - 0.02 && b0 <= cl - 1) pendingAO.push({ alongU, s, e, lo: alongU ? v0 : u0, hi: alongU ? v1 : u1, y: cl, ceil: true, fl });
  };
  let a = a0;
  for (const o of opens.slice().sort((p, q) => p[0] - q[0])) {
    if (o[0] > a) piece(a, o[0], y0, y1);
    if (o[2] > y0) piece(o[0], o[1], y0, o[2]);
    if (o[3] < y1) piece(o[0], o[1], o[3], y1);
    a = Math.max(a, o[1]);
    // white trim around the opening, on both faces
    const t = 0.06, th = alongU ? [v0 - 0.015, v1 + 0.015] : [u0 - 0.015, u1 + 0.015];
    const tr = (s, e, b0, b1) => alongU ? box('paint', s, e, b0, b1, th[0], th[1], C.trim) : box('paint', th[0], th[1], b0, b1, s, e, C.trim);
    // the trim reaches 12 mm into the opening so it lines the jamb; if its face sat exactly on the wall's cut edge the two
    // surfaces would fight for the same pixels and flicker
    // jambs stop under the head and above the sill, so no two trim faces overlap either
    const j = 0.012, sill = o[2] > y0 + 0.05, bot = sill ? o[2] + j : (o[2] > y0 ? o[2] : y0);
    tr(o[0] - t, o[0] + j, bot, o[3] - j); tr(o[1] - j, o[1] + t, bot, o[3] - j); tr(o[0] - t, o[1] + t, o[3] - j, o[3] + t);
    if (o[2] > y0 + 0.05) tr(o[0] - t, o[1] + t, o[2] - 0.04, o[2] + j);   // window sill
    if (o[4] === 'glass') glassOps.push({ alongU, a0: o[0], a1: o[1], y0: o[2], y1: o[3], at: alongU ? (v0 + v1) / 2 : (u0 + u1) / 2 });
    if (o[4] === 'glass' || o[4] === 'frost') {   // a pane in the middle of the wall
      const mid = alongU ? (v0 + v1) / 2 : (u0 + u1) / 2, k = o[4] === 'glass' ? 'glass' : 'paint', col = o[4] === 'glass' ? C.glass : C.frost;
      if (alongU) box(k, o[0], o[1], o[2], o[3], mid - 0.005, mid + 0.005, col); else box(k, mid - 0.005, mid + 0.005, o[2], o[3], o[0], o[1], col);
      const m = (o[0] + o[1]) / 2;   // mullion
      if (alongU) box('paint', m - 0.025, m + 0.025, o[2], o[3], mid - 0.02, mid + 0.02, C.trim); else box('paint', mid - 0.02, mid + 0.02, o[2], o[3], m - 0.025, m + 0.025, C.trim);
    }
  }
  if (a < a1) piece(a, a1, y0, y1);
}
// subtract holes from a rectangle -> list of rectangles [u0,u1,v0,v1]
function cut(rects, h) {
  const out = [];
  for (const r of rects) {
    if (h[1] <= r[0] || h[0] >= r[1] || h[3] <= r[2] || h[2] >= r[3]) { out.push(r); continue; }
    if (h[0] > r[0]) out.push([r[0], h[0], r[2], r[3]]);
    if (h[1] < r[1]) out.push([h[1], r[1], r[2], r[3]]);
    const x0 = Math.max(r[0], h[0]), x1 = Math.min(r[1], h[1]);
    if (h[2] > r[2]) out.push([x0, x1, r[2], h[2]]);
    if (h[3] < r[3]) out.push([x0, x1, h[3], r[3]]);
  }
  return out;
}
function slab(k, rect, holes, y0, y1, color) {
  let rs = [rect]; for (const h of holes) rs = cut(rs, h);
  for (const r of rs) box(k, r[0], r[1], y0, y1, r[2], r[3], color);
}
function floorArea(rect, y, holes = []) { surfaces.push({ r: rect, holes, y: () => y }); }
function ramp(u0, u1, v0, v1, yAtU0, yAtU1) { surfaces.push({ r: [Math.min(u0, u1), Math.max(u0, u1), v0, v1], holes: [], y: u => yAtU0 + (yAtU1 - yAtU0) * (u - u0) / (u1 - u0) }); }
function room(name, y, u0, u1, v0, v1) { rooms.push({ name, y, r: [u0, u1, v0, v1] }); }
// give every wall face the paint of the room in front of it (the smallest room containing a point 10 cm in front of the face)
function paintRooms() {
  painting = true;
  for (const [u0, u1, y0, y1, v0, v1] of deferredWalls) {
    const ym = (y0 + y1) / 2, L = LEVELS.find(l => ym >= l[0] - 0.05 && ym <= l[1] + 0.3);
    const alongU = u1 - u0 >= v1 - v0, a0 = alongU ? u0 : v0, a1 = alongU ? u1 : v1;
    const cuts = new Set([a0, a1]);
    if (L) for (const r of rooms) if (Math.abs(r.y - L[0]) < 0.05)
      for (const e of alongU ? [r.r[0], r.r[1]] : [r.r[2], r.r[3]]) if (e > a0 + 0.02 && e < a1 - 0.02) cuts.add(e);
    const s = [...cuts].sort((p, q) => p - q);
    for (let i = 0; i + 1 < s.length; i++)
      if (alongU) box('paint', s[i], s[i + 1], y0, y1, v0, v1, C.wall); else box('paint', u0, u1, y0, y1, s[i], s[i + 1], C.wall);
  }
  painting = false;
  const b = builders.paint; if (!b) return;
  for (const [i0, n, c] of paintFaces) {
    const L = LEVELS.find(l => c[1] >= l[0] - 0.05 && c[1] <= l[1] + 0.3); if (!L) continue;
    const pu = c[0] + n[0] * 0.1, pv = c[2] + n[2] * 0.1;
    let best = null, area = 1e9;
    for (const r of rooms) {
      if (Math.abs(r.y - L[0]) > 0.05 || pu < r.r[0] || pu > r.r[1] || pv < r.r[2] || pv > r.r[3]) continue;
      const a = (r.r[1] - r.r[0]) * (r.r[3] - r.r[2]); if (a < area) { area = a; best = r; }
    }
    const hex = best && ROOM_PAINT[best.name]; if (!hex) continue;
    const col = new T.Color(hex);
    for (let j = i0; j < i0 + 6; j++) {
      const f = shade(b.pos[j * 3 + 1], n);
      b.col[j * 3] = col.r * f; b.col[j * 3 + 1] = col.g * f; b.col[j * 3 + 2] = col.b * f;
    }
  }
}
// a flight of stairs along u, from (uA, yA) to (uB, yB): n treads, then the landing/floor at yB
function flight(uA, uB, v0, v1, yA, yB, n) {
  ramp(uA, uB, v0, v1, yA, yB);
  for (let k = 0; k < n; k++) {
    const s = uA + (uB - uA) * k / n, e = uA + (uB - uA) * (k + 1) / n, top = yA + (yB - yA) * (k + 1) / (n + 1);
    box('carpet', s, e, top - 0.045, top, v0 + 0.02, v1 - 0.02, C.tread);                 // carpeted tread
    box('carpet', s, e, top - 0.3, top - 0.045, v0 + 0.03, v1 - 0.03, 0x9a9389);          // carpeted riser
  }
}

// ---------- textures ----------
function canvasTex(draw, rep) {
  const c = document.createElement('canvas'); c.width = c.height = 128; draw(c.getContext('2d'));
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; return t;
}
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// real CC0 photo textures (ambientCG) from data/interior-textures.js, loaded by init(); until they arrive (a moment) the
// drawn canvas textures stand in. See tools/interior_textures.py for the sources.
const texWaiters = [];
function photo(tex, key, rep) {
  const apply = () => {
    const src = window.INTERIOR_TEXTURES && window.INTERIOR_TEXTURES[key]; if (!src) return;
    const img = new Image(); img.onload = () => { tex.image = img; tex.repeat.set(rep, rep); tex.needsUpdate = true; }; img.src = src;
  };
  if (window.INTERIOR_TEXTURES) apply(); else texWaiters.push(apply);
  return tex;
}
const flat = () => canvasTex(g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); }, 1);
function softTex(kind) {   // alpha masks for the soft shadows: 'strip' fades from one edge, 'blob' is a soft-edged rectangle
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  if (kind === 'strip') { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, '#777'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  else { g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); g.filter = 'blur(7px)'; g.fillStyle = '#fff'; g.fillRect(14, 14, 36, 36); }
  return new T.CanvasTexture(c);
}
function makeMaterials() {
  const lam = o => new T.MeshLambertMaterial(Object.assign({ vertexColors: true }, o));
  const wood = canvasTex(g => {   // wide oak planks
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) {
      for (let x = (y / 16 % 2) * 40 - 40; x < 128; x += 80) { g.fillStyle = `rgba(60,35,10,${0.04 + rnd() * 0.12})`; g.fillRect(x, y, 80, 16); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y, 1, 16); }
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, y, 128, 1);
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(70,40,10,0.10)'; g.fillRect(0, y + 2 + rnd() * 12, 128, 1); }
    }
  }, 0.75);
  const carpet = canvasTex(g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    for (let k = 0; k < 2600; k++) { const v = 200 + rnd() * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * 128, rnd() * 128, 1.5, 1.5); } }, 1);
  const tile = canvasTex(g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 0, 128, 2); g.fillRect(0, 64, 128, 2); g.fillRect(0, 0, 2, 128); g.fillRect(64, 0, 2, 128);
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.04})`; g.fillRect(rnd() * 128, rnd() * 128, 3, 3); } }, 0.85);
  // floors and slabs are pushed back a hair in depth, so where a slab edge or floor meets a wall/furniture face, the wall wins
  // (otherwise coplanar faces flicker)
  const back = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
  photo(wood, 'oak', 0.45); photo(carpet, 'carpet', 0.8); photo(tile, 'tile', 0.42);
  const plaster = photo(flat(), 'plaster', 0.6), marble = photo(flat(), 'marble', 0.7), fabric = photo(flat(), 'fabric', 3);
  const shadow = (tex, op) => new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: op, depthWrite: false, alphaMap: tex,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const strip = softTex('strip'), blob = softTex('blob');
  return { paint: lam({ map: plaster }), ceil: lam(Object.assign({ emissive: 0x77746e, map: plaster }, back)), wood: lam(Object.assign({ map: wood }, back)),
    carpet: lam(Object.assign({ map: carpet }, back)), tile: lam(Object.assign({ map: tile }, back)),
    marble: lam({ map: marble }), fabric: lam({ map: fabric }),
    ao: shadow(strip, 0.34), aoCeil: shadow(strip, 0.12), blob: shadow(blob, 0.42),
    sun: new T.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0.2, depthWrite: false, alphaMap: blob,
      blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    glass: lam({ transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide }),
    glow: new T.MeshBasicMaterial({ vertexColors: true }) };
}

// ---------- where the game's facade draws its windows (same rule as index.html's wall textures) ----------
// each texture tile is one window bay; the window frame covers 34..94 of 128 px across and 20..92 of 128 px down
const winAcross = (c, bayLen) => [c - bayLen * 30 / 128, c + bayLen * 30 / 128];
const SILL = F2 * (1 - 92 / 128), HEAD = F2 * (1 - 20 / 128);
function frontUpperWindows(Lf, gableAt, gw, flip) {
  const segs = [];
  if (gableAt > 0) {
    const g0 = Math.max(0, gableAt - gw / 2), g1 = Math.min(Lf, gableAt + gw / 2);
    if (g0 > 0.05) segs.push([0, g0, 3.2]); segs.push([g0, g1, 2.6]); if (g1 < Lf - 0.05) segs.push([g1, Lf, 3.2]);
  } else segs.push([0, Lf, 3.2]);
  const out = [];
  for (const [a, b, bw] of segs) {
    const len = b - a, n = Math.round(len / bw);
    for (let k = 0; k < n; k++) { const [s, e] = winAcross(a + len * (k + 0.5) / n, len / n); out.push(flip ? [Lf - e, Lf - s] : [s, e]); }
  }
  return out;
}

// ---------- the house ----------
// rear-wall openings exactly where index.html draws them (Monterey rear: patio door, triple windows, ensuite)
function rearOpenings(hk) {
  const rc = hk.rec, poly = hk.poly; if (!rc) return null;
  let best = null;
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k], q = poly[(k + 1) % poly.length], m = toLocal((p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    if (!best || m.v > best.v) best = { v: m.v, p, q };
  }
  const { p, q } = best, Lr = Math.hypot(q[0] - p[0], q[1] - p[1]), flip = rc.atStart ? 1 : -1;
  const at = t => { const a = Lr / 2 + flip * (t - 0.5) * Lr; return toLocal(p[0] + (q[0] - p[0]) * a / Lr, p[1] + (q[1] - p[1]) * a / Lr).u; };
  const op = (t, w, y0, y1, kind) => { const c = at(t); return [c - w / 2, c + w / 2, y0, y1, kind]; };
  // keep in step with index.html: patio door opening(A(0.7)), living-room triple window opening(A(0.3))
  return { ground: [op(0.7, 1.9, 0, 2.1, 'glass'), op(0.3, 2.4, 0.9, 2.2, 'glass')],
           upper: [op(0.33, 2.4, F2 + 0.8, F2 + 2.1, 'glass'), op(0.8, 0.75, F2 + 1.3, F2 + 2.0, 'frost')] };
}
let RZ = 0, G0 = 3.2, G1 = 3.33;   // front of the recessed (door) half; the garage/house wall
function build(hk) {
  const L = hk.front.L, rc = hk.rec;
  // garage block (garage below, bedroom 2 above) on the front line; the door half set back RZ (from index.html)
  const bw = rc ? rc.bw : 3.33; RZ = rc ? rc.R : 0; G0 = bw - 0.15; G1 = bw - 0.02;
  doorU = bw + (L - bw) * 0.4;
  const gU = bw / 2;
  // front windows drawn by the facade textures: one bay per segment (see winAcross)
  const recWin = winAcross((bw + L) / 2, L - bw), blockWin = winAcross(bw / 2, bw);
  const rear = rearOpenings(hk) || { ground: [[0.85, 2.35, 0, 2.1, 'glass'], [4.0, 5.5, SILL, HEAD, 'glass']],
    upper: [[4.0, 5.5, F2 + SILL, F2 + HEAD, 'glass'], [1.15, 2.05, F2 + 1.3, F2 + 2.0, 'frost']] };
  I.rear = rear;
  const porch = [G0, W, -1, RZ + E];   // outside, in front of the recessed half

  // ===== exterior walls (just inside the shell), all floors =====
  wall(0, bw, 0.05, E, -0.3, CEIL1);                                                   // garage block, ground
  wall(0, bw, 0.05, E, F2, CEIL2, [[blockWin[0], blockWin[1], F2 + SILL, F2 + HEAD, 'glass']]);
  wall(G0, W, RZ + 0.05, RZ + E, -0.3, CEIL1, [[doorU - 0.48, doorU + 0.48, 0, 2.15], [doorU + 0.62, recWin[1], SILL, HEAD, 'glass']]);
  wall(G0, W, RZ + 0.05, RZ + E, F2, CEIL2, [[recWin[0], recWin[1], F2 + SILL, F2 + HEAD, 'glass']]);
  wall(0, W, BK, D - 0.05, 0, CEIL1, rear.ground);
  wall(0, W, BK, D - 0.05, F2, CEIL2, rear.upper);
  wall(0, W, BK, D - 0.05, BASE, CEIL0, [[3.6, 4.6, -0.95, -0.45, 'frost']]);
  wall(0.05, E, 0, D, -0.3, CEIL2); wall(0.05, E, 4.4, D, BASE, -0.3);
  wall(R, W - 0.05, RZ, D, -0.3, CEIL2); wall(R, W - 0.05, 4.4, D, BASE, -0.3);

  // ===== slabs: basement floor, main floor, second floor, top ceiling =====
  const stairHole = [S.u0, S.u1, S.vB0, S.vA1];
  slab('paint', [E, R, 4.4, BK], [stairHole], BASE - 0.15, BASE - 0.012, C.concrete);
  slab('ceil', [E, R, E, BK], [stairHole, [E, G0, E, 6.73], porch], CEIL0, -0.012, C.ceil);
  slab('ceil', [E, R, E, BK], [stairHole, porch], CEIL1, F2 - 0.012, C.ceil);
  slab('ceil', [E, R, E, BK], [porch], CEIL2, CEIL2 + 0.15, C.ceil);
  box('paint', E, G0, -0.45, -0.3, E, 6.73, C.concrete);                  // garage floor (a step down)
  box('paint', E, R, BASE, CEIL0, E, 4.4, 0x8f8b84);                      // unexcavated ground under the front
  box('paint', E, 2.72, BASE, CEIL0, 4.4, 6.73, 0x8f8b84);

  // ===== MAIN FLOOR =====
  // finishes: oak everywhere, tile in the foyer and powder room
  slab('wood', [G1, R, RZ + E, BK], [], -0.012, 0, C.wood);
  box('wood', E, G1, -0.012, 0, 9.18, BK, C.wood);
  box('wood', 2.7, G1, -0.012, 0, 6.86, 9.18, C.wood);
  box('tile', G1, R, 0, 0.004, RZ + E, 4.51, C.tile);
  box('tile', 4.58, R, 0, 0.004, 4.64, 6.66, C.tile);
  // (kitchen floor is oak like the rest of the open main floor, as in the Montgomery model)
  floorArea([E, R, E, BK], 0, [stairHole, [E, G0, E, 6.73], porch]);
  floorArea([E, G0, E, 6.73], -0.3);
  // garage: wall to the house with a door, back wall; the closed garage door on the inside of the front wall
  wall(G0, G1, E, 6.73, -0.3, CEIL1, [[RZ + 0.75, RZ + 1.6, -0.3, 2.05]]);
  box('paint', G0 - 0.35, G0, -0.3, -0.15, RZ + 0.7, RZ + 1.65, C.concrete);   // step up from the garage
  wall(E, 2.7, 6.73, 7.0, BASE, CEIL2);                                  // stair front wall, all floors
  wall(2.7, G1, 6.73, 6.86, -0.3, CEIL1);
  box('paint', gU - 1.3, gU + 1.3, -0.3, 1.9, E, E + 0.04, C.garage);
  for (let y = 0.2; y < 1.9; y += 0.52) box('paint', gU - 1.3, gU + 1.3, -0.3 + y, -0.27 + y, E + 0.04, E + 0.05, 0xc9c6bf);
  solid('paint', E, 0.55, -0.3, 1.7, 1.2, 4.8, 0x8c7a62);               // garage shelving
  box('paint', 0.9, 2.6, -0.3, -0.29, 2.0, 5.5, 0x7d7b77);               // oil stain / mat
  // foyer: coat closet with sliding doors, front door
  solid('paint', R - 0.62, R, 0, 2.4, RZ + 0.5, 4.4, C.wall);
  box('paint', R - 0.64, R - 0.62, 0.02, 2.1, RZ + 0.55, 4.35, C.door);
  box('paint', doorU - 0.47, doorU + 0.47, 0, 2.14, RZ + 0.08, RZ + 0.12, 0x2d2f33);          // front door (inside face)
  box('paint', doorU + 0.28, doorU + 0.38, 0.95, 1.05, RZ + 0.12, RZ + 0.16, C.steel);
  box('paint', doorU - 0.6, doorU + 0.6, 0.004, 0.012, RZ + 0.3, RZ + 1.0, 0x5a554e);         // door mat
  // powder room
  wall(4.45, R, 4.51, 4.64, 0, CEIL1);
  wall(4.45, 4.58, 4.51, 6.79, 0, CEIL1, [[5.3, 6.1, 0, 2.05]]);
  wall(4.45, R, 6.66, 6.79, 0, CEIL1);
  box('paint', 4.6, 4.64, 0, 2.03, 6.1, 6.9 - 0.12, C.door);             // door, open against the wall
  toilet(R - 0.68, R, 5.5, 0, 'u+');
  vanity('u-', R, 4.72, 5.25, 0, 0.45);
  accentWall('v-', 6.66, 4.58, R, 0.1, CEIL1);                               // navy wall behind the toilet
  bench(G1, G1 + 0.4, 3.75, 4.45, 0);                                         // foyer bench under the picture
  // stairs: up (band B) to the landing, back (band A) to the second floor; down to the basement under them
  flight(S.u1, S.uL, S.vB0, S.vM, 0, 1.45, 6);
  floorArea([S.u0, S.uL, S.vB0, S.vA1], 1.45);
  box('paint', S.u0, S.uL, 1.2, 1.41, S.vB0, S.vA1, C.trim); box('carpet', S.u0, S.uL, 1.41, 1.45, S.vB0 + 0.01, S.vA1 - 0.01, C.tread);
  flight(S.uL, S.u1, S.vM, S.vA1, 1.45, F2, 6);
  flight(S.u1, S.uL, S.vM, S.vA1, 0, -1.3, 5);
  floorArea([S.u0, S.uL, S.vB0, S.vA1], -1.3);
  box('paint', S.u0, S.uL, -1.55, -1.34, S.vB0, S.vA1, C.trim); box('carpet', S.u0, S.uL, -1.34, -1.3, S.vB0 + 0.01, S.vA1 - 0.01, C.tread);
  box('paint', S.u0, S.uL, BASE, -1.55, S.vB0, S.vA1, 0xd8d4cc);          // storage under the landing
  flight(S.uL, S.u1, S.vB0, S.vM, -1.3, BASE, 5);
  wall(S.uL, S.u1, S.vM - 0.03, S.vM + 0.03, BASE, F2);                    // wall between the flights
  railing(S.uL, S.u1, S.vM - 0.03, S.vM + 0.03, F2);                        // open railing upstairs (Minto standard style)
  wall(E, S.u1, S.vA1, S.vA1 + 0.12, BASE, CEIL2);                       // stair back wall (kitchen side), all floors
  // kitchen: tall fridge + pantry, base cabinets with sink, island with breakfast bar, upper cabinets
  solid('paint', E, 0.85, 0, 1.85, 9.3, 10.15, C.steel);
  solid('paint', E, 0.8, 0, 2.3, BK - 0.62, BK, C.cab);
  solid('paint', E, 0.75, 0, 0.88, 10.15, BK - 0.62, C.navy); box('marble', E, 0.78, 0.88, 0.92, 10.15, BK - 0.62, C.quartz);
  box('paint', 0.3, 0.6, 0.86, 0.93, 11.9, 12.6, C.steel);                // sink
  box('paint', E, 0.5, 1.45, 2.3, 10.15, BK - 0.62, C.cab);               // uppers
  box('paint', E, 0.17, 0.92, 1.45, 10.15, BK - 0.62, 0xe9dcc4);          // cream tile backsplash
  for (let y = 1.0; y < 1.45; y += 0.075) box('paint', 0.17, 0.172, y, y + 0.003, 10.15, BK - 0.62, 0xd2c4aa);   // tile courses
  solid('paint', 1.95, 2.8, 0, 0.88, 10.4, 13.0, C.island); box('marble', 1.9, 2.95, 0.88, 0.92, 10.35, 13.05, C.quartz);
  for (const v of [10.8, 11.5, 12.2]) stool(3.15, v);
  for (let k = 0; k < 4; k++) { const vc = 10.6 + k * 0.62 + 0.3; box('paint', 1.925, 1.95, 0.7, 0.72, vc - 0.12, vc + 0.12, C.brass); }   // island pulls
  // dining and living rooms
  table(4.9, 8.0); rug(3.6, 5.9, 10.6, 13.6);
  sofa(3.45, 11.0, 13.2);
  solid('marble', 4.7, 5.35, 0, 0.4, 11.55, 12.65, C.marble);                                  // marble block coffee table
  for (const [a, b, c, d] of [[4.75, 5.1, 11.7, 11.72], [4.9, 5.3, 12.2, 12.22], [4.72, 4.74, 11.9, 12.5]]) box('paint', a, b, 0.4, 0.402, c, d, 0x9a9690);   // veins
  bowl(5.0, 12.05, 0.47, 0.16, 0x2a2a2a);                                                    // bowl
  loungeChair(5.4, 13.75); velvetChair(4.9, 10.35);
  floorLamp(3.7, 13.65);
  for (const o of I.rear.ground) drapes(o[0], o[1], BK, 0, CEIL1);
  solid('paint', R - 0.42, R, 0, 0.5, 11.0, 13.0, C.wood2); box('paint', R - 0.1, R - 0.05, 0.85, 1.6, 11.3, 12.7, C.black);
  // details: cabinet doors and handles, range and hood, fridge handles, island pendants, pictures, plants
  cabFronts(0.75, 10.15, BK - 0.62, 0, 0.88, 0.78);
  cabFronts(0.5, 10.15, 10.6, 1.45, 2.3, 1.55, 0x9a7a52); cabFronts(0.5, 11.35, BK - 0.62, 1.45, 2.3, 1.55, 0x9a7a52);
  cabFronts(0.8, BK - 0.62, BK, 0, 2.3, 1.1, 0x9a7a52);
  box('paint', 0.18, 0.72, 0.92, 0.935, 10.62, 11.33, C.black);                              // cooktop
  box('paint', E, 0.58, 1.62, 1.75, 10.6, 11.35, C.steel); box('paint', E, 0.35, 1.75, 2.3, 10.75, 11.2, C.steel);   // hood
  box('paint', 0.85, 0.88, 0.6, 1.5, 9.38, 9.41, 0x55585c); box('paint', 0.85, 0.88, 0.6, 1.5, 10.07, 10.1, 0x55585c);
  box('paint', 0.85, 0.852, 0.02, 1.83, 9.725, 9.735, 0x8d9094);                              // French-door seam
  for (const v of [10.9, 11.7, 12.5]) pendant(2.37, v, CEIL1, 1.55);
  for (const v of [10.0, 12.6]) ceilingLight(1.0, v, CEIL1, 0.08);
  pendant(4.9, 8.0, CEIL1, 1.7);
  for (const [u, v] of [[3.6, 10.6], [5.4, 10.6], [3.6, 13.3], [5.4, 13.3], [3.9, 5.6], [5.5, 3.3]]) ceilingLight(u, v, CEIL1, 0.07);
  art('u-', R, 8.0, 1.5, 1.1, 0.75, 0x6b8fa3);
  art('u+', G1, 4.05, 1.5, 0.5, 0.65, 0xa8794f);
  plant(R - 0.3, 13.75, 0, 1.3); plant(3.05, BK - 0.3, 0, 0.9);
  box('paint', R - 0.11, R - 0.1, 0.83, 1.62, 11.28, 12.72, 0x111316);                      // TV bezel
  room('Garage', 0, E, G0, E, 6.73); room('Foyer', 0, G1, R, RZ + E, 4.51); room('Powder room', 0, 4.58, R, 4.64, 6.66);
  room('Stairs', 0, S.u0, S.u1, S.vB0, S.vA1); room('Kitchen', 0, E, 2.84, 9.3, BK); room('Dining room', 0, 2.7, R, 6.79, 9.6);
  room('Hall', 0, G1, 4.45, 4.51, 6.79); room('Living room', 0, 2.84, R, 9.6, BK);

  // ===== SECOND FLOOR =====
  slab('carpet', [E, R, E, BK], [stairHole, porch], F2 - 0.012, F2, C.carpet);
  box('tile', E, 2.45, F2, F2 + 0.004, 11.43, BK, C.tile);                   // ensuite
  box('tile', 3.68, R, F2, F2 + 0.004, 8.5, 9.93, C.tile);                   // bath 2
  box('tile', 4.15, R, F2, F2 + 0.004, 6.2, 8.25, C.tile);                   // laundry
  floorArea([E, R, E, BK], F2, [stairHole, porch]);
  const y2 = [F2, CEIL2], dr = (a, b) => [a, b, F2, F2 + 2.05];
  solid('paint', E, 2.25, F2, CEIL2, 6.1, 6.73, C.wall);                     // bedroom 2 closet
  box('paint', 0.3, 2.15, F2 + 0.02, F2 + 2.1, 6.08, 6.1, C.door);
  box('paint', 2.25, G0, F2 + 2.05, CEIL2, 6.1, 6.22, C.wall);               // header over bedroom 2 door
  wall(G0, G1, E, 6.1, ...y2);                                               // bedroom 2 / bedroom 3 (and the return wall)
  wall(G1, 4.3, 5.3, 5.43, ...y2, [dr(3.42, 4.2)]);
  solid('paint', 4.3, R, F2, CEIL2, 5.3, 6.05, C.wall);                       // bedroom 3 closet
  box('paint', 4.45, R - 0.1, F2 + 0.02, F2 + 2.1, 5.28, 5.3, C.door);
  wall(4.15, R, 6.05, 6.2, ...y2);
  wall(4.02, 4.15, 6.05, 8.38, ...y2, [dr(6.4, 7.2)]);                       // laundry
  wall(4.15, R, 8.25, 8.38, ...y2);
  solid('paint', 3.6, 4.02, F2, CEIL2, 7.55, 8.38, C.wall); box('paint', 3.58, 3.6, F2 + 0.02, F2 + 2.05, 7.65, 8.3, C.door);   // linen
  wall(3.55, R, 8.38, 8.5, ...y2);
  wall(3.55, 3.68, 8.38, 9.93, ...y2, [dr(8.6, 9.4)]);                       // bathroom 2
  wall(2.45, R, 9.93, 10.06, ...y2, [dr(2.75, 3.5)]);                        // master bedroom
  wall(2.45, 2.58, 9.3, BK, ...y2, [dr(10.3, 11.05), dr(11.7, 12.45)]);     // walk-in closet + ensuite doors
  wall(E, 2.45, 11.3, 11.43, ...y2);
  railing(S.u1 - 0.03, S.u1 + 0.03, S.vB0, S.vM, F2);                       // stair guard: oak handrail, white spindles
  // doors standing open
  box('paint', 3.42, 3.46, F2, F2 + 2.03, 4.5, 5.28, C.door);
  box('paint', 4.15, 4.19, F2, F2 + 2.03, 7.2, 7.95, C.door);
  box('paint', 3.68, 3.72, F2, F2 + 2.03, 9.4, 9.9, C.door);
  box('paint', 3.5, 4.2, F2, F2 + 2.03, 10.06, 10.1, C.door);
  // master bedroom: queen bed against the party wall, night tables, dresser
  accentWall('u-', R, 10.1, BK, F2 + 0.1, CEIL2);                             // navy wall behind the bed
  bed(R, 12.25, 1.55, 2.05, false, 0xf3f1ec); nightTable(R - 0.45, 11.0); nightTable(R - 0.45, 13.5);
  dresser(2.58, 12.3, 13.8, F2, 1);
  bench(3.85, 4.2, 11.6, 12.9, F2);
  rug(3.3, 5.9, 10.9, 13.6, F2);
  drapes(I.rear.upper[0][0], I.rear.upper[0][1], BK, F2, CEIL2);
  // ensuite: shower in the back corner, toilet, double vanity; walk-in closet shelves
  solid('glass', E, 1.25, F2, F2 + 2.0, 13.1, 13.13, C.glass);
  box('paint', 1.22, 1.25, F2, F2 + 2.0, 13.08, 13.15, C.brass);                         // glass panel edge
  box('tile', E, 1.25, F2, F2 + 0.06, 13.13, BK, 0xe9e7e2);
  wallTile('u+', E, 13.13, BK, F2 + 0.06, F2 + 2.1); wallTile('v-', BK, E, 1.25, F2 + 0.06, F2 + 2.1);
  box('paint', E, E + 0.25, F2 + 1.95, F2 + 1.98, 13.75, 13.85, C.brass); box('paint', 0.3, 0.42, F2 + 1.9, F2 + 1.95, 13.7, 13.9, C.brass);   // rain head
  toilet(E, E + 0.68, 12.6, F2, 'u-');
  vanity('u+', E, 11.48, 12.27, F2);
  // walk-in closet: oak drawers low, brass rod, hanging clothes, a shelf on top (solid for walking)
  for (const [u0, u1, v0, v1, dir] of [[E, 0.58, 9.4, 11.2, 1], [1.87, 2.45, 9.4, 10.2, -1]]) {
    walls.push({ u0, u1, v0, v1, y0: F2, y1: F2 + 2.0 });
    const back = dir > 0 ? u0 : u1, f = dir > 0 ? u1 : u0;
    box('paint', back, f, F2, F2 + 0.75, v0, v1, C.cab);
    box('paint', back, f, F2 + 1.9, F2 + 1.93, v0, v1, C.cab);
    box('paint', back + dir * 0.28, back + dir * 0.3, F2 + 1.82, F2 + 1.84, v0, v1, C.brass);
    const cols = [0x2c3a55, 0xe6e1d8, 0x8c7559, 0x3b3b3e, 0xb8a58a, 0x6d7c8c, 0xf2efe9, 0x5a4636];
    for (let v = v0 + 0.03, k = 0; v < v1 - 0.06; v += 0.07, k++) box('paint', back + dir * 0.06, back + dir * 0.52, F2 + (k % 3 ? 1.0 : 1.2), F2 + 1.82, v, v + 0.055, cols[k % cols.length]);
  }
  // bathroom 2: tub along the side wall, toilet, vanity
  solid('paint', R - 0.78, R, F2, F2 + 0.55, 8.5, 9.93, 0xf6f6f4); box('paint', R - 0.7, R - 0.08, F2 + 0.5, F2 + 0.56, 8.58, 9.85, 0xcfe0e8);
  wallTile('u-', R, 8.5, 9.93, F2 + 0.55, F2 + 2.1);                                     // tub surround
  box('paint', R - 0.86, R - 0.84, F2 + 1.95, F2 + 1.97, 8.5, 9.93, C.brass);           // curtain rod
  box('paint', R - 0.88, R - 0.84, F2 + 0.6, F2 + 1.95, 8.52, 8.9, 0xe7e1d6);             // shower curtain, pulled back
  toilet(3.68, 4.36, 9.65, F2, 'u-');
  vanity('v+', 8.5, 4.4, 5.1, F2, 0.5);
  // laundry: washer and dryer
  frontLoader(R, 6.35, 7.05, F2, -1); frontLoader(R, 7.1, 7.8, F2, -1);
  box('marble', R - 0.68, R, F2 + 0.95, F2 + 0.98, 6.3, 7.85, C.quartz);                   // folding counter
  box('paint', R - 0.38, R, F2 + 1.5, F2 + 2.2, 6.3, 7.85, C.cab);                         // oak upper cabinet
  for (const v of [6.9, 7.25]) box('paint', R - 0.405, R - 0.38, F2 + 1.55, F2 + 1.7, v - 0.008, v + 0.008, C.brass);
  // bedrooms 2 and 3
  bed(E, 3.3, 1.4, 2.0, true, 0xd9d2c5); nightTable(E + 0.25, 1.95, true); desk(1.7, 2.3, 0.5, 1.7, F2);
  rug(0.6, 2.9, 2.2, 4.4, F2);
  bed(R, RZ + 1.75, 1.4, 2.0, false, 0xe8e4dc); dresser(G1 + 0.02, RZ + 0.3, RZ + 1.4, F2, 1, 0.9, 0.45);
  rug(3.9, 5.9, RZ + 0.9, RZ + 2.6, F2);
  drapes(blockWin[0], blockWin[1], E, F2, CEIL2, true); drapes(recWin[0], recWin[1], RZ + E, F2, CEIL2, true);
  art('u-', R - 0.006, 12.25, F2 + 1.6, 1.3, 0.6, 0xd8cbb5);
  art('u+', E, 3.3, F2 + 1.5, 0.9, 0.6, 0xc49a6c);
  art('u-', R, RZ + 1.75, F2 + 1.5, 0.8, 0.55, 0x7f9bb5);
  art('u+', 2.58, 7.7, F2 + 1.5, 0.6, 0.8, 0xb46f5a);
  plant(2.85, BK - 0.35, F2, 1.0);
  room('Bedroom 2', F2, E, G0, E, 6.1); room('Bedroom 3', F2, G1, R, RZ + E, 5.3); room('Laundry', F2, 4.15, R, 6.2, 8.25);
  room('Bathroom', F2, 3.68, R, 8.5, 9.93); room('Master bedroom', F2, 2.58, R, 10.06, BK); room('Walk-in closet', F2, E, 2.45, 9.3, 11.3);
  room('Ensuite', F2, E, 2.45, 11.43, BK); room('Stairs', F2, S.u0, S.u1, S.vB0, S.vA1); room('Upstairs hall', F2, 2.45, 4.02, 5.43, 9.93);

  // ===== BASEMENT (finished: family room, half bath, utility room) =====
  slab('carpet', [E, R, 6.83, BK], [stairHole], BASE - 0.012, BASE, 0xa9a49b);
  box('tile', 4.88, R, BASE, BASE + 0.004, 7.0, 9.0, C.tile);
  floorArea([E, R, 6.83, BK], BASE, [stairHole]);
  floorArea([2.85, R, 4.5, 6.83], BASE);
  wall(2.85, R, 4.4, 4.5, BASE, CEIL0);
  wall(2.72, 2.85, 4.4, 7.0, BASE, CEIL0);
  wall(2.85, R, 6.7, 6.83, BASE, CEIL0, [[3.2, 4.0, BASE, BASE + 2.05]]);
  wall(S.u1, S.u1 + 0.06, S.vM, S.vA1, BASE, CEIL0);                        // closes the space under the stairs
  wall(4.75, 4.88, 6.83, 9.0, BASE, CEIL0, [[7.3, 8.05, BASE, BASE + 2.05]]);
  wall(4.75, R, 9.0, 9.13, BASE, CEIL0);
  toilet(R - 0.68, R, 8.4, BASE, 'u+'); vanity('u-', R, 7.1, 7.75, BASE, 0.45);
  solid('paint', R - 0.85, R - 0.1, BASE, BASE + 1.5, 5.3, 6.0, 0xb9bcc0);   // furnace
  solid('paint', R - 0.6, R - 0.1, BASE, BASE + 1.5, 4.6, 5.1, 0xdedcd6);     // water heater
  solid('paint', 3.0, 3.5, BASE, BASE + 1.8, 4.6, 5.8, 0x8c7a62);             // storage shelves
  rug(0.8, 3.6, 10.3, 13.0, BASE);
  sofaBack(0.6, 3.8, BK - 0.95, BASE);
  solid('marble', 1.6, 2.8, BASE, BASE + 0.4, 12.2, 12.85, C.marble);                          // coffee table
  accentWall('v+', 9.3, E, S.u1, BASE + 0.1, CEIL0);                                         // navy TV wall
  solid('paint', 0.5, 2.9, BASE, BASE + 0.5, 9.32, 9.78, C.cab);                            // oak media unit
  for (const u of [1.1, 1.7, 2.3]) box('paint', u - 0.004, u + 0.004, BASE + 0.05, BASE + 0.45, 9.78, 9.786, 0x9a7a52);
  box('paint', 0.85, 2.75, BASE + 0.8, BASE + 1.85, 9.32, 9.37, 0x111316);                  // big TV
  art('v-', BK, 2.2, BASE + 1.55, 1.4, 0.65, 0xb5835a);
  plant(3.9, BK - 0.35, BASE, 1.1);
  room('Family room', BASE, E, R, 6.83, BK); room('Half bath', BASE, 4.88, R, 7.0, 9.0); room('Utility room', BASE, 2.85, R, 4.5, 6.7);
  room('Stairs', BASE, S.u0, S.u1, S.vB0, S.vA1);
  for (const r of rooms) {
    if (['Stairs', 'Kitchen', 'Dining room', 'Living room'].includes(r.name)) continue;   // these have pendants or pot lights
    const ceil = r.y === F2 ? CEIL2 : r.y === BASE ? CEIL0 : CEIL1, small = (r.r[1] - r.r[0]) * (r.r[3] - r.r[2]) < 6;
    ceilingLight((r.r[0] + r.r[1]) / 2, (r.r[2] + r.r[3]) / 2, ceil, small ? 0.14 : 0.22);
  }
}
// an open guard: dark oak handrail and newels, black metal spindles every 11 cm, a shoe rail and newel posts; solid for walking
function railing(u0, u1, v0, v1, y) {
  const alongU = (u1 - u0) >= (v1 - v0), a0 = alongU ? u0 : v0, a1 = alongU ? u1 : v1, m = alongU ? (v0 + v1) / 2 : (u0 + u1) / 2;
  const B = (s, e, b0, b1, h, col, k = 'paint') => alongU ? box(k, s, e, b0, b1, m - h, m + h, col) : box(k, m - h, m + h, b0, b1, s, e, col);
  B(a0, a1, y + 0.9, y + 0.95, 0.04, C.rail, 'wood');
  B(a0, a1, y, y + 0.06, 0.035, C.rail, 'wood');
  const n = Math.max(2, Math.round((a1 - a0) / 0.11));
  for (let k = 1; k < n; k++) { const c = a0 + (a1 - a0) * k / n; B(c - 0.007, c + 0.007, y + 0.06, y + 0.9, 0.007, 0x1b1b1c); }
  for (const c of [a0 + 0.045, a1 - 0.045]) B(c - 0.045, c + 0.045, y, y + 1.02, 0.045, C.rail, 'wood');
  walls.push({ u0, u1, v0, v1, y0: y, y1: y + 0.95 });
}
// after build(): turn the recorded walls/furniture/windows into shadow strips, contact shadows and sun patches
function finishLight() {
  const W_ = 0.32, onFloor = (u, v, y) => { const f = floorY(u, v, y); return f !== null && Math.abs(f - y) < 0.06; };
  for (const st of pendingAO) {
    for (const dir of [-1, 1]) {
      const at = dir < 0 ? st.lo : st.hi, out = at + dir * W_, mid = (st.s + st.e) / 2, test = at + dir * 0.18;
      const fl = st.ceil ? st.fl : st.y;
      if (!(st.alongU ? onFloor(mid, test, fl) : onFloor(test, mid, fl))) continue;
      const y = st.ceil ? st.y - 0.003 : st.y + 0.003, n = st.ceil ? [0, -1, 0] : [0, 1, 0], k = st.ceil ? 'aoCeil' : 'ao';
      const P = (a, c) => st.alongU ? [a, y, c] : [c, y, a];
      quad(k, P(st.s, at), P(st.e, at), P(st.e, out), P(st.s, out), n, [[0, 0], [0, 1], [1, 1], [1, 0]]);
    }
  }
  for (const [u0, u1, v0, v1, fl] of pendingBlob) {
    const m = 0.12, y = fl + 0.004;
    quad('blob', [u0 - m, y, v0 - m], [u1 + m, y, v0 - m], [u1 + m, y, v1 + m], [u0 - m, y, v1 + m], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
}
// sunlight through each window onto the floor of its storey. Built on the first visit, once the game has placed its sun
// (the sun does not move during the game)
let sunMesh = null;
function buildSun() {
  if (sunMesh) return;
  const L = H.scene.children.find(o => o.isDirectionalLight); if (!L) return;
  const d = L.position.clone().sub(L.target.position).normalize();
  const sunDir = { u: d.x * A.x + d.z * A.z, v: d.x * IN.x + d.z * IN.z, y: d.y };
  const onFloor = (u, v, y) => { const f = floorY(u, v, y); return f !== null && Math.abs(f - y) < 0.06; };
  delete builders.sun;
  if (sunDir.y > 0.05) for (const g of glassOps) {
    const fl = g.y0 >= F2 - 0.1 ? F2 : g.y0 >= -0.1 ? 0 : BASE, corners = [[g.a0, g.y0], [g.a1, g.y0], [g.a1, g.y1], [g.a0, g.y1]];
    const hits = corners.map(([a, y]) => {   // follow the sun ray from the window corner down to the floor
      const t = (y - fl) / sunDir.y, u = (g.alongU ? a : g.at) - sunDir.u * t, v = (g.alongU ? g.at : a) - sunDir.v * t;
      return [u, fl + 0.005, v];
    });
    const cu = hits.reduce((s_, h) => s_ + h[0], 0) / 4, cv = hits.reduce((s_, h) => s_ + h[2], 0) / 4;
    if (!onFloor(cu, cv, fl)) continue;   // the sun is on the other side of this window
    quad('sun', hits[0], hits[1], hits[2], hits[3], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  sunMesh = builders.sun ? meshOf(builders.sun, group.userData.mats.sun) : new T.Object3D();
  sunMesh.renderOrder = 2; group.add(sunMesh);
}
function meshOf(b, mat) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(b.nor, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(b.col, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
  return new T.Mesh(g, mat);
}
// round things (globes, shades, leaves, bowls) as separate meshes, since the merged geometry is all boxes
const rounds = [];
function globe(u, v, y, r, color = 0xfff3dc) { rounds.push({ t: 'sphere', u, v, y, r, color, glow: true }); }
function lampShade(u, v, y0, y1, r, color = 0xf6ead2) { rounds.push({ t: 'cyl', u, v, y: (y0 + y1) / 2, r, h: y1 - y0, color, glow: true }); }
function leaves(u, v, y, r, color) { rounds.push({ t: 'ico', u, v, y, r, color }); }
function bowl(u, v, y, r, color) { rounds.push({ t: 'bowl', u, v, y, r, color }); }
function buildRounds() {
  const geo = { sphere: new T.SphereGeometry(1, 20, 14), cyl: new T.CylinderGeometry(1, 1.15, 1, 24, 1, true), ico: new T.IcosahedronGeometry(1, 1),
    bowl: new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2) };
  const mats = {};
  for (const r of rounds) {
    const key = r.t + r.color + (r.glow ? 'g' : '');
    const m = mats[key] || (mats[key] = r.glow ? new T.MeshBasicMaterial({ color: r.color, side: r.t === 'cyl' ? T.DoubleSide : T.FrontSide })
      : new T.MeshLambertMaterial({ color: r.color, flatShading: r.t === 'ico', side: r.t === 'bowl' ? T.DoubleSide : T.FrontSide }));
    const mesh = new T.Mesh(geo[r.t], m); mesh.position.set(r.u, r.y, r.v);
    if (r.t === 'cyl') mesh.scale.set(r.r, r.h, r.r); else if (r.t === 'bowl') mesh.scale.set(r.r, r.r * 0.6, r.r); else mesh.scale.setScalar(r.r);
    group.add(mesh);
  }
}
// ---------- furniture ----------
// bathroom vanity in the Montgomery style: navy cabinet, pale quartz top, white basin, brass faucet and pulls, and a
// brass-framed mirror on the wall behind. face = direction it faces ('u+', 'u-', 'v+', 'v-'), back = the wall it stands
// against, c0..c1 = its extent along that wall
function vanity(face, back, c0, c1, y, d = 0.55) {
  const dir = face[1] === '+' ? 1 : -1, onU = face[0] === 'u', cc = (c0 + c1) / 2;
  const P = (a0, a1, y0, y1, b0, b1, col, sol, k = 'paint') => {   // a = depth from the wall, b = along the wall
    const x0 = back + dir * a0, x1 = back + dir * a1, f = sol ? solid : box;
    if (onU) f(k, x0, x1, y0, y1, b0, b1, col); else f(k, b0, b1, y0, y1, x0, x1, col);
  };
  P(0, d - 0.05, y, y + 0.09, c0 + 0.03, c1 - 0.03, 0x1c2533);                  // toe kick
  P(0, d, y + 0.09, y + 0.86, c0, c1, C.navy, true);
  P(0, d + 0.02, y + 0.86, y + 0.9, c0 - 0.01, c1 + 0.01, C.quartz, false, 'marble');
  P(0.15, 0.42, y + 0.9, y + 0.906, cc - 0.18, cc + 0.18, 0xffffff);           // basin
  P(0.05, 0.09, y + 0.9, y + 1.13, cc - 0.015, cc + 0.015, C.brass);            // faucet
  P(0.05, 0.21, y + 1.1, y + 1.13, cc - 0.012, cc + 0.012, C.brass);
  P(d, d + 0.006, y + 0.12, y + 0.84, cc - 0.004, cc + 0.004, 0x1c2533);       // door seam
  for (const s of [-1, 1]) P(d, d + 0.025, y + 0.66, y + 0.8, cc + s * 0.05 - 0.008, cc + s * 0.05 + 0.008, C.brass);
  const hw = Math.min((c1 - c0) / 2 - 0.04, 0.38);
  P(0, 0.025, y + 1.08, y + 1.88, cc - hw, cc + hw, C.brass);                   // mirror frame
  P(0.025, 0.03, y + 1.11, y + 1.85, cc - hw + 0.03, cc + hw - 0.03, 0xb4c1ca); // mirror
}
// wall tile on a wall face (large white tiles with grout lines). face 'u+' etc = the direction the face looks
function wallTile(face, at, a0, a1, y0, y1, col = 0xeeece8) {
  const d = face[1] === '+' ? 1 : -1, t1 = at + d * 0.01, t2 = at + d * 0.012;
  const B = (s, e, b0, b1, x0, x1, c) => face[0] === 'u' ? box('paint', x0, x1, b0, b1, s, e, c) : box('paint', s, e, b0, b1, x0, x1, c);
  B(a0, a1, y0, y1, at, t1, col);
  for (let y = y0 + 0.6; y < y1 - 0.05; y += 0.6) B(a0, a1, y - 0.002, y + 0.002, t1, t2, 0xc9c6c0);
  for (let a = a0 + 0.3; a < a1 - 0.05; a += 0.3) B(a - 0.002, a + 0.002, y0, y1, t1, t2, 0xc9c6c0);
}
// a thin coat of accent paint on a wall face (just above the baseboard to the ceiling)
function accentWall(face, at, a0, a1, y0, y1, col = C.navy) {
  return;   // all walls white, as in the real house (R49): no navy accent walls
  const d = face[1] === '+' ? 1 : -1;
  if (face[0] === 'u') box('paint', at, at + d * 0.006, y0, y1, a0, a1, col); else box('paint', a0, a1, y0, y1, at, at + d * 0.006, col);
}
// oak chest of drawers facing +u or -u, with brass pulls
function dresser(back, v0, v1, y, dir, h = 0.85, d = 0.48) {
  const f = back + dir * d;
  solid('paint', back, f, y + 0.06, y + h, v0, v1, C.cab);
  box('paint', back + dir * 0.03, f - dir * 0.03, y, y + 0.06, v0 + 0.03, v1 - 0.03, 0x6b4a32);
  const rows = 3, rh = (h - 0.08) / rows;
  for (let r = 1; r < rows; r++) box('paint', f, f + dir * 0.006, y + 0.06 + r * rh - 0.004, y + 0.06 + r * rh + 0.004, v0 + 0.02, v1 - 0.02, 0x9a7a52);
  for (let r = 0; r < rows; r++) for (const vc of [v0 + (v1 - v0) * 0.28, v0 + (v1 - v0) * 0.72])
    box('paint', f, f + dir * 0.025, y + 0.06 + (r + 0.5) * rh - 0.01, y + 0.06 + (r + 0.5) * rh + 0.01, vc - 0.07, vc + 0.07, C.brass);
}
function bench(u0, u1, v0, v1, y) {   // upholstered bench on oak legs
  for (const [u, v] of [[u0 + 0.04, v0 + 0.04], [u1 - 0.04, v0 + 0.04], [u0 + 0.04, v1 - 0.04], [u1 - 0.04, v1 - 0.04]]) box('paint', u - 0.02, u + 0.02, y, y + 0.36, v - 0.02, v + 0.02, 0x8a6a4a);
  solid('fabric', u0, u1, y + 0.36, y + 0.46, v0, v1, C.cream);
}
function desk(u0, u1, v0, v1, y) {   // oak desk with a chair (chair on the +u side)
  solid('paint', u0, u1, y + 0.72, y + 0.75, v0, v1, C.cab);
  for (const [u, v] of [[u0 + 0.03, v0 + 0.03], [u1 - 0.03, v0 + 0.03], [u0 + 0.03, v1 - 0.03], [u1 - 0.03, v1 - 0.03]]) box('paint', u - 0.02, u + 0.02, y, y + 0.72, v - 0.02, v + 0.02, 0x1d1e20);
  const cu = u1 + 0.3, cv = (v0 + v1) / 2;
  solid('fabric', cu - 0.22, cu + 0.22, y + 0.45, y + 0.5, cv - 0.22, cv + 0.22, C.cream);
  box('fabric', cu + 0.17, cu + 0.22, y + 0.5, y + 0.9, cv - 0.22, cv + 0.22, C.cream);
  for (const [du, dv] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box('paint', cu + du - 0.015, cu + du + 0.015, y, y + 0.45, cv + dv - 0.015, cv + dv + 0.015, 0x1d1e20);
  box('paint', u0 + 0.2, u0 + 0.5, y + 0.75, y + 0.77, cv - 0.18, cv + 0.18, 0x2a2b2e);       // laptop
}
function frontLoader(back, v0, v1, y, dir) {   // white front-load washer/dryer, round dark door
  const f = back + dir * 0.68, vc = (v0 + v1) / 2;
  solid('paint', back, f, y, y + 0.95, v0, v1, 0xf4f4f2);
  box('paint', f, f + dir * 0.012, y + 0.25, y + 0.7, vc - 0.2, vc + 0.2, 0x9aa3aa);
  box('paint', f, f + dir * 0.02, y + 0.3, y + 0.65, vc - 0.15, vc + 0.15, 0x2e3438);
  box('paint', f, f + dir * 0.012, y + 0.82, y + 0.9, v0 + 0.04, v1 - 0.04, 0xd8dadc);       // control panel
}
function loungeChair(uc, vc) {   // black leather lounge chair on a dark base, angled toward the room
  box('paint', uc - 0.03, uc + 0.03, 0, 0.3, vc - 0.03, vc + 0.03, 0x222222);
  box('paint', uc - 0.3, uc + 0.3, 0.02, 0.04, vc - 0.03, vc + 0.03, 0x222222);
  solid('paint', uc - 0.4, uc + 0.4, 0.3, 0.45, vc - 0.38, vc + 0.38, 0x6b4a32);           // walnut shell
  box('paint', uc - 0.36, uc + 0.36, 0.45, 0.55, vc - 0.34, vc + 0.34, 0x1e1f22);           // leather seat
  box('paint', uc - 0.36, uc + 0.36, 0.45, 1.0, vc + 0.24, vc + 0.38, 0x1e1f22);            // back
  box('paint', uc - 0.42, uc - 0.34, 0.45, 0.68, vc - 0.3, vc + 0.3, 0x1e1f22); box('paint', uc + 0.34, uc + 0.42, 0.45, 0.68, vc - 0.3, vc + 0.3, 0x1e1f22);
}
function velvetChair(uc, vc) {   // navy velvet barrel chair
  solid('fabric', uc - 0.36, uc + 0.36, 0.08, 0.42, vc - 0.36, vc + 0.36, 0x2c3a55);
  box('fabric', uc - 0.38, uc + 0.38, 0.42, 0.75, vc - 0.38, vc - 0.24, 0x2c3a55);
  box('fabric', uc - 0.38, uc - 0.26, 0.42, 0.62, vc - 0.38, vc + 0.3, 0x2c3a55); box('fabric', uc + 0.26, uc + 0.38, 0.42, 0.62, vc - 0.38, vc + 0.3, 0x2c3a55);
  for (const [du, dv] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) box('paint', uc + du - 0.02, uc + du + 0.02, 0, 0.08, vc + dv - 0.02, vc + dv + 0.02, 0x6b4a32);
}
function floorLamp(u, v) {   // brass arc-less floor lamp with a white globe
  box('paint', u - 0.15, u + 0.15, 0, 0.03, v - 0.15, v + 0.15, C.brass);
  box('paint', u - 0.012, u + 0.012, 0.03, 1.45, v - 0.012, v + 0.012, C.brass);
  globe(u, v, 1.6, 0.18, 0xfbf6ec);
}
function drapes(a0, a1, wallV, y0, ceil, intoPlusV = false) {   // floor-to-ceiling taupe panels either side of an opening, black rod
  const v0 = intoPlusV ? wallV + 0.05 : wallV - 0.12, v1 = intoPlusV ? wallV + 0.12 : wallV - 0.05;
  for (const [s, e] of [[a0 - 0.45, a0 - 0.02], [a1 + 0.02, a1 + 0.45]]) {
    for (let k = 0; k < 4; k++) { const w = (e - s) / 4; box('fabric', s + k * w, s + (k + 1) * w, y0 + 0.02, ceil - 0.1, v0 + (k % 2) * 0.02, v1 + (k % 2) * 0.02, k % 2 ? 0x7f6a50 : C.drape); }   // folds
  }
  box('paint', a0 - 0.5, a1 + 0.5, ceil - 0.1, ceil - 0.08, v0 - 0.01, v0 + 0.01, C.black);
}
function toilet(u0, u1, vc, y, face) {
  const back = face === 'u+' ? u1 : u0, dir = face === 'u+' ? -1 : 1;
  solid('paint', back, back + dir * 0.68, y, y + 0.42, vc - 0.2, vc + 0.2, 0xfafaf8);
  box('paint', back, back + dir * 0.2, y + 0.42, y + 0.8, vc - 0.22, vc + 0.22, 0xfafaf8);
}
function stool(u, v) {   // counter stool facing the island (-u): wood legs, cream seat and curved back
  for (const [du, dv] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) box('paint', u + du - 0.018, u + du + 0.018, 0, 0.62, v + dv - 0.018, v + dv + 0.018, 0x8a6a4a);
  box('paint', u - 0.15, u + 0.15, 0.25, 0.27, v - 0.15, v + 0.15, 0x8a6a4a);              // foot ring
  solid('fabric', u - 0.2, u + 0.2, 0.62, 0.69, v - 0.2, v + 0.2, C.cream);
  box('fabric', u + 0.14, u + 0.2, 0.69, 0.95, v - 0.2, v + 0.2, C.cream);
}
function table(uc, vc) {
  solid('paint', uc - 0.8, uc + 0.8, 0.72, 0.76, vc - 0.45, vc + 0.45, C.wood2);
  for (const [du, dv] of [[-0.72, -0.37], [0.72, -0.37], [-0.72, 0.37], [0.72, 0.37]]) box('paint', uc + du - 0.04, uc + du + 0.04, 0, 0.72, vc + dv - 0.04, vc + dv + 0.04, C.wood2);
  for (const du of [-0.45, 0.45]) for (const s of [-1, 1]) {
    const v = vc + s * 0.62; solid('fabric', uc + du - 0.22, uc + du + 0.22, 0, 0.46, v - 0.2, v + 0.2, C.fabric);
    box('fabric', uc + du - 0.22, uc + du + 0.22, 0.46, 0.95, v + s * 0.17, v + s * 0.21, C.fabric);
  }
}
function rug(u0, u1, v0, v1, y = 0) {   // border + field
  box('paint', u0, u1, y + 0.004, y + 0.012, v0, v1, 0x6f5a46);
  box('paint', u0 + 0.12, u1 - 0.12, y + 0.012, y + 0.016, v0 + 0.12, v1 - 0.12, C.rug);
  box('paint', u0 + 0.3, u1 - 0.3, y + 0.016, y + 0.018, v0 + 0.3, v1 - 0.3, 0xcbbca3);
}
// sofa along v, back at u0, facing +u
function sofa(u0, v0, v1, y = 0) {
  solid('fabric', u0, u0 + 0.95, y + 0.1, y + 0.4, v0, v1, C.sofa);                      // base
  box('paint', u0 + 0.02, u0 + 0.9, y, y + 0.1, v0 + 0.08, v1 - 0.08, 0x2a2a2a);        // plinth
  box('fabric', u0, u0 + 0.25, y + 0.4, y + 0.88, v0 + 0.02, v1 - 0.02, C.sofa);         // back
  for (const v of [v0, v1 - 0.18]) box('fabric', u0, u0 + 0.95, y + 0.1, y + 0.64, v, v + 0.18, C.sofa);   // arms
  const n = Math.max(2, Math.round((v1 - v0 - 0.36) / 0.75)), w = (v1 - v0 - 0.36) / n;
  for (let k = 0; k < n; k++) {
    const a = v0 + 0.18 + k * w;
    box('fabric', u0 + 0.25, u0 + 0.93, y + 0.4, y + 0.52, a + 0.01, a + w - 0.01, 0xebe6dc);   // seat cushions
    box('fabric', u0 + 0.24, u0 + 0.4, y + 0.52, y + 0.84, a + 0.02, a + w - 0.02, 0xebe6dc);   // back cushions
  }
  box('fabric', u0 + 0.38, u0 + 0.5, y + 0.52, y + 0.86, v0 + 0.22, v0 + 0.6, 0x8e8a84);       // throw pillows
  box('fabric', u0 + 0.38, u0 + 0.5, y + 0.52, y + 0.86, v1 - 0.6, v1 - 0.22, 0xd6ccbc);
}
function sofaBack(u0, u1, v0, y) {   // against the back wall (back at v0 + 0.95), facing the front
  solid('fabric', u0, u1, y + 0.1, y + 0.4, v0, v0 + 0.95, C.sofa);
  box('paint', u0 + 0.08, u1 - 0.08, y, y + 0.1, v0 + 0.05, v0 + 0.93, 0x2a2a2a);
  box('fabric', u0 + 0.02, u1 - 0.02, y + 0.4, y + 0.88, v0 + 0.7, v0 + 0.95, C.sofa);
  for (const u of [u0, u1 - 0.18]) box('fabric', u, u + 0.18, y + 0.1, y + 0.64, v0, v0 + 0.95, C.sofa);
  const n = Math.max(2, Math.round((u1 - u0 - 0.36) / 0.75)), w = (u1 - u0 - 0.36) / n;
  for (let k = 0; k < n; k++) {
    const a = u0 + 0.18 + k * w;
    box('fabric', a + 0.01, a + w - 0.01, y + 0.4, y + 0.52, v0 + 0.02, v0 + 0.7, 0xebe6dc);
    box('fabric', a + 0.02, a + w - 0.02, y + 0.52, y + 0.84, v0 + 0.55, v0 + 0.71, 0xebe6dc);
  }
  box('fabric', u0 + 0.22, u0 + 0.6, y + 0.52, y + 0.86, v0 + 0.45, v0 + 0.57, 0x8e8a84);
}
// a potted plant: pot, soil and a few stacked leaf clumps
function plant(u, v, y = 0, h = 1.1) {
  solid('paint', u - 0.17, u + 0.17, y, y + 0.34, v - 0.17, v + 0.17, 0xe9e4da);
  box('paint', u - 0.15, u + 0.15, y + 0.34, y + 0.35, v - 0.15, v + 0.15, 0x3b2c20);
  const G = [0x4c7a3e, 0x3f6b35, 0x5a8a47, 0x467339];
  for (let k = 0; k < 7; k++) {   // a loose bush of leaf clumps
    const a = k * 2.4, rr = k ? 0.13 : 0.05, yy = y + 0.5 + (h - 0.6) * (k / 6);
    leaves(u + Math.cos(a) * rr, v + Math.sin(a) * rr, yy, 0.2 - k * 0.012, G[k % 4]);
  }
}
// a framed picture on a wall. face: 'u+', 'u-', 'v+', 'v-' = the direction it faces; wallAt = the wall surface;
// c = centre along the wall, y = centre height
function art(face, wallAt, c, y, w, h, color) {
  const d = face[1] === '+' ? 1 : -1, t0 = wallAt, t1 = wallAt + d * 0.035, t2 = wallAt + d * 0.04;
  const B = (a0, a1, b0, b1, x0, x1, col) => face[0] === 'u' ? box('paint', x0, x1, b0, b1, a0, a1, col) : box('paint', a0, a1, b0, b1, x0, x1, col);
  B(c - w / 2, c + w / 2, y - h / 2, y + h / 2, t0, t1, 0x2b2622);                                        // frame
  B(c - w / 2 + 0.04, c + w / 2 - 0.04, y - h / 2 + 0.04, y + h / 2 - 0.04, t1, t1 + d * 0.003, 0xf4f1ea); // mat
  B(c - w / 2 + 0.1, c + w / 2 - 0.1, y - h / 2 + 0.1, y + h / 2 - 0.1, t1 + d * 0.003, t2, color);       // print
  B(c - w / 2 + 0.1, c, y - h / 2 + 0.1, y - 0.02, t2, t2 + d * 0.002, new T.Color(color).multiplyScalar(0.65).getHex());
}
// ceiling light: a flush mount (glowing) with a trim plate
function ceilingLight(u, v, ceil, r = 0.2) {
  box('paint', u - r - 0.03, u + r + 0.03, ceil - 0.02, ceil, v - r - 0.03, v + r + 0.03, 0xd8d4cc);
  box('glow', u - r, u + r, ceil - 0.07, ceil - 0.02, v - r * 0.7, v + r * 0.7, 0xfff4dd);
  box('glow', u - r * 0.7, u + r * 0.7, ceil - 0.07, ceil - 0.02, v - r, v + r, 0xfff4dd);
}
function pendant(u, v, ceil, low) {   // glass globe on a brass stem
  box('paint', u - 0.005, u + 0.005, low + 0.24, ceil, v - 0.005, v + 0.005, C.brass);
  box('paint', u - 0.04, u + 0.04, low + 0.22, low + 0.25, v - 0.04, v + 0.04, C.brass);
  globe(u, v, low + 0.12, 0.12);
}
// cabinet fronts facing +u at u = uf: door seams every ~0.6 m and bar handles
function cabFronts(uf, v0, v1, y0, y1, handleY, seam = 0x1c2533) {
  const n = Math.max(1, Math.round((v1 - v0) / 0.6)), w = (v1 - v0) / n;
  for (let k = 0; k <= n; k++) box('paint', uf, uf + 0.006, y0 + 0.02, y1 - 0.02, v0 + k * w - 0.004, v0 + k * w + 0.004, seam);
  for (let k = 0; k < n; k++) {
    const vc = v0 + (k + (k % 2 ? 0.15 : 0.85)) * w;
    box('paint', uf, uf + 0.025, handleY - 0.1, handleY + 0.1, vc - 0.008, vc + 0.008, C.brass);   // brass bar pull
  }
}
function bed(wallU, vc, w, len, leftWall, duvet = C.duvet) {   // headboard on a side wall
  const s = leftWall ? 1 : -1, u0 = wallU, u1 = wallU + s * len, a = vc - w / 2, b = vc + w / 2;
  solid('paint', u0, u1, F2 + 0.12, F2 + 0.3, a, b, C.wood2);                                        // frame
  box('fabric', u0 + s * 0.06, u1 - s * 0.03, F2 + 0.3, F2 + 0.52, a + 0.02, b - 0.02, C.bed);        // mattress
  box('fabric', u0 + s * 0.45, u1, F2 + 0.5, F2 + 0.58, a - 0.03, b + 0.03, duvet);                    // duvet
  box('fabric', u0 + s * 0.45, u1 + s * 0.02, F2 + 0.3, F2 + 0.58, a - 0.04, a - 0.03, duvet);         // hanging sides
  box('fabric', u0 + s * 0.45, u1 + s * 0.02, F2 + 0.3, F2 + 0.58, b + 0.03, b + 0.04, duvet);
  box('fabric', u1 - s * 0.55, u1, F2 + 0.58, F2 + 0.6, a - 0.03, b + 0.03, 0x8b6f5a);                // throw at the foot
  box('fabric', u0, u0 + s * 0.08, F2, F2 + 1.15, a - 0.06, b + 0.06, 0x8f8a84);                      // upholstered headboard
  for (const dv of [-w / 4, w / 4]) box('paint', u0 + s * 0.1, u0 + s * 0.42, F2 + 0.52, F2 + 0.66, vc + dv - 0.3, vc + dv + 0.3, 0xffffff);
  for (const v of [a + 0.02, b - 0.06]) box('paint', u1 - s * 0.09, u1 - s * 0.05, F2, F2 + 0.12, v, v + 0.04, C.wood2);   // feet
}
function nightTable(uc, vc) {
  solid('paint', uc - 0.22, uc + 0.22, F2, F2 + 0.55, vc - 0.22, vc + 0.22, C.wood2);
  box('paint', uc - 0.06, uc + 0.06, F2 + 0.55, F2 + 0.58, vc - 0.06, vc + 0.06, 0xd8d0c0);   // lamp
  box('paint', uc - 0.015, uc + 0.015, F2 + 0.58, F2 + 0.8, vc - 0.015, vc + 0.015, 0x9b8f7e);
  lampShade(uc, vc, F2 + 0.77, F2 + 0.96, 0.1);
}

// ---------- walking ----------
const toLocal = (x, z) => ({ u: (x - O.x) * A.x + (z - O.z) * A.z, v: (x - O.x) * IN.x + (z - O.z) * IN.z });
const toWorld = (u, v) => ({ x: O.x + A.x * u + IN.x * v, z: O.z + A.z * u + IN.z * v });
const inR = (r, u, v) => u >= r[0] && u <= r[1] && v >= r[2] && v <= r[3];
function floorY(u, v, y) {   // the walkable surface under (u, v) closest to height y, within a step
  let best = null, bd = 0.5;
  for (const s of surfaces) {
    if (!inR(s.r, u, v) || s.holes.some(h => inR(h, u, v))) continue;
    const sy = s.y(u, v), d = Math.abs(sy - y);
    if (d <= bd) { bd = d; best = sy; }
  }
  return best;
}
function pushOut(p, y, r) {
  for (let it = 0; it < 3; it++) {
    let hit = false;
    for (const w of walls) {
      if (w.y1 <= y + 0.3 || w.y0 >= y + 1.75) continue;
      const cu = Math.max(w.u0, Math.min(p.u, w.u1)), cv = Math.max(w.v0, Math.min(p.v, w.v1));
      let du = p.u - cu, dv = p.v - cv, d = Math.hypot(du, dv);
      if (d >= r) continue;
      if (d < 1e-6) {   // centre inside the box: leave by the nearest side
        const opts = [[w.u0 - r - p.u, 0], [w.u1 + r - p.u, 0], [0, w.v0 - r - p.v], [0, w.v1 + r - p.v]];
        opts.sort((a, b) => Math.hypot(...a) - Math.hypot(...b)); p.u += opts[0][0]; p.v += opts[0][1];
      } else { p.u += du / d * (r - d); p.v += dv / d * (r - d); }
      hit = true;
    }
    if (!hit) break;
  }
}
function tryMove(nu, nv) {
  const p = { u: nu, v: nv }; pushOut(p, cur.y, 0.28);
  const y = floorY(p.u, p.v, cur.y);
  if (y === null) return false;
  cur.u = p.u; cur.v = p.v; cur.y = y; return true;
}
// ---------- controls: Might and Magic VI style (GrayFace patch settings the owner uses) ----------
// mouse look always on (pointer locked, cursor hidden, crosshair); W/S forward/back, A/D strafe, Ctrl+A/D or the
// arrow keys turn smoothly; always run, Shift walks; F3 autorun until another movement key; Caps Lock or the middle
// mouse button switches mouse look off/on. Raw mouse movement, no acceleration or smoothing.
const MOUSE_SENS = 0.0022 * 35 / 35;              // radians per mouse count (mm6.ini MouseSensitivityX=35)
const RUN = 3.4, WALK = 1.5, TURN = 2.4;          // m/s, m/s, rad/s
let pitch = 0, autorun = false, lookOn = true, prevCam = 0, canvas = null, cross = null;
const locked = () => canvas && document.pointerLockElement === canvas;
function lockMouse() {   // the browser refuses without a click/key press; that's fine, the HUD then says "Click to look around"
  if (!canvas || !I.active || !lookOn || locked() || !canvas.requestPointerLock) return;
  try { const pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
}
function unlockMouse() { if (locked()) document.exitPointerLock(); }
function toggleLook() { lookOn = !lookOn; if (lookOn) lockMouse(); else unlockMouse(); }
function setupControls() {
  canvas = document.getElementById('view') || document.querySelector('canvas');
  cross = document.createElement('div');
  Object.assign(cross.style, { position: 'fixed', left: '50%', top: '50%', width: '6px', height: '6px', margin: '-3px 0 0 -3px',
    borderRadius: '50%', background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 0 1px rgba(0,0,0,0.6)', pointerEvents: 'none', display: 'none', zIndex: 21 });
  document.body.appendChild(cross);
  canvas.addEventListener('mousedown', e => {
    if (!I.active) return;
    if (e.button === 1) { e.preventDefault(); toggleLook(); return; }   // middle button
    if (e.button === 0 && !locked()) { lookOn = true; lockMouse(); }
  });
  document.addEventListener('mousemove', e => {
    if (!I.active || !locked()) return;
    H.state.walk.heading -= e.movementX * MOUSE_SENS;
    pitch = Math.max(-1.3, Math.min(1.3, pitch - e.movementY * MOUSE_SENS));
  });
  window.addEventListener('keydown', e => {
    if (!I.active) return;
    if (e.code === 'CapsLock') toggleLook();
    else if (e.code === 'F3') { e.preventDefault(); autorun = !autorun; }
    else if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown'].includes(e.code) && !e.repeat) autorun = false;
  });
}
I.walk = function (dt, now) {
  const k = H.keys, st = H.state, Wk = st.walk, ctrl = k.ControlLeft || k.ControlRight;
  const fwd = k.KeyW || k.ArrowUp || autorun, back = k.KeyS || k.ArrowDown;
  const turnL = k.ArrowLeft || (ctrl && k.KeyA), turnR = k.ArrowRight || (ctrl && k.KeyD);
  const strL = !ctrl && k.KeyA, strR = !ctrl && k.KeyD;
  const run = k.ShiftLeft || k.ShiftRight ? WALK : RUN;
  Wk.heading += ((turnL ? 1 : 0) - (turnR ? 1 : 0)) * TURN * dt;
  let mf = (fwd ? 1 : 0) - (back ? 1 : 0), ms = (strR ? 1 : 0) - (strL ? 1 : 0);
  const len = Math.hypot(mf, ms); if (len > 1) { mf /= len; ms /= len; }   // diagonals no faster
  const mv = mf || ms;
  if (mv) {
    const fx = -Math.sin(Wk.heading), fz = -Math.cos(Wk.heading), rx = -fz, rz = fx;   // forward and right
    const wx = (fx * mf + rx * ms) * run * dt, wz = (fz * mf + rz * ms) * run * dt;
    const du = wx * A.x + wz * A.z, dv = wx * IN.x + wz * IN.z;
    const n = Math.ceil(Math.hypot(du, dv) / 0.1) || 1;
    for (let i = 0; i < n; i++) if (!tryMove(cur.u + du / n, cur.v + dv / n)) { tryMove(cur.u + du / n, cur.v) || tryMove(cur.u, cur.v + dv / n); }
  }
  const w = toWorld(cur.u, cur.v); Wk.x = w.x; Wk.z = w.z;
  H.walker.position.set(w.x, Y0 + cur.y + Math.abs(Math.sin(now / (run > 2 ? 110 : 170))) * 0.04 * (mv ? 1 : 0), w.z);
  H.walker.rotation.y = Wk.heading;
};
I.camera = function (dt, look) {
  const Wk = H.state.walk, fx = -Math.sin(Wk.heading), fz = -Math.cos(Wk.heading), w = toWorld(cur.u, cur.v), floor = Y0 + cur.y;
  lamp.position.set(w.x, floor + 2.2, w.z);
  if (H.state.cam === 1) {   // first person
    showBody(true);
    eyeView(w, fx, fz, floor, look);
    return;
  }
  // close third person, pulled in so it never goes through a wall
  // in the basement stay well below the outside ground (which runs just under the main floor)
  const camH = cur.y < -0.6 ? Math.min(cur.y + 1.75, BASE + 1.7) : cur.y + 2.2, dl = { u: -(fx * A.x + fz * A.z), v: -(fx * IN.x + fz * IN.z) };
  let dist = 0.3;
  while (dist < 2.1) {
    const pu = cur.u + dl.u * (dist + 0.15), pv = cur.v + dl.v * (dist + 0.15);
    if (walls.some(b => camH + 0.1 > b.y0 && camH - 0.1 < b.y1 && pu > b.u0 - 0.12 && pu < b.u1 + 0.12 && pv > b.v0 - 0.12 && pv < b.v1 + 0.12)) break;
    dist += 0.05;
  }
  // no room behind you: look from your own eyes instead of the back of your head. Two thresholds, so standing near the
  // limit doesn't flip the view back and forth every frame (that looked like flicker)
  const tight = wasTight ? dist < 1.3 : dist < 1.0; wasTight = tight;
  showBody(!tight);
  if (tight) { eyeView(w, fx, fz, floor, look); return; }
  const c = toWorld(cur.u + dl.u * dist, cur.v + dl.v * dist);
  H.camera.position.set(c.x, Y0 + camH, c.z);
  look.set(w.x + fx * 3, floor + 0.9 + Math.tan(pitch * 0.8) * 3, w.z + fz * 3);
};
let wasTight = false;
function eyeView(w, fx, fz, floor, look) {
  const c = Math.cos(pitch);
  H.camera.position.set(w.x + fx * 0.12, floor + 1.62, w.z + fz * 0.12);
  look.set(w.x + fx * (0.12 + 5 * c), floor + 1.62 + 5 * Math.sin(pitch), w.z + fz * (0.12 + 5 * c));
}
function showBody(on) { for (const m of H.walker.children) m.visible = on; }

// ---------- entering and leaving ----------
function nearOutsideDoor() {
  const st = H.state; if (st.mode !== 'walk') return false;
  const p = toLocal(st.walk.x, st.walk.z);
  return Math.abs(p.u - doorU) < 1.3 && p.v > RZ - 2.8 && p.v < RZ + 0.3;   // on the porch / front step
}
const nearInsideDoor = () => Math.abs(cur.y) < 0.2 && cur.v < RZ + 1.5 && Math.abs(cur.u - doorU) < 0.9;
// The outside ground runs just under the main floor, so it showed through the stairwell (grass on the basement stairs).
// While inside, everything of the outside world is cut away inside a box under the home: the house footprint (inset a little,
// from the recessed front wall to the back) below the main floor. Uses three.js clipping planes with clipIntersection, so only
// the inside of the box is removed; neighbours, the porch and the street are untouched.
let clipMats = [];
function setClip(on) {
  for (const m of clipMats) { m.clippingPlanes = null; m.clipIntersection = false; m.needsUpdate = true; }
  clipMats = [];
  if (typeof renderer === 'undefined') return;
  renderer.localClippingEnabled = on;
  if (!on) return;
  const P = (nx, nz, ny, u, v, y) => { const w = toWorld(u, v);   // plane with outward normal; inside the box is negative
    return new T.Plane().setFromNormalAndCoplanarPoint(new T.Vector3(nx, ny, nz).normalize(), new T.Vector3(w.x, Y0 + y, w.z)); };
  const planes = [P(-A.x, -A.z, 0, 0.03, 0, 0), P(A.x, A.z, 0, W - 0.03, 0, 0), P(-IN.x, -IN.z, 0, 0, RZ + 0.03, 0),
    P(IN.x, IN.z, 0, 0, D - 0.03, 0), P(0, 0, 1, 0, 0, -0.02)];
  const c = toWorld(W / 2, (RZ + D) / 2), box = new T.Box3(new T.Vector3(c.x - D, Y0 - 6, c.z - D), new T.Vector3(c.x + D, Y0, c.z + D));
  const seen = new Set(), bb = new T.Box3();
  H.scene.traverse(o => {
    if (!o.isMesh || o === lamp) return;
    for (let p = o; p; p = p.parent) if (p === group || p === H.walker) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); if (!bb.intersectsBox(box)) return;
    for (const m of [].concat(o.material)) if (m && !seen.has(m)) { seen.add(m); m.clippingPlanes = planes; m.clipIntersection = true; m.needsUpdate = true; clipMats.push(m); }
  });
}
function enter() {
  I.active = true; group.visible = true; lamp.intensity = 0.75; buildSun(); setClip(true);
  Object.assign(cur, { u: doorU, v: RZ + 0.9, y: 0 });
  const st = H.state; st.walk.heading = Math.atan2(-IN.x, -IN.z);
  H.camera.near = 0.05; H.camera.updateProjectionMatrix();
  prevCam = st.cam; st.cam = 1; pitch = 0; autorun = false; lookOn = true; lockMouse();
  I.walk(0, 0);
}
function leave() {
  I.active = false; group.visible = false; lamp.intensity = 0; showBody(true); setClip(false);
  unlockMouse(); autorun = false; pitch = 0; H.state.cam = prevCam;
  const st = H.state, w = toWorld(doorU, RZ - 1.2);
  Object.assign(st.walk, { x: w.x, z: w.z, heading: Math.atan2(-N.x, -N.z) });
  H.walker.position.set(w.x, H.heightAt(w.x, w.z), w.z);
  H.camera.near = 0.25; H.camera.updateProjectionMatrix();
}
I.onKeyE = function () {
  if (!I.ready || H.state.mode !== 'walk') return false;
  if (I.active) { if (nearInsideDoor()) leave(); return true; }   // inside, E never jumps into the car
  if (nearOutsideDoor()) { enter(); return true; }
  return false;
};
function roomName() {
  for (const r of rooms) if (Math.abs(cur.y - r.y) < 1.2 && inR(r.r, cur.u, cur.v)) return r.name;
  if (cur.y > 0.3 && cur.y < 2.6) return 'Stairs';
  if (cur.y < -0.3 && cur.y > -2.3) return 'Stairs';
  return 'Home';
}
function hudLoop() {
  requestAnimationFrame(hudLoop);
  if (!I.ready) return;
  if (cross) cross.style.display = I.active && locked() ? '' : 'none';
  if (I.active && H.state.mode !== 'walk') { unlockMouse(); setClip(false); I.active = false; group.visible = false; lamp.intensity = 0; showBody(true); H.camera.near = 0.25; H.camera.updateProjectionMatrix(); }
  let txt = '';
  if (I.active) txt = roomName() + (nearInsideDoor() ? '  ·  Press E to go outside' : '') + (locked() ? '' : '  ·  Click to look around with the mouse');
  else if (nearOutsideDoor()) txt = 'Press E to go inside your home';
  if (hud.textContent !== txt) { hud.textContent = txt; hud.style.display = txt ? '' : 'none'; }
}

// ---------- setup (called from index.html once the world is built) ----------
I.init = function (hooks) {
  H = hooks; T = hooks.THREE;
  const hk = hooks.homeInfo;
  if (!hk || !hk.front || !hk.poly) return;
  const f = hk.front, L = f.L, dir = [(f.q[0] - f.p[0]) / L, (f.q[1] - f.p[1]) / L], garageAtP = hk.rec ? hk.rec.atStart : hk.idx % 2 === 0;
  N = { x: f.n[0], z: f.n[2] }; IN = { x: -N.x, z: -N.z };
  // u runs from the garage end of the front wall toward the door end
  O = garageAtP ? { x: f.p[0], z: f.p[1] } : { x: f.q[0], z: f.q[1] };
  A = garageAtP ? { x: dir[0], z: dir[1] } : { x: -dir[0], z: -dir[1] };
  W = L; D = Math.max(...hk.poly.map(p => (p[0] - O.x) * IN.x + (p[1] - O.z) * IN.z));
  R = W - E; BK = D - E; Y0 = hk.floorY;
  build(hk);
  paintRooms();
  finishLight();
  if (!window.INTERIOR_TEXTURES) {   // the photo textures load in the background (index.html needs no change)
    const sc = document.createElement('script'); sc.src = 'data/interior-textures.js';
    sc.onload = () => texWaiters.splice(0).forEach(f => f()); document.head.appendChild(sc);
  }
  const mats = makeMaterials();
  group = new T.Group(); group.userData.mats = mats;
  for (const [k, b] of Object.entries(builders)) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(b.nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(b.col, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
    const m = new T.Mesh(g, mats[k]); if (k === 'glass' || k === 'sun') m.renderOrder = 2; group.add(m);
  }
  buildRounds();
  group.matrixAutoUpdate = false;
  group.matrix.set(A.x, 0, IN.x, O.x, 0, 1, 0, Y0, A.z, 0, IN.z, O.z, 0, 0, 0, 1);
  group.visible = false; H.scene.add(group);
  lamp = new T.PointLight(0xfff0dc, 0, 9, 1.5); H.scene.add(lamp);   // soft light that follows you indoors
  hud = document.createElement('div');
  Object.assign(hud.style, { position: 'fixed', left: '50%', bottom: '28px', transform: 'translateX(-50%)', padding: '7px 14px',
    background: 'rgba(20,22,26,0.72)', color: '#fff', font: '600 15px/1.2 system-ui, sans-serif', borderRadius: '8px', pointerEvents: 'none', display: 'none', zIndex: 20 });
  document.body.appendChild(hud);
  // garage side as seen from the street (the owner says: garage on the LEFT of the front door)
  const leftOfViewer = { x: -N.z, z: N.x };   // viewer faces the house (-n); their left
  I.garageSideSeenFromStreet = (A.x * leftOfViewer.x + A.z * leftOfViewer.z) < 0 ? 'left' : 'right';
  setupControls();
  I.ready = true;
  hudLoop();
};
// debug helpers (used by automated tests with index.html?debug). KEEP .enter() and .doorOutside() working: js/game.js
// jumpIntoHome() (I key / "Go inside home" button) uses them, plus Interior.ready and .active. KeyI is taken by game.js.
I.debug = {
  cam: () => { const c = H.camera.position, l = toLocal(c.x, c.z); return { u: +l.u.toFixed(2), v: +l.v.toFixed(2), y: +(c.y - Y0).toFixed(2), near: H.camera.near }; },
  info: () => ({ active: I.active, u: +cur.u.toFixed(2), v: +cur.v.toFixed(2), y: +cur.y.toFixed(2), room: I.active ? roomName() : null, W, D, doorU }),
  enter, leave, goto(u, v, y) { Object.assign(cur, { u, v, y }); },
  pick(nx, ny) {   // what is under a screen point (-1..1)? -> local coords of the hit and whether it is ours
    const rc = new T.Raycaster(); rc.setFromCamera({ x: nx, y: ny }, H.camera);
    group.children.forEach(m => { m.userData.side = m.material.side; m.material.side = T.DoubleSide; });   // mirrored frame
    const hits = rc.intersectObjects(H.scene.children, true);
    group.children.forEach(m => { m.material.side = m.userData.side; });
    return hits.slice(0, 3).map(h => {
      const l = toLocal(h.point.x, h.point.z); return { ours: h.object.parent === group, u: +l.u.toFixed(2), v: +l.v.toFixed(2), y: +(h.point.y - Y0).toFixed(2), d: +h.distance.toFixed(2) };
    });
  },
  face(du, dv) { const x = A.x * du + IN.x * dv, z = A.z * du + IN.z * dv; H.state.walk.heading = Math.atan2(-x, -z); },
  clipped: () => clipMats.length,
  doorOutside: () => toWorld(doorU, RZ - 1.2), group: () => group, rear: () => I.rear, RZ: () => RZ, walls: () => walls.length, surfaces: () => surfaces.length,
};
})();
