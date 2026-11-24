// Street Test - core.js: renderer, sky, lights, terrain height, geometry builders, spatial grid, shared helpers.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

const M = window.MAP_DATA;
const TX = window.TEXTURES || {};   // CC0 photo textures (data/textures.js); the game falls back to drawn ones without it

// ---------- renderer / scene ----------
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// filmic tone mapping: softer highlights and less "cartoon" colour, closer to a photo
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const HORIZON = TX.skyInfo ? new THREE.Color(TX.skyInfo.horizon).lerp(new THREE.Color(0xd5e0ea), 0.45).getHex() : 0xc9dbe9;
scene.background = new THREE.Color(HORIZON);
scene.fog = new THREE.Fog(HORIZON, 220, 900);
const camera = new THREE.PerspectiveCamera(60, 1, 0.25, 3000);
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// sky dome: blue overhead fading to a pale horizon, with soft cumulus clouds (like the Street View day)
const skyDome = (() => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512); grd.addColorStop(0, '#4f86c6'); grd.addColorStop(0.55, '#9fc1e2'); grd.addColorStop(1, '#dfe8ef');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 70; k++) {   // cloud = cluster of soft white puffs, flatter toward the horizon
    const cx = r() * 1024, cy = 120 + r() * 260, size = 18 + r() * 40 * (1 - (cy - 120) / 400);
    for (let j = 0; j < 14; j++) {
      const px = cx + (r() - 0.5) * size * 4, py = cy + (r() - 0.5) * size * 0.9, pr = size * (0.5 + r() * 0.7);
      const pg = g.createRadialGradient(px, py, 0, px, py, pr); pg.addColorStop(0, 'rgba(255,255,255,0.55)'); pg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = pg; g.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  // photo sky (Poly Haven, CC0) replaces the drawn one once it has loaded; turned so its sun matches the sun light
  if (TX.sky) { const img = new Image(); img.onload = () => { c.width = img.width; c.height = img.height; g.drawImage(img, 0, 0); tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.needsUpdate = true;
    // sphere u -> direction (-cos(2pi u), sin(2pi u)); the sun light sits at (+60, +40) from the player (see game.js)
    const a = TX.skyInfo.sunU * Math.PI * 2, want = Math.atan2(40, 60), have = Math.atan2(Math.sin(a), -Math.cos(a));
    m.rotation.y = have - want; }; img.src = TX.sky; }
  const m = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2 + 0.05),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  m.renderOrder = -1; scene.add(m); return m;
})();

// sky light from above, green-brown bounce from the lawns below; warm afternoon sun
scene.add(new THREE.HemisphereLight(0xcfe0f5, 0x5d6446, 0.62));
const sun = new THREE.DirectionalLight(0xfff0d8, 1.05);
sun.castShadow = true;
// 4096 px over 160 m = 4 cm per shadow pixel near the player: crisp eaves, poles and tree shadows
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 400 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 2;
scene.add(sun, sun.target);

// ---------- helpers ----------
const UP = new THREE.Vector3(0, 1, 0);

