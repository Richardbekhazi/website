// Street Test - parks.js: Ouellette Park (and any mapped park details): play structures, swings, splash pad,
// shelter, basketball court, mini soccer field, rink lights, benches, bins, park sign, painted parking stalls.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
//
// REAL (OpenStreetMap): the outline of every play area, the splash pad, the shelter roof, the basketball court
// (1 hoop), the 55 x 38 m mini soccer field with players' benches, the rink (lights permanent, boards only in winter),
// the 20 parking stalls, the paths. INFERRED (by eye from aerial/Street View, never copied): which piece of play
// equipment stands in which play area, colours, benches, bins, picnic tables, the sign's design.
'use strict';

const parkSpray = [];   // splash-pad water jets, animated by updateParks()
{
  const PM = {};
  const mat = (c, o) => PM[c + (o ? 'o' : '')] || (PM[c + (o ? 'o' : '')] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {})));
  const COL = { post: 0x8e969d, deck: 0x3b3f44, blue: 0x2a63c9, green: 0x3f9a4c, purple: 0x7b4fb4, yellow: 0xf2c230,
    wood: 0x8a6440, black: 0x26282a, white: 0xf2f2ee, bin: 0x2f3a33, chain: 0x5d6166 };
  const bx = (g, w, h, d, x, y, z, c, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
  const rod = (g, a, b, r, c, seg = 8) => {   // cylinder from local point a to local point b
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), mat(c));
    m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); g.add(m); return m;
  };
  // put a group in the world; colliders are [local x, local z, radius]. knock = small props that fall over when hit.
  const put = (g, x, z, yaw, colliders, knock) => {
    g.position.set(x, heightAt(x, z), z); g.rotation.y = yaw;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(g);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    colliders.forEach(([lx, lz, r], i) => {
      const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
      gridAdd({ kind: 'tree', x: wx, z: wz, r, fall: knock && i === 0 ? { obj: g, q0: g.quaternion.clone() } : null }, wx - r - 1, wz - r - 1, wx + r + 1, wz + r + 1);
    });
    return g;
  };
  const centroid = p => { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; };
  const obox = poly => { const o = orientedBox(poly); const uc = (o.u0 + o.u1) / 2, vc = (o.v0 + o.v1) / 2;
    const c = boxPt(o, uc, vc, 0); return { cx: c[0], cz: c[2], L: o.u1 - o.u0, W: o.v1 - o.v0, ux: o.c, uz: o.s, yaw: Math.atan2(o.c, o.s) }; };
  // yaw that turns local +x onto the box's long axis
  const yawX = b => Math.atan2(-b.uz, b.ux);

  // ---------- ground surfaces (draped on the lidar ground) ----------
  const surfB = makeBuilder(), chipB = makeBuilder(), edgeB = makeBuilder(), lineB2 = makeBuilder();
  const texChips = photoTex('chips', 512, 512, (g, w, h, img) => {   // photo: ambientCG WoodChips001 (CC0), tinted warm
    g.fillStyle = '#a7845a'; g.fillRect(0, 0, w, h);
    if (img) { g.save(); g.globalCompositeOperation = 'multiply'; tileImage(g, img, w, h, 1, 1); g.restore(); return; }
    for (let i = 0; i < 2600; i++) {   // engineered wood fibre, the usual Ottawa playground surface
      const t = Math.random(); g.fillStyle = t < 0.33 ? '#8a6a45' : t < 0.66 ? '#c29d6e' : '#6f5435';
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * Math.PI);
      g.fillRect(-3, -1, 4 + Math.random() * 6, 1.6 + Math.random()); g.restore();
    }
  });
  const white = new THREE.Color(COL.white), black = new THREE.Color(0x2b2c2e);
  const line = (B, a, b, w, y = 0.075, col = white) => {   // painted stripe from a to b ([x, z])
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, px = -dz / L * w / 2, pz = dx / L * w / 2;
    flatQuad(B, [a[0] + px, a[1] + pz], [b[0] + px, b[1] + pz], [b[0] - px, b[1] - pz], [a[0] - px, a[1] - pz], y, col);
  };
  const arc = (B, cx, cz, r, a0, a1, w, y, col = white) => {
    const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r / 0.6));
    for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n;
      line(B, [cx + Math.cos(t0) * r, cz + Math.sin(t0) * r], [cx + Math.cos(t1) * r, cz + Math.sin(t1) * r], w, y, col); }
  };
  // a local frame on a box: P(u, v) -> world [x, z]
  const frame = b => (u, v) => [b.cx + b.ux * u - b.uz * v, b.cz + b.uz * u + b.ux * v];

  const parks = M.areas.filter(a => a.t === 'park');
  const inPark = (x, z) => parks.some(a => pointInPoly(x, z, ring(a.p)));
  const plays = [], extraBlocked = [];
  let splash = null, rink = null; const courts = [], fields = [], tennis = [], volley = [];   // R61: every park, not only Ouellette
  for (const a of M.areas) {
    const poly = ring(a.p); if (poly.length < 3) continue;
    const [cx, cz] = centroid(poly);
    if (!inPark(cx, cz)) continue;
    if (a.t === 'play' && a.k === 'splash_pad') splash = { poly, cx, cz };
    else if (a.t === 'play') plays.push({ poly, cx, cz, area: Math.abs(signedArea(poly)), park: parks.findIndex(pk => pointInPoly(cx, cz, ring(pk.p))) });
    else if (a.t === 'pitch' && a.sp === 'basketball') courts.push({ poly, b: obox(poly), hoops: +a.hoops || 1 });
    else if (a.t === 'pitch' && a.sp === 'soccer') fields.push({ poly, b: obox(poly) });
    else if (a.t === 'pitch' && a.sp === 'tennis') tennis.push({ poly, b: obox(poly) });
    else if (a.t === 'pitch' && a.sp === 'volleyball') volley.push({ poly, b: obox(poly), sand: a.k === 'sand' || !a.k });
    else if (a.t === 'ice') rink = { poly, b: obox(poly), lit: a.lit };
  }

  // play areas: wood-fibre surface inside a black plastic border (border follows the real outline)
  for (const p of plays) {
    addFlatPoly(chipB, p.poly, 0.085, new THREE.Color(0xffffff));
    extraBlocked.push(p.poly);
    for (let i = 0; i < p.poly.length; i++) {
      const a = p.poly[i], q = p.poly[(i + 1) % p.poly.length], L = Math.hypot(q[0] - a[0], q[1] - a[1]); if (L < 0.2) continue;
      const d = [(q[0] - a[0]) / L, (q[1] - a[1]) / L];
      box(edgeB, (a[0] + q[0]) / 2, (a[1] + q[1]) / 2, d, [-d[1], 0, d[0]], L + 0.12, 0.12, 0, 0.2, black);
    }
  }

  // splash pad: light concrete with coloured rings; jets animate (summer only in real life; the game is summer)
  if (splash) {
    addFlatPoly(surfB, splash.poly, 0.085, new THREE.Color(0xcfc9bd));
    extraBlocked.push(splash.poly);
    const rings = [[0, 0, 3.2, 0x2f7fd0], [-4, 1.5, 1.6, 0xf2c230], [3.8, -1.2, 1.8, 0x3f9a4c], [1.5, 3.2, 1.2, 0xe0583a]];
    for (const [dx, dz, r, c] of rings) {
      if (!pointInPoly(splash.cx + dx, splash.cz + dz, splash.poly)) continue;
      arc(lineB2, splash.cx + dx, splash.cz + dz, r, 0, Math.PI * 2, 0.35, 0.09, new THREE.Color(c));
    }
    const spray = new THREE.MeshLambertMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.55, depthWrite: false });
    const jetG = new THREE.CylinderGeometry(0.03, 0.12, 1, 6, 1, true); jetG.translate(0, 0.5, 0);
    const jetAt = (x, z, h, ph) => { const m = new THREE.Mesh(jetG, spray); m.position.set(x, heightAt(x, z) + 0.09, z); m.scale.y = h; scene.add(m); parkSpray.push({ m, h, ph }); };
    // ground jets around the centre ring
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, x = splash.cx + Math.cos(a) * 3.2, z = splash.cz + Math.sin(a) * 3.2; jetAt(x, z, 1.6, k * 0.6); }
    // standing water features: an arch and two spray posts
    const arch = new THREE.Group();
    for (const s of [-1, 1]) rod(arch, [s * 1.4, 0, 0], [s * 1.4, 2.1, 0], 0.09, COL.blue);
    const top = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.09, 6, 16, Math.PI), mat(COL.blue)); top.position.y = 2.1; arch.add(top);
    put(arch, splash.cx, splash.cz, 0.4, [[-1.4, 0, 0.15], [1.4, 0, 0.15]]);
    for (const [dx, dz, c] of [[-4, 1.5, COL.yellow], [3.8, -1.2, COL.green]]) {
      const x = splash.cx + dx, z = splash.cz + dz; if (!pointInPoly(x, z, splash.poly)) continue;
      const g = new THREE.Group(); rod(g, [0, 0, 0], [0, 2.2, 0], 0.12, c); bx(g, 0.7, 0.12, 0.7, 0, 2.25, 0, c);
      put(g, x, z, 0, [[0, 0, 0.2]]); jetAt(x, z, 2.4, dx);
    }
  }

  // ---------- play equipment ----------
  // one deck tower: 4 posts, a deck at deckH, optional roof
  const tower = (g, x, z, deckH, roof, roofCol) => {
    const s = 0.75;
    for (const [a, b] of [[-s, -s], [s, -s], [s, s], [-s, s]]) rod(g, [x + a, 0, z + b], [x + a, roof ? deckH + 2.1 : deckH + 1, z + b], 0.06, COL.post);
    bx(g, 1.6, 0.08, 1.6, x, deckH, z, COL.deck);
    for (const [w, d, ox, oz] of [[1.5, 0.05, 0, -s], [0.05, 1.5, s, 0]]) bx(g, w, 0.75, d, x + ox, deckH + 0.45, z + oz, COL.green);   // safety panels
    if (roof) {
      const r = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.8, 4), mat(roofCol)); r.position.set(x, deckH + 2.5, z); r.rotation.y = Math.PI / 4; g.add(r);
    }
  };
  const slide = (g, x, z, deckH, dir, col) => {   // straight slide leaving the deck edge in direction dir (local x or z)
    const L = deckH * 2.1 + 0.6, ex = x + dir[0] * L, ez = z + dir[1] * L;
    const bed = rod(g, [x + dir[0] * 0.8, deckH, z + dir[1] * 0.8], [ex, 0.35, ez], 0.32, col, 10); bed.scale.set(1, 1, 0.35);
    for (const s of [-1, 1]) rod(g, [x + dir[0] * 0.8 - dir[1] * s * 0.33, deckH + 0.25, z + dir[1] * 0.8 + dir[0] * s * 0.33], [ex - dir[1] * s * 0.33, 0.6, ez + dir[0] * s * 0.33], 0.04, col);
  };
  const bigStructure = (p) => {   // senior play structure: two towers, bridge, slides, climber, spider-web net
    const b = obox(p.poly), g = new THREE.Group(), sc = Math.min(1, b.L / 18);
    tower(g, -2.2 * sc, 0, 1.8, true, COL.blue); tower(g, 2.2 * sc, 0, 1.4, true, COL.purple);
    bx(g, 4.4 * sc - 1.6, 0.06, 0.9, 0, 1.6, 0, COL.deck);                                        // bridge
    for (const s of [-1, 1]) rod(g, [-2.2 * sc + 0.8, 2.3, s * 0.45], [2.2 * sc - 0.8, 1.95, s * 0.45], 0.035, COL.yellow);
    slide(g, -2.2 * sc, 0, 1.8, [0, 1], COL.blue); slide(g, 2.2 * sc, 0, 1.4, [1, 0], COL.blue);
    bx(g, 1.4, 1.5, 0.1, -2.2 * sc, 0.8, -0.85, COL.yellow, 0.2);                                  // climbing wall
    // spider-web rope climber
    const web = new THREE.Group(), wx = -b.L * 0.28, wz = b.W * 0.15;
    rod(web, [0, 0, 0], [0, 3.2, 0], 0.07, COL.post);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; rod(web, [0, 3.0, 0], [Math.cos(a) * 2.4, 0.05, Math.sin(a) * 2.4], 0.025, COL.black, 5); }
    for (const h of [0.9, 1.7]) for (let k = 0; k < 6; k++) {
      const a0 = k / 6 * Math.PI * 2, a1 = (k + 1) / 6 * Math.PI * 2, r = 2.4 * (1 - h / 3.0);
      rod(web, [Math.cos(a0) * r, h, Math.sin(a0) * r], [Math.cos(a1) * r, h, Math.sin(a1) * r], 0.02, COL.black, 4);
    }
    const yaw = yawX(b);
    put(g, b.cx, b.cz, yaw, [[-2.2 * sc, 0, 1.0], [2.2 * sc, 0, 1.0], [0, 0, 0.6], [-2.2 * sc, 2.5, 0.5], [2.2 * sc + 2.5, 0, 0.5]]);
    const F = frame(b), wp = F(wx, wz); put(web, wp[0], wp[1], 0, [[0, 0, 0.3]]);
  };
  const juniorStructure = (p) => {   // tot lot: one low tower with a roof and a short slide, plus a crawl tunnel
    const b = obox(p.poly), g = new THREE.Group();
    tower(g, 0, 0, 0.9, true, COL.blue); slide(g, 0, 0, 0.9, [1, 0], COL.blue);
    const steps = [0.3, 0.6]; steps.forEach((h, i) => bx(g, 0.8, 0.08, 0.35, 0, h, -1.0 - i * 0.35 + 0.35, COL.deck));
    const tun = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2, 12, 1, true), mat(COL.yellow, { side: THREE.DoubleSide }));
    tun.rotation.z = Math.PI / 2; tun.position.set(-1.9, 0.45, 0); g.add(tun);
    put(g, b.cx, b.cz, yawX(b), [[0, 0, 1.0], [1.8, 0, 0.5], [-1.9, 0, 0.6]]);
    springRiders(p, b, 2);
  };
  const swings = (p) => {   // A-frame swing set, 2 bays: belt seats + toddler bucket seats
    const b = obox(p.poly), g = new THREE.Group(), bays = b.L > 12 ? 2 : 1, span = bays * 3.2, H = 2.45;
    const ends = []; for (let k = 0; k <= bays; k++) ends.push(-span / 2 + k * 3.2);
    for (const e of ends) for (const s of [-1, 1]) rod(g, [e, H, 0], [e, 0, s * 1.1], 0.06, COL.post);
    rod(g, [-span / 2, H, 0], [span / 2, H, 0], 0.07, COL.post);
    for (let k = 0; k < bays; k++) for (const o of [-0.75, 0.75]) {
      const x = ends[k] + 1.6 + o, bucket = k === bays - 1 && bays > 1;
      for (const c of [-0.22, 0.22]) rod(g, [x + c, H, 0], [x + c, 0.5, 0], 0.012, COL.chain, 4);
      if (bucket) bx(g, 0.5, 0.3, 0.45, x, 0.5, 0, COL.purple); else bx(g, 0.55, 0.05, 0.2, x, 0.48, 0, COL.black);
    }
    put(g, b.cx, b.cz, yawX(b), ends.flatMap(e => [[e, -1.1, 0.15], [e, 1.1, 0.15]]));
  };
  function springRiders(p, b, n) {   // little spring animals, knock-over-able
    const F = frame(b);
    for (let k = 0; k < n; k++) {
      const [x, z] = F(-b.L * 0.3 + k * 1.6, -b.W * 0.28); if (!pointInPoly(x, z, p.poly)) continue;
      const g = new THREE.Group();
      const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 8), mat(COL.chain)); spring.position.y = 0.23; g.add(spring);
      bx(g, 0.75, 0.32, 0.25, 0, 0.62, 0, [COL.green, COL.yellow, COL.blue][k % 3]); bx(g, 0.22, 0.3, 0.22, 0.3, 0.88, 0, [COL.green, COL.yellow, COL.blue][k % 3]);
      rod(g, [0.12, 0.8, -0.18], [0.12, 0.8, 0.18], 0.025, COL.black);
      put(g, x, z, k * 0.7, [[0, 0, 0.35]], true);
    }
  }
  const spinner = (p) => {   // ground-level spinning dish
    const g = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.35, 0.35, 16), mat(COL.purple)); dish.position.y = 0.4; g.add(dish);
    rod(g, [0, 0, 0], [0, 0.25, 0], 0.08, COL.post);
    put(g, p.cx, p.cz, 0, [[0, 0, 0.7]]);
  };
  // which equipment goes where: biggest area = senior structure, next = junior, then swings, then riders
  // (matches the aerial view: blue slides in the two central lobes, an A-frame in the west lobe)
  // ranked within each park (R61), so every park gets its own big structure
  const rankIn = new Map();
  const byArea = plays.slice().sort((a, b) => b.area - a.area);
  byArea.forEach(p => { const i = rankIn.get(p.park) || 0; rankIn.set(p.park, i + 1); p.rank = i; });
  byArea.forEach(p => { const i = p.rank;
    if (p.area < 80) spinner(p);
    else if (i === 0) bigStructure(p);
    else if (i === 1) juniorStructure(p);
    else if (i === 2) swings(p);
    else springRiders(p, obox(p.poly), 3);
  });

  // ---------- shelter: open steel shelter, light metal hip roof (OSM: amenity=shelter, building=roof) ----------
  for (const s of M.buildings) {
    if (s.am !== 'shelter') continue;
    let poly = ring(s.p); if (poly.length < 3) continue;
    const [cx, cz] = centroid(poly), y0 = heightAt(cx, cz), eave = 2.7, peak = 4.1;
    extraBlocked.push(poly);
    const g = new THREE.Group(); g.position.set(cx, y0, cz); scene.add(g);
    const loc = poly.map(p => [p[0] - cx, p[1] - cz]);
    for (const [x, z] of loc) { rod(g, [x * 0.92, 0, z * 0.92], [x * 0.92, eave, z * 0.92], 0.1, COL.green); gridAdd({ kind: 'tree', x: cx + x * 0.92, z: cz + z * 0.92, r: 0.15 }, cx + x - 1, cz + z - 1, cx + x + 1, cz + z + 1); }
    const roofB = makeBuilder(), rc = new THREE.Color(0xe9e9e4), fc = new THREE.Color(0x3f9a4c);
    const ov = loc.map(([x, z]) => [x * 1.08, z * 1.08]);   // overhang
    for (let i = 0; i < ov.length; i++) {
      const a = ov[i], b = ov[(i + 1) % ov.length];
      const A = [a[0], eave, a[1]], B = [b[0], eave, b[1]], P = [0, peak, 0];
      pushTri(roofB, A, B, P, upNormal(A, B, P), rc);
      const A2 = [a[0], eave - 0.3, a[1]], B2 = [b[0], eave - 0.3, b[1]], n = [a[1] - b[1], 0, b[0] - a[0]], l = Math.hypot(n[0], n[2]) || 1;
      const nn = [n[0] / l, 0, n[2] / l]; const out = (nn[0] * (a[0] + b[0]) + nn[2] * (a[1] + b[1])) > 0 ? nn : [-nn[0], 0, -nn[2]];
      pushTri(roofB, A2, B2, B, out, fc); pushTri(roofB, A2, B, A, out, fc);   // fascia band
      pushTri(roofB, A, B, [0, eave, 0], [0, -1, 0], new THREE.Color(0xbdbdb8));  // underside
    }
    const rm = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    rm.geometry.setAttribute('position', new THREE.Float32BufferAttribute(roofB.pos, 3));
    rm.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(roofB.nor, 3));
    rm.geometry.setAttribute('color', new THREE.Float32BufferAttribute(roofB.col, 3));
    rm.castShadow = true; g.add(rm);
    addFlatPoly(surfB, poly, 0.09, new THREE.Color(0xbab6ad));   // concrete pad
    // picnic tables under the roof
    const o = obox(poly);
    for (const k of [-1, 1]) picnic(cx + o.ux * k * 2.3, cz + o.uz * k * 2.3, yawX(o));
  }
  function picnic(x, z, yaw) {
    const g = new THREE.Group();
    bx(g, 1.8, 0.05, 0.75, 0, 0.75, 0, COL.wood);
    for (const s of [-1, 1]) { bx(g, 1.8, 0.04, 0.28, 0, 0.45, s * 0.6, COL.wood); for (const e of [-0.7, 0.7]) rod(g, [e, 0, s * 0.75], [e, 0.75, 0], 0.03, COL.black); }
    put(g, x, z, yaw, [[0, 0, 0.8]], true);
  }

  // ---------- basketball court: asphalt, half-court lines, one hoop (OSM: hoops=1) ----------
  for (const court of courts) {
    const b = court.b, F = frame(b), hl = b.L / 2, hw = b.W / 2;
    addFlatPoly(surfB, court.poly, 0.08, new THREE.Color(0x505357));
    extraBlocked.push(court.poly);
    const yL = 0.095, w = 0.07;
    const edge = [F(-hl + 0.3, -hw + 0.3), F(hl - 0.3, -hw + 0.3), F(hl - 0.3, hw - 0.3), F(-hl + 0.3, hw - 0.3)];
    for (let i = 0; i < 4; i++) line(lineB2, edge[i], edge[(i + 1) % 4], w, yL);
    // the hoop stands at the court end away from the park paths (side inferred)
    // small neighbourhood pad: just the key and the free-throw half circle (scaled to the pad)
    const end = -hl + 0.3, key = Math.min(4.9, b.L * 0.45), kw = Math.min(3.6, b.W * 0.45), base = Math.atan2(b.uz, b.ux);
    line(lineB2, F(end, -kw / 2), F(end + key, -kw / 2), w, yL); line(lineB2, F(end, kw / 2), F(end + key, kw / 2), w, yL);
    line(lineB2, F(end + key, -kw / 2), F(end + key, kw / 2), w, yL);
    const fc = F(end + key, 0); arc(lineB2, fc[0], fc[1], kw / 2, base - Math.PI / 2, base + Math.PI / 2, w, yL);
    const g = new THREE.Group();
    // pole 0.9 m behind the baseline, arm over the court, rim 1.15 m in from the baseline at 3.05 m
    rod(g, [-0.9, 0, 0], [-0.9, 3.0, 0], 0.08, COL.post); rod(g, [-0.9, 2.95, 0], [0.85, 3.2, 0], 0.06, COL.post);
    bx(g, 0.05, 1.05, 1.8, 0.88, 3.4, 0, COL.white);                             // backboard
    bx(g, 0.02, 0.45, 0.6, 0.91, 3.3, 0, 0xd8442f);                              // shooter's square
    bx(g, 0.03, 0.37, 0.53, 0.915, 3.3, 0, COL.white);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 16), mat(0xe0582a)); ring2.rotation.x = Math.PI / 2; ring2.position.set(1.15, 3.05, 0); g.add(ring2);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.15, 0.4, 12, 1, true), mat(COL.white, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, wireframe: true }));
    net.position.set(1.15, 2.85, 0); g.add(net);
    const hp = F(end, 0); put(g, hp[0], hp[1], yawX(b), [[-0.9, 0, 0.15]]);
  }

  // ---------- mini soccer field: 55 x 38 m (OSM), white lines on the grass, small goals, players' benches ----------
  for (const field of fields) {
    const b = field.b, F = frame(b), hl = Math.min(55, b.L) / 2, hw = Math.min(38, b.W) / 2, w = 0.1, y = 0.075;
    const c = [F(-hl, -hw), F(hl, -hw), F(hl, hw), F(-hl, hw)];
    for (let i = 0; i < 4; i++) line(lineB2, c[i], c[(i + 1) % 4], w, y);
    line(lineB2, F(0, -hw), F(0, hw), w, y);
    const cc = F(0, 0); arc(lineB2, cc[0], cc[1], 5, 0, Math.PI * 2, w, y);
    for (const s of [-1, 1]) {
      const gx = s * hl, bw = 8, bd = 6;   // goal box
      line(lineB2, F(gx, -bw), F(gx - s * bd, -bw), w, y); line(lineB2, F(gx - s * bd, -bw), F(gx - s * bd, bw), w, y); line(lineB2, F(gx - s * bd, bw), F(gx, bw), w, y);
      // portable aluminium goal, 4.9 x 1.8 m, with a net
      const g = new THREE.Group(), gw = 2.45, gh = 1.8, dp = 1.2;
      for (const v of [-gw, gw]) { rod(g, [0, 0, v], [0, gh, v], 0.05, COL.white); rod(g, [0, gh, v], [s * dp, 0, v], 0.03, COL.white); rod(g, [0, 0, v], [s * dp, 0, v], 0.03, COL.white); }
      rod(g, [0, gh, -gw], [0, gh, gw], 0.05, COL.white); rod(g, [s * dp, 0, -gw], [s * dp, 0, gw], 0.03, COL.white);
      const netMat = mat(0xffffff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, wireframe: true });
      // sloping back net from the crossbar down to the ground bar
      const ng = new THREE.PlaneGeometry(gw * 2, 1, 10, 5), np = ng.attributes.position;
      for (let i = 0; i < np.count; i++) { const zz = np.getX(i), t = np.getY(i) + 0.5; np.setXYZ(i, s * dp * (1 - t), gh * t, zz); }
      ng.computeVertexNormals(); g.add(new THREE.Mesh(ng, netMat));
      const gp = F(gx, 0); put(g, gp[0], gp[1], yawX(b), [[0, -gw, 0.12], [0, gw, 0.12], [s * dp, 0, 0.5]]);
    }
    // players' benches (OSM pitch:players_bench=yes) on the long side facing the park centre
    for (const u of [-6, 6]) { const p = F(u, -hw - 2.5); bench(p[0], p[1], yawX(b) + Math.PI / 2, true); }
  }
  function bench(x, z, yaw, long) {   // slatted park bench on two black legs; falls over when hit
    const g = new THREE.Group(), L = long ? 3.0 : 1.8;
    for (let k = 0; k < 3; k++) bx(g, L, 0.04, 0.12, 0, 0.45, -0.18 + k * 0.15, COL.wood);
    for (let k = 0; k < 2; k++) bx(g, L, 0.12, 0.035, 0, 0.62 + k * 0.17, -0.3, COL.wood);
    for (const e of [-L / 2 + 0.2, L / 2 - 0.2]) { bx(g, 0.06, 0.45, 0.5, e, 0.22, -0.05, COL.black); bx(g, 0.06, 0.45, 0.05, e, 0.68, -0.32, COL.black); }
    put(g, x, z, yaw, [[0, 0, L / 2 - 0.2]], true);
  }
  function bin(x, z) {   // dark green park waste bin
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.95, 10), mat(COL.bin)); c.position.y = 0.48; g.add(c);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 10), mat(COL.black)); lid.position.y = 0.98; g.add(lid);
    put(g, x, z, 0, [[0, 0, 0.32]], true);
  }

  // ---------- tennis courts (OSM sport=tennis, R61): green surface, white lines, net, 3 m chain-link fence ----------
  // INFERRED: colours and fence height (typical City of Ottawa public courts). Court size follows the mapped outline.
  for (const t of tennis) {
    const b = t.b, F = frame(b), hl = b.L / 2, hw = b.W / 2;
    addFlatPoly(surfB, t.poly, 0.08, new THREE.Color(0x4f7a5a));
    extraBlocked.push(t.poly);
    const nCourts = Math.max(1, Math.round(b.W / 17)), cw = b.W / nCourts, yL = 0.095, w = 0.06;
    for (let k = 0; k < nCourts; k++) {
      const v0 = -hw + k * cw, vc = v0 + cw / 2, L2 = Math.min(11.9, hl - 2), W2 = Math.min(5.5, cw / 2 - 1), S = Math.min(4.1, W2 * 0.75);
      const c = [F(-L2, vc - W2), F(L2, vc - W2), F(L2, vc + W2), F(-L2, vc + W2)];
      for (let i = 0; i < 4; i++) line(lineB2, c[i], c[(i + 1) % 4], w, yL);
      for (const sv of [-S, S]) line(lineB2, F(-L2, vc + sv), F(L2, vc + sv), w, yL);
      for (const su of [-6.4, 6.4]) line(lineB2, F(su, vc - S), F(su, vc + S), w, yL);
      line(lineB2, F(-6.4, vc), F(6.4, vc), w, yL);
      const g = new THREE.Group();   // the net across the middle
      for (const sv of [-W2 - 0.9, W2 + 0.9]) rod(g, [0, 0, sv], [0, 1.07, sv], 0.04, COL.black);
      bx(g, 0.02, 0.9, (W2 + 0.9) * 2, 0, 0.5, 0, 0x222426).material = mat(0x222426, { transparent: true, opacity: 0.55 });
      bx(g, 0.04, 0.06, (W2 + 0.9) * 2, 0, 0.94, 0, COL.white);
      const np = F(0, vc); put(g, np[0], np[1], yawX(b), [[0, -W2 - 0.9, 0.1], [0, W2 + 0.9, 0.1]]);
    }
    // chain-link fence on the outline: posts every 3 m, see-through mesh, solid for the car
    const fg = new THREE.Group(); fg.position.set(0, 0, 0); scene.add(fg);
    const P = t.poly;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 0.5) continue;
      const y0 = heightAt((a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L, 3), mat(0x8a8f94, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      m.position.set((a[0] + c[0]) / 2, y0 + 1.5, (a[1] + c[1]) / 2); m.rotation.y = -Math.atan2(c[1] - a[1], c[0] - a[0]); fg.add(m);
      const n = Math.max(1, Math.round(L / 3));
      for (let k = 0; k <= n; k++) {
        const x = a[0] + (c[0] - a[0]) * k / n, z = a[1] + (c[1] - a[1]) * k / n;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.1, 6), mat(0x8a8f94)); post.position.set(x, heightAt(x, z) + 1.55, z); fg.add(post);
      }
      gridAdd({ kind: 'wall', x1: a[0], z1: a[1], x2: c[0], z2: c[1] }, Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.max(a[0], c[0]), Math.max(a[1], c[1]));
    }
  }
  // ---------- volleyball (OSM sport=volleyball, R61 r13): sand court with a rope boundary and a net on two posts ----------
  // INFERRED: sand surface (City of Ottawa park courts are usually sand), net height 2.43 m.
  for (const v of volley) {
    const b = v.b, F = frame(b), hl = b.L / 2;
    addFlatPoly(surfB, v.poly, 0.08, new THREE.Color(0xd9c79a));
    extraBlocked.push(v.poly);
    const g = new THREE.Group(), half = Math.min(4.5, b.W / 2 - 0.3) + 0.6;
    for (const s2 of [-half, half]) rod(g, [0, 0, s2], [0, 2.55, s2], 0.05, COL.post);
    bx(g, 0.02, 1.0, half * 2, 0, 1.93, 0, 0x222426).material = mat(0x222426, { transparent: true, opacity: 0.5 });
    bx(g, 0.04, 0.07, half * 2, 0, 2.43, 0, COL.white);
    const np = F(0, 0); put(g, np[0], np[1], yawX(b), [[0, -half, 0.1], [0, half, 0.1]]);
  }
  window.__parks = { volley: volley.length, parks: parks.length, plays: plays.length, courts: courts.length, fields: fields.length, tennis: tennis.length };   // for testing

  // ---------- rink: grass in summer; the light poles are permanent (OSM ice_rink:lights=permanent) ----------
  if (rink && rink.lit) {
    const b = rink.b, F = frame(b);
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const [x, z] = F(su * (b.L / 2 + 1.5), sv * (b.W / 2 + 1.5));
      if (inBuilding(x, z, 0.5)) continue;
      const g = new THREE.Group();
      rod(g, [0, 0, 0], [0, 11, 0], 0.13, 0x9a9ea3); rod(g, [-0.9, 10.8, 0], [0.9, 10.8, 0], 0.05, 0x9a9ea3);
      for (const s of [-0.7, 0.7]) { const h = bx(g, 0.5, 0.35, 0.18, s, 10.55, 0.15, 0x4a4d50); h.rotation.x = -0.5; }
      put(g, x, z, Math.atan2(b.cx - x, b.cz - z), [[0, 0, 0.2]], true);
    }
  }

  // ---------- benches and bins along the park paths near the play areas (inferred spacing) ----------
  if (plays.length) {
    let px = 0, pz = 0; for (const p of plays) { px += p.cx; pz += p.cz; } px /= plays.length; pz /= plays.length;
    const taken = [];
    const free = (x, z, r) => !taken.some(([a, c]) => Math.hypot(a - x, c - z) < r) && !inBuilding(x, z, 1)
      && !extraBlocked.some(p => pointInPoly(x, z, p)) && !blockedAreas.some(p => pointInPoly(x, z, p)) && inPark(x, z);
    let nb = 0;
    for (const r of M.roads) {
      if (r.t !== 'path' || nb >= 14) continue;
      for (let i = 0; i + 1 < r.p.length && nb < 14; i++) {
        const a = r.p[i], q = r.p[i + 1], L = Math.hypot(q[0] - a[0], q[1] - a[1]); if (L < 6) continue;
        const ux = (q[0] - a[0]) / L, uz = (q[1] - a[1]) / L, mx = (a[0] + q[0]) / 2, mz = (a[1] + q[1]) / 2;
        if (Math.hypot(mx - px, mz - pz) > 38) continue;
        // bench on the side facing the play areas, so parents can watch
        let nx = -uz, nz = ux; if ((px - mx) * nx + (pz - mz) * nz < 0) { nx = -nx; nz = -nz; }
        const off = r.w / 2 + 1.0, x = mx - nx * off, z = mz - nz * off;
        if (!free(x, z, 9)) continue;
        bench(x, z, Math.atan2(nx, nz), false); taken.push([x, z]); nb++;
        const bx2 = x + ux * 1.6, bz2 = z + uz * 1.6; if (nb % 2 && free(bx2, bz2, 0.5)) bin(bx2, bz2);
      }
    }
  }

  const parkSigns = []; window.__parkSigns = parkSigns;   // for testing
  // ---------- park sign at the Strasbourg Street parking entrance (bilingual, design inferred, no logo) ----------
  for (const pk of parks) {
    const lot = M.areas.find(a => a.t === 'parking' && (() => { const [x, z] = centroid(ring(a.p)); return pointInPoly(x, z, ring(pk.p)) || Math.hypot(x - centroid(ring(pk.p))[0], z - centroid(ring(pk.p))[1]) < 120; })());
    let best = null;
    if (lot) for (const v of ring(lot.p)) { const r = nearestRoadPoint(v[0], v[1]); if (r && (!best || r.d < best.d)) best = { v, r, d: r.d }; }
    // R61 r12: a park without a parking lot gets its sign on its edge nearest a street (most park frontages)
    if (!best) for (const v of ring(pk.p)) { const r = nearestRoadPoint(v[0], v[1]); if (r && r.d < 40 && (!best || r.d < best.d)) best = { v, r, d: r.d }; }
    if (!best || !pk.n) continue;
    parkSigns.push(pk.n);
    const { v, r } = best, dx = r.x - v[0], dz = r.z - v[1], l = Math.hypot(dx, dz) || 1;
    // step 5 m sideways along the street so the sign sits on the lawn beside the lot entrance
    let sx = v[0] - dz / l * 5 + dx / l * 0.5, sz = v[1] + dx / l * 5 + dz / l * 0.5;
    if (!inPark(sx, sz)) { sx = v[0] + dz / l * 5 + dx / l * 0.5; sz = v[1] - dx / l * 5 + dz / l * 0.5; }
    const fr = pk.n.replace(/ Park$/, '');
    const tex = canvasTex(512, 200, (g2, w, h) => {
      g2.fillStyle = '#20402c'; g2.fillRect(0, 0, w, h); g2.strokeStyle = '#e9e4d4'; g2.lineWidth = 6; g2.strokeRect(10, 10, w - 20, h - 20);
      g2.fillStyle = '#f4f1e6'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.font = 'bold 54px Arial, sans-serif'; g2.fillText('Parc ' + fr, w / 2, 70);
      g2.font = 'bold 54px Arial, sans-serif'; g2.fillText(fr + ' Park', w / 2, 140);
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const g = new THREE.Group();
    for (const s of [-1, 1]) bx(g, 0.14, 1.6, 0.14, s * 1.05, 0.8, 0, 0x5a4330);
    const face = new THREE.MeshLambertMaterial({ map: tex });
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.78, 0.08), [mat(0x20402c), mat(0x20402c), mat(0x20402c), mat(0x20402c), face, face]);
    board.position.y = 1.15; g.add(board);
    put(g, sx, sz, Math.atan2(dx, dz), [[0, 0, 1.0]], true);
  }

  // ---------- painted lines for every individually mapped parking stall (OSM amenity=parking_space) ----------
  {
    const seen = new Set(), stallW = new THREE.Color(0xe8e8e2);
    let ax0 = Infinity, az0 = Infinity, ax1 = -Infinity, az1 = -Infinity;   // the apartment lot paints its own stalls
    for (const a of aptBuildings) { ax0 = Math.min(ax0, a.cx); az0 = Math.min(az0, a.cz); ax1 = Math.max(ax1, a.cx); az1 = Math.max(az1, a.cz); }
    for (const st of (M.stalls || [])) {
      const p = ring(st); if (p.length < 4) continue;
      const [cx, cz] = centroid(p);
      if (aptBuildings.length >= 3 && cx > ax0 - 5 && cx < ax1 + 5 && cz > az0 - 5 && cz < az1 + 5) continue;
      // the two long sides of the stall are the painted lines
      const edges = p.map((v, i) => [v, p[(i + 1) % p.length]]).map(([a, b]) => ({ a, b, L: Math.hypot(b[0] - a[0], b[1] - a[1]) }))
        .sort((e1, e2) => e2.L - e1.L).slice(0, 2);
      for (const e of edges) {
        const key = Math.round((e.a[0] + e.b[0]) * 2) + ',' + Math.round((e.a[1] + e.b[1]) * 2);
        if (seen.has(key)) continue; seen.add(key);
        line(lineB2, e.a, e.b, 0.1, 0.095, stallW);
      }
    }
  }

  for (const p of extraBlocked) blockedAreas.push(p);   // no lidar trees growing through equipment
  finish(surfB, flatMat(2), { drape: true });
  finish(chipB, new THREE.MeshLambertMaterial({ vertexColors: true, map: texChips, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }), { drape: true });
  finish(edgeB, new THREE.MeshLambertMaterial({ vertexColors: true }), { drape: true, cast: true });
  finish(lineB2, flatMat(3), { drape: true });
}
// splash-pad jets pulse gently
function updateParks(t) {
  for (const s of parkSpray) s.m.scale.y = s.h * (0.75 + 0.25 * Math.sin(t * 2.2 + s.ph));
}

(window.__loadT = window.__loadT || []).push(['parks', Math.round(performance.now())]);   // load timing (see ?debug)