// ---------- terrain height ----------
// real elevation grid (10 m spacing), heights relative to home; HILLS exaggerates it
const T = window.TERRAIN;
const params = new URLSearchParams(location.search);
const HILLS = T ? (Number(params.get('hills')) || 1) : 0;   // real size by default; H cycles 1x / 3x / 6x
// lidar (NRCan HRDEM, 1 m scan, stored on a 2 m grid) is used near the street; the coarser terrain tiles further out
const LD = window.LIDAR;
const LG = LD ? (() => {
  // decode, then a light blur (two 5x5 box passes = ~10 m) to remove curb/ditch-sized noise so layers lie flat
  const raw = new Int16Array(Uint8Array.from(atob(LD.ground), c => c.charCodeAt(0)).buffer), n = LD.n;
  let a = Float32Array.from(raw);
  for (let pass = 0; pass < 2; pass++) for (const horiz of [true, false]) {
    const b = new Float32Array(a.length);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      let s = 0, c = 0;
      for (let k = -2; k <= 2; k++) { const ii = horiz ? i : i + k, jj = horiz ? j + k : j; if (ii >= 0 && ii < n && jj >= 0 && jj < n) { s += a[ii*n + jj]; c++; } }
      b[i*n + j] = s / c;
    }
    a = b;
  }
  return a;
})() : null;
function bilinear(arr, n, fx, fz, scale) {
  fx = Math.max(0, Math.min(n - 1.001, fx)); fz = Math.max(0, Math.min(n - 1.001, fz));
  const j = Math.floor(fx), i = Math.floor(fz), tx = fx - j, tz = fz - i;
  const a = arr[i*n + j], b = arr[i*n + j + 1], c = arr[(i+1)*n + j], d = arr[(i+1)*n + j + 1];
  return ((a * (1-tx) + b * tx) * (1-tz) + (c * (1-tx) + d * tx) * tz) * scale;
}
function rawHeight(x, z) {   // metres relative to the home's ground, real scale
  const coarse = T ? bilinear(T.h, T.n, (x + T.half) / T.cell, (z + T.half) / T.cell, 1) + T.base - (LD ? LD.base : T.base) : 0;
  if (!LD) return coarse;
  const edge = LD.half - Math.max(Math.abs(x), Math.abs(z));
  if (edge <= 0) return coarse;
  const fine = bilinear(LG, LD.n, (x + LD.half) / LD.step, (z + LD.half) / LD.step, 0.01);
  const w = Math.min(1, edge / 80);   // fade into the coarse data over the last 80 m
  return fine * w + coarse * (1 - w);
}
function heightAt(x, z) { return (T || LD) ? rawHeight(x, z) * HILLS : 0; }
function normalAt(x, z) {
  const e = 2, nx = heightAt(x - e, z) - heightAt(x + e, z), nz = heightAt(x, z - e) - heightAt(x, z + e);
  const l = Math.hypot(nx, 2 * e, nz); return [nx / l, 2 * e / l, nz / l];
}
// lay flat geometry (roads, lawns, driveways) onto the terrain: split big triangles, then lift each point
// speed (R52): this ran over every road, lawn and curb and was 2/3 of the load time. It now works on plain numbers into
// typed arrays (no millions of small temporary lists) and remembers the ground slope at points shared by ~6 triangles.
function drape(B) {
  const LDH = LD ? LD.half : -1;   // pieces of 6 m where the ground is lidar-detailed, 16 m farther out (20 m grid there)
  let cap = Math.max(1024, B.pos.length * 2), pos = new Float32Array(cap), nor = new Float32Array(cap), col = new Float32Array(cap),
    uv = new Float32Array(cap / 3 * 2), n = 0;
  const grow = () => { cap *= 2; const g = (a, m) => { const b = new Float32Array(m); b.set(a); return b; };
    pos = g(pos, cap); nor = g(nor, cap); col = g(col, cap); uv = g(uv, cap / 3 * 2); };
  const nMemo = new Map();
  let fx = 0, fy = 1, fz = 0, cr = 1, cg = 1, cb = 1, flat = true;   // current face normal and colour
  function put(x, y, z, u, v) {
    if (n * 3 + 3 > cap) grow();
    const i = n * 3; pos[i] = x; pos[i + 1] = y + heightAt(x, z); pos[i + 2] = z;
    if (flat) {   // flat faces take the terrain's slope; upright faces (curbs) keep their own normal
      const k = (Math.round(x * 50) + 4e5) * 1e6 + (Math.round(z * 50) + 4e5);
      let nn = nMemo.get(k); if (!nn) { nn = normalAt(x, z); nMemo.set(k, nn); }
      nor[i] = nn[0]; nor[i + 1] = nn[1]; nor[i + 2] = nn[2];
    } else { nor[i] = fx; nor[i + 1] = fy; nor[i + 2] = fz; }
    col[i] = cr; col[i + 1] = cg; col[i + 2] = cb; uv[n * 2] = u; uv[n * 2 + 1] = v; n++;
  }
  function tri(ax, ay, az, au, av, bx, by, bz, bu, bv, cx, cy, cz, cu, cv, depth) {
    const lab = Math.hypot(ax - bx, az - bz), lbc = Math.hypot(bx - cx, bz - cz), lca = Math.hypot(cx - ax, cz - az);
    const maxLen = (LDH > 0 && Math.abs(ax) < LDH && Math.abs(az) < LDH) ? 6 : 16;
    if ((lab <= maxLen && lbc <= maxLen && lca <= maxLen) || depth > 14) { put(ax, ay, az, au, av); put(bx, by, bz, bu, bv); put(cx, cy, cz, cu, cv); return; }
    // cut only the longest side in half (thin strips like curbs and lines get cut along their length only, not across)
    const d = depth + 1;
    if (lab >= lbc && lab >= lca) { const mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2, mu = (au + bu) / 2, mv = (av + bv) / 2;
      tri(ax, ay, az, au, av, mx, my, mz, mu, mv, cx, cy, cz, cu, cv, d); tri(mx, my, mz, mu, mv, bx, by, bz, bu, bv, cx, cy, cz, cu, cv, d); }
    else if (lbc >= lca) { const mx = (bx + cx) / 2, my = (by + cy) / 2, mz = (bz + cz) / 2, mu = (bu + cu) / 2, mv = (bv + cv) / 2;
      tri(ax, ay, az, au, av, bx, by, bz, bu, bv, mx, my, mz, mu, mv, d); tri(ax, ay, az, au, av, mx, my, mz, mu, mv, cx, cy, cz, cu, cv, d); }
    else { const mx = (cx + ax) / 2, my = (cy + ay) / 2, mz = (cz + az) / 2, mu = (cu + au) / 2, mv = (cv + av) / 2;
      tri(ax, ay, az, au, av, bx, by, bz, bu, bv, mx, my, mz, mu, mv, d); tri(mx, my, mz, mu, mv, bx, by, bz, bu, bv, cx, cy, cz, cu, cv, d); }
  }
  const P = B.pos, U = B.uv, N = B.nor, C = B.col;
  for (let i = 0, t = 0; i < P.length; i += 9, t += 6) {
    fx = N[i]; fy = N[i + 1]; fz = N[i + 2]; flat = fy > 0.7; cr = C[i]; cg = C[i + 1]; cb = C[i + 2];
    tri(P[i], P[i + 1], P[i + 2], U[t], U[t + 1], P[i + 3], P[i + 4], P[i + 5], U[t + 2], U[t + 3], P[i + 6], P[i + 7], P[i + 8], U[t + 4], U[t + 5], 0);
  }
  return { pos: pos.subarray(0, n * 3), nor: nor.subarray(0, n * 3), col: col.subarray(0, n * 3), uv: uv.subarray(0, n * 2), lift: 0 };
}

function makeBuilder() { return { pos: [], nor: [], col: [], uv: [], lift: 0 }; }
const UV0 = [0, 0];
function pushTri(B, a, b, c, n, color, ta = UV0, tb = UV0, tc = UV0) {
  // fix winding so the face's geometric normal matches n
  const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
  const gx = uy*vz-uz*vy, gy = uz*vx-ux*vz, gz = ux*vy-uy*vx;
  if (gx*n[0] + gy*n[1] + gz*n[2] < 0) { let t = b; b = c; c = t; t = tb; tb = tc; tc = t; }
  const L = B.lift;   // unrolled (R61 speed): no small array per call
  B.pos.push(a[0], a[1] + L, a[2], b[0], b[1] + L, b[2], c[0], c[1] + L, c[2]);
  B.nor.push(n[0], n[1], n[2], n[0], n[1], n[2], n[0], n[1], n[2]);
  B.col.push(color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b);
  B.uv.push(ta[0], ta[1], tb[0], tb[1], tc[0], tc[1]);
}
// ---------- load when near (R54) ----------
// Everything laid over the hills (roads, sidewalks, lines, lawns, curbs, driveways...) was 2/3 of the load time. Instead
// of draping it all at start, finish(..., {drape}) sorts its triangles into 200 m squares and each square is draped only
// when you come near it (a few squares per frame while you drive). Far squares are hidden. Nothing else changes: the
// game data, collisions and buildings are still complete from the start.
const CHUNK = 200, CHUNK_BUILD = 700, CHUNK_SHOW = 1000, CHUNK_DROP = 1500;   // + unload radius (R61 r11)   // square size, build radius, draw radius (fog ends ~900 m)
const chunks = new Map();   // "i,j" -> { i, j, jobs: [{ B, mat, opts, group }], meshes: [], built }
function streamFinish(B, mat, opts) {
  const group = new THREE.Group(); group.userData.streamed = true; scene.add(group);   // (game.js never culls these as props)
  // R61 speed: count the triangles of each square first, then copy straight into fixed-size arrays
  const nT = B.pos.length / 9, keyOf = new Array(nT), count = new Map();
  for (let t = 0, q = 0; q < nT; t += 9, q++) {
    const cx = (B.pos[t] + B.pos[t + 3] + B.pos[t + 6]) / 3, cz = (B.pos[t + 2] + B.pos[t + 5] + B.pos[t + 8]) / 3;
    const i = Math.floor(cx / CHUNK), j = Math.floor(cz / CHUNK), k = i + ',' + j;
    keyOf[q] = k; count.set(k, (count.get(k) || 0) + 1);
    if (!chunks.has(k)) chunks.set(k, { i, j, jobs: [], meshes: [], built: false });
  }
  const buckets = new Map();
  for (const [k, n] of count) buckets.set(k, { pos: new Float32Array(n * 9), nor: new Float32Array(n * 9), col: new Float32Array(n * 9), uv: new Float32Array(n * 6), lift: 0, f: 0 });
  for (let t = 0, u = 0, q = 0; q < nT; t += 9, u += 6, q++) {
    const sub = buckets.get(keyOf[q]), o = sub.f * 9, o2 = sub.f * 6; sub.f++;
    for (let z = 0; z < 9; z++) { sub.pos[o + z] = B.pos[t + z]; sub.nor[o + z] = B.nor[t + z]; sub.col[o + z] = B.col[t + z]; }
    for (let z = 0; z < 6; z++) sub.uv[o2 + z] = B.uv[u + z] || 0;
  }
  for (const [k, sub] of buckets) {
    const job = { B: sub, mat, opts, group }, ch = chunks.get(k);
    if (ch.built) buildJob(ch, job); else ch.jobs.push(job);
  }
  return group;   // stands in for the mesh: hiding it (e.g. road names, N) hides every square of it
}
function buildJob(ch, job) {
  const m = finish(job.B, job.mat, { ...job.opts, drape: true, now: true, parent: job.group });
  m.renderOrder = job.group.renderOrder; ch.meshes.push(m);
  (ch.done || (ch.done = [])).push(job);   // keep the compact source so the square can be unloaded and rebuilt later
}
// R61 r11: squares farther than CHUNK_DROP are unloaded (their draped meshes freed from memory and the graphics card) and
// rebuilt from the kept source when you come back within CHUNK_BUILD
let chunksDropped = 0;
function dropChunk(ch) {
  for (const m of ch.meshes) { m.parent && m.parent.remove(m); m.geometry.dispose(); }
  ch.meshes = []; ch.jobs = ch.done || []; ch.done = []; ch.built = false; chunksDropped++;
}
let chunkScanT = 0;
window.__chunks = () => { let built = 0, tris = 0; for (const ch of chunks.values()) if (ch.built) { built++; for (const m of ch.meshes) tris += m.geometry.attributes.position.count / 3; } return { squares: chunks.size, built, tris: Math.round(tris), dropped: chunksDropped }; };   // for testing
// build the nearest unbuilt squares within CHUNK_BUILD of (x, z) until budgetMs is used up; radius overrides the
// build radius (used at start and after a big-map jump, with an unlimited budget, so you never see an empty street)
function updateChunks(x, z, budgetMs = 6, radius = CHUNK_BUILD) {
  const t0 = performance.now(), R = Math.ceil(radius / CHUNK) + 1, ci = Math.floor(x / CHUNK), cj = Math.floor(z / CHUNK), todo = [];
  for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) {
    const ch = chunks.get(i + ',' + j); if (!ch || ch.built) continue;
    const d = Math.hypot((i + 0.5) * CHUNK - x, (j + 0.5) * CHUNK - z); if (d < radius + CHUNK * 0.71) todo.push([d, ch]);
  }
  todo.sort((a, b) => a[0] - b[0]);
  for (const [, ch] of todo) {
    for (const job of ch.jobs) buildJob(ch, job);
    ch.jobs = []; ch.built = true;
    if (performance.now() - t0 > budgetMs) break;
  }
  if (performance.now() < chunkScanT) return; chunkScanT = performance.now() + 300;   // show / hide squares 3x a second
  for (const ch of chunks.values()) if (ch.built) {
    const d = Math.hypot((ch.i + 0.5) * CHUNK - x, (ch.j + 0.5) * CHUNK - z);
    if (d > CHUNK_DROP) { dropChunk(ch); continue; }
    const vis = d < CHUNK_SHOW;
    for (const m of ch.meshes) m.visible = vis;
  }
}
function finish(B, mat, opts = {}) {
  if (opts.drape && !opts.now) return streamFinish(B, mat, opts);
  if (opts.drape) B = drape(B);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
  const m = new THREE.Mesh(g, mat);
  m.castShadow = !!opts.cast; m.receiveShadow = opts.receive !== false;
  (opts.parent || scene).add(m); return m;
}
function flatMat(offset) {
  return new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -offset, polygonOffsetUnits: -offset * 4 });
}
function ring(p) { return (p.length > 1 && p[0][0] === p[p.length-1][0] && p[0][1] === p[p.length-1][1]) ? p.slice(0, -1) : p; }
function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function signedArea(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i+1) % poly.length]; a += p[0]*q[1] - q[0]*p[1]; } return a / 2; }
function addFlatPoly(B, poly, y, color) {
  const contour = poly.map(p => new THREE.Vector2(p[0], p[1]));
  let tris; try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { return; }
  const W = i => [poly[i][0] / 6, poly[i][1] / 6];
  for (const t of tris) pushTri(B, [poly[t[0]][0], y, poly[t[0]][1]], [poly[t[1]][0], y, poly[t[1]][1]], [poly[t[2]][0], y, poly[t[2]][1]], [0,1,0], color, W(t[0]), W(t[1]), W(t[2]));
}
// cheap seeded random so the town looks the same every time
let seed = 1337; function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function hashStr(s) { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }

// spatial grid for collisions and placement checks
const CELL = 16;
const grid = new Map();
function gkey(i, j) { return (i + 32768) * 65536 + (j + 32768); }   // a number, not a string (R61 speed)
function gridAdd(item, minx, minz, maxx, maxz) {
  for (let i = Math.floor(minx / CELL); i <= Math.floor(maxx / CELL); i++)
    for (let j = Math.floor(minz / CELL); j <= Math.floor(maxz / CELL); j++) {
      const k = gkey(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(item);
    }
}
// R61 speed: a plain array and a visit stamp instead of a new Set per call (called hundreds of thousands of times while
// the world is built); same items, each once
let gridStamp = 0;
function gridNear(x, z) {
  const out = [], st = ++gridStamp, i0 = Math.floor(x / CELL), j0 = Math.floor(z / CELL);
  for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) {
    const l = grid.get(gkey(i, j)); if (l) for (const it of l) if (it._gs !== st) { it._gs = st; out.push(it); }
  }
  return out;
}

// world extent
let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
for (const r of M.roads) for (const p of r.p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); }

// lawn texture: photo grass (ambientCG Grass004, CC0) with soft darker / lighter patches on top, so 6 m tiles don't
// look repeated. Grey-based: the lawn colour comes from the material.
const texGrass = photoTex('grass', 1024, 1024, (g, w, h, img) => {
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
  if (img) tileImage(g, img, w, h, 2, 2);
  else for (let k = 0; k < 56000; k++) { const v = 150 + Math.floor(Math.random() * 105); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 4 + Math.random() * 4); }
  let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 60; k++) { const x = r() * w, y = r() * h, rad = 60 + r() * 160;
    const pg = g.createRadialGradient(x, y, 0, x, y, rad); const v = r() < 0.5 ? '255,255,255' : '120,120,120';
    pg.addColorStop(0, `rgba(${v},0.22)`); pg.addColorStop(1, `rgba(${v},0)`); g.fillStyle = pg; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
});

// shared helpers used by several files (moved here so every file can call them)
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// a texture drawn now (fallback) and redrawn with its photo once the photo has decoded: draw(g, w, h, img | null)
function photoTex(key, w, h, draw) {
  const t = canvasTex(w, h, (g, W, H) => draw(g, W, H, null));
  if (TX[key]) {
    const img = new Image();
    img.onload = () => { const c = t.image, g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.clearRect(0, 0, c.width, c.height); draw(g, c.width, c.height, img); t.needsUpdate = true; };
    img.src = TX[key];
  }
  return t;
}
// repeat an image nx by ny times across a w x h area (seamless photo textures tile cleanly)
function tileImage(g, img, w, h, nx, ny, x0 = 0, y0 = 0) {
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) g.drawImage(img, x0 + i * w / nx, y0 + j * h / ny, w / nx, h / ny);
}
// darken a drawn pattern with a photo's grain (multiply), e.g. grit on shingles
function grain(g, img, w, h, n, alpha = 1) {
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = alpha; tileImage(g, img, w, h, n, n); g.restore();
}
function inBuilding(x, z, pad) {
  for (const it of gridNear(x, z)) {
    if (it.kind === 'bld' && pointInPoly(x, z, it.poly)) return true;
    if (pad && it.kind === 'wall') {
      const dx = it.x2-it.x1, dz = it.z2-it.z1, L2 = dx*dx + dz*dz || 1;
      const t = Math.max(0, Math.min(1, ((x-it.x1)*dx + (z-it.z1)*dz) / L2));
      if (Math.hypot(x - (it.x1 + t*dx), z - (it.z1 + t*dz)) < pad) return true;
    }
  }
  return false;
}

(window.__loadT = window.__loadT || []).push(['core', Math.round(performance.now())]);   // load timing (see ?debug)
