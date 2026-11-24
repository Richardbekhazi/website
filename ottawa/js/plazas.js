// Street Test - plazas.js: painted parking spaces and light poles in plaza / store parking lots (R57).
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
// INFERRED: OpenStreetMap only maps the lot outline here, not each space. The layout follows the usual Ottawa plaza
// pattern (2.75 m x 5.5 m spaces in back-to-back double rows, 7 m driving aisles, tall double-head light poles), lined up
// with the lot's long side. Lots whose spaces ARE mapped (OSM parking_space) keep the mapped ones (js/parks.js).
'use strict';
const lotTrees = [];   // trees on the parking-lot islands; js/trees.js plants them (lots are otherwise tree-free)
{
  const lineB = makeBuilder(), W = new THREE.Color(0xe8e8e2);
  const stripe = (a, b, w) => {   // painted line from a to b ([x, z]), just above the asphalt
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, px = -dz / L * w / 2, pz = dx / L * w / 2;
    flatQuad(lineB, [a[0] + px, a[1] + pz], [b[0] + px, b[1] + pz], [b[0] - px, b[1] - pz], [a[0] - px, a[1] - pz], 0.095, W);
  };
  const onRoad = (x, z) => {
    for (const it of gridNear(x, z)) {
      if (it.kind !== 'road') continue; const s = it.seg, dx = s.x2 - s.x1, dz = s.z2 - s.z1, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (z - s.z1) * dz) / L2));
      if (Math.hypot(x - s.x1 - t * dx, z - s.z1 - t * dz) < s.w / 2 + 0.6) return true;
    }
    return false;
  };
  const centre = p => p.reduce((s, v) => [s[0] + v[0] / p.length, s[1] + v[1] / p.length], [0, 0]);
  const mapped = (M.stalls || []).map(st => centre(ring(st)));
  // the apartment complex lot paints its own spaces (js/buildings.js)
  let ax0 = Infinity, az0 = Infinity, ax1 = -Infinity, az1 = -Infinity;
  for (const a of aptBuildings) { ax0 = Math.min(ax0, a.cx); az0 = Math.min(az0, a.cz); ax1 = Math.max(ax1, a.cx); az1 = Math.max(az1, a.cz); }
  const poles = [];
  let spaces = 0, accSpaces = 0, corrals = 0, islands = 0;
  // planted island at the end of a double row (R59 round 2): concrete curb, grass top, one tree.
  // INFERRED: the usual Ottawa plaza end-cap island (about 2.4 m x 11 m).
  const islB = makeBuilder(), CONC = new THREE.Color(0xb8b5ae), GRASS = new THREE.Color(0x6f8f4a);
  function island(P, ok, uc, v) {
    const pts = [[-1.2, 0.3], [1.2, 0.3], [1.2, 10.7], [-1.2, 10.7], [0, 5.5]].map(([s, t]) => P(uc + s, v + t));
    if (!pts.every(p => ok(p[0], p[1]))) return;
    const a = P(uc - 1, v), b = P(uc + 1, v), c = P(uc - 1, v + 1), dir = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2], nv = [c[0] - a[0], 0, c[1] - a[1]];
    const e = P(uc, v + 0.3); box(islB, e[0], e[1], dir, nv, 2.4, 10.4, 0, 0.15, CONC);
    flatQuad(islB, P(uc - 1.05, v + 0.45), P(uc + 1.05, v + 0.45), P(uc + 1.05, v + 10.55), P(uc - 1.05, v + 10.55), 0.155, GRASS);
    lotTrees.push([pts[4][0], pts[4][1], 5 + (islands % 3), 1.6]); spots.island.push(pts[4]); islands++;
  }
  // shop buildings, to find the spaces nearest a store (accessible spaces) and the lots of big stores (cart corrals)
  const shops = [];
  for (const b of M.buildings) {
    const named = b.t === 'yes' && (b.n || b.pois);
    if (!['retail', 'commercial', 'supermarket'].includes(b.t) && !named) continue;
    const r = ring(b.p), A = Math.abs(signedArea(r)); if (A < 150) continue;
    shops.push({ r, big: A > 1500 });
  }
  const nearestShop = (x, z) => {
    let best = { d: Infinity, big: false };
    for (const sh of shops) {
      const r = sh.r;
      if (Math.abs(r[0][0] - x) > 300 || Math.abs(r[0][1] - z) > 300) continue;
      for (let i = 0; i < r.length; i++) {
        const p = r[i], q = r[(i + 1) % r.length], dx = q[0] - p[0], dz = q[1] - p[1], L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / L2)), d = Math.hypot(x - p[0] - t * dx, z - p[1] - t * dz);
        if (d < best.d) best = { d, big: sh.big };
      }
    }
    return best;
  };
  // accessible space: blue fill and a white wheelchair symbol drawn in the space's own frame (s across, t along)
  const spots = { acc: [], corral: [], island: [] };   // positions, for testing (?debug)
  const blueB = makeBuilder(), BLUE = new THREE.Color(0x2a5db0);
  const accessible = (P, [uc, v0, v1, up]) => {   // up: +1 when the driving aisle is on the low-v side (symbol reads from the aisle)
    const vc = (v0 + v1) / 2, Q = (s, t) => P(uc + s * up, vc + t * up);
    spots.acc.push(Q(0, 0));
    flatQuad(blueB, Q(-1.27, -2.65), Q(1.27, -2.65), Q(1.27, 2.65), Q(-1.27, 2.65), 0.09, BLUE);
    const seg = (s0, t0, s1, t1, w) => stripe(Q(s0, t0), Q(s1, t1), w);
    const cs = 0.1, ct = -0.35, R = 0.48;   // the wheel
    for (let k = 0; k < 14; k++) {
      const a0 = k / 14 * Math.PI * 2, a1 = (k + 1) / 14 * Math.PI * 2;
      seg(cs + Math.cos(a0) * R, ct + Math.sin(a0) * R, cs + Math.cos(a1) * R, ct + Math.sin(a1) * R, 0.09);
    }
    seg(-0.1, 0.55, -0.1, -0.05, 0.13);   // back
    seg(-0.1, -0.05, 0.38, -0.05, 0.12);  // seat
    seg(0.38, -0.05, 0.55, -0.6, 0.12);   // leg
    seg(-0.1, 0.35, 0.3, 0.35, 0.1);      // arm
    seg(-0.1, 0.78, -0.1, 0.98, 0.2);     // head
  };
  // cart corral: two open rails with posts, closed at the back end, standing in one space
  const corB = makeBuilder(), STEEL = new THREE.Color(0x9aa3ab);
  const corral = (P, [uc, v0, v1, up]) => {   // open toward the driving aisle, closed at the far end
    const a = P(uc - 1, v0), b = P(uc + 1, v0), c = P(uc - 1, v0 + 1), dir = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2], nv = [c[0] - a[0], 0, c[1] - a[1]];
    const L = (v1 - v0) - 1.0, vs = v0 + 0.5; spots.corral.push(P(uc, (v0 + v1) / 2));
    for (const s of [-0.65, 0.65]) {
      const p0 = P(uc + s, vs);
      for (const [y0, y1] of [[0.5, 0.56], [0.98, 1.04]]) box(corB, p0[0], p0[1], dir, nv, 0.05, L, y0, y1, STEEL);
      for (const t of [0, L / 2, L - 0.05]) { const pp = P(uc + s, vs + t); box(corB, pp[0], pp[1], dir, nv, 0.06, 0.06, 0, 1.04, STEEL); }
    }
    const endV = up > 0 ? vs + L - 0.05 : vs, e = P(uc, endV);
    for (const [y0, y1] of [[0.5, 0.56], [0.98, 1.04]]) box(corB, e[0], e[1], dir, nv, 1.36, 0.05, y0, y1, STEEL);
    // solid: the car bumps into the rails (R59 round 2)
    const wall = (a, b) => gridAdd({ kind: 'wall', x1: a[0], z1: a[1], x2: b[0], z2: b[1] }, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]));
    wall(P(uc - 0.65, vs), P(uc - 0.65, vs + L)); wall(P(uc + 0.65, vs), P(uc + 0.65, vs + L)); wall(P(uc - 0.65, endV), P(uc + 0.65, endV));
    const sg = P(uc, up > 0 ? endV - 0.03 : endV + 0.05);
    box(corB, sg[0], sg[1], dir, nv, 0.9, 0.03, 1.1, 1.45, new THREE.Color(0x1f4e8c));   // "carts" sign panel
  };
  for (const lot of M.areas) {
    if (lot.t !== 'parking') continue;
    const poly = ring(lot.p); if (poly.length < 3 || Math.abs(signedArea(poly)) < 350) continue;
    // lots whose spaces are mostly mapped keep only the mapped ones; a few mapped spaces (often just the accessible ones)
    // don't stop the rest of a big lot from being painted around them
    const inLot = mapped.filter(([x, z]) => pointInPoly(x, z, poly));
    if (inLot.length * 15 > Math.abs(signedArea(poly)) * 0.3) continue;
    const [lx, lz] = centre(poly);
    if (aptBuildings.length >= 3 && lx > ax0 - 5 && lx < ax1 + 5 && lz > az0 - 5 && lz < az1 + 5) continue;
    const ok = (x, z) => pointInPoly(x, z, poly) && !inBuilding(x, z, 1.0) && !onRoad(x, z) && !inLot.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 4);
    const o = orientedBox(poly), P = (u, v) => { const q = boxPt(o, u, v, 0); return [q[0], q[2]]; };
    // a driving aisle along the lot edge, then double rows of spaces with an aisle after each
    const lotSpaces = [];   // spaces whose two side lines are both painted: [u of the space centre, v0, v1]
    for (let v = o.v0 + 6.5; v + 11 <= o.v1 - 0.5; v += 18) {
      let uMin = Infinity, uMax = -Infinity, nRow = 0;
      for (const [v0, v1] of [[v, v + 5.5], [v + 5.5, v + 11]]) {
        let prev = null;
        for (let u = o.u0 + 3; u <= o.u1 - 3; u += 2.75) {
          const a = P(u, v0), b = P(u, v1), m = P(u, (v0 + v1) / 2);
          if (ok(a[0], a[1]) && ok(b[0], b[1]) && ok(m[0], m[1])) {
            stripe(a, b, 0.1); spaces++; nRow++; uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
            if (prev !== null && Math.abs(prev - (u - 2.75)) < 0.01) lotSpaces.push([u - 1.375, v0, v1, v0 === v ? 1 : -1]);
            prev = u;
          }
        }
      }
      if (nRow >= 16) for (const uc of [uMin - 1.4, uMax + 1.4]) island(P, ok, uc, v);
      for (let u = o.u0 + 12; u <= o.u1 - 8; u += 36) {   // light pole on the centre line of the double row
        const c = P(u, v + 5.5); if (ok(c[0], c[1])) poles.push([c[0], c[1], o.c, o.s]);
      }
    }
    // R59: the spaces nearest the store door side get the blue accessible paint, and big-box lots get cart corrals.
    // INFERRED: Ottawa / Ontario plazas usually have ~1 accessible space per 25 spaces (at least 2) closest to the
    // entrance, and a corral every few rows; OSM doesn't map either here.
    if (!lotSpaces.length) continue;
    const near = lotSpaces.map(sp => { const c = P(sp[0], (sp[1] + sp[2]) / 2); return [sp, nearestShop(c[0], c[1])]; })
      .filter(x => x[1].d < 45).sort((a, b) => a[1].d - b[1].d);
    const nAcc = Math.min(near.length, Math.max(2, Math.round(lotSpaces.length / 25)));
    const used = new Set();
    for (let i = 0; i < nAcc; i++) { accessible(P, near[i][0]); used.add(near[i][0]); accSpaces++; }
    if (near.length && near[0][1].big) {
      lotSpaces.forEach((sp, i) => {
        if (i % 16 !== 8 || used.has(sp)) return;
        const c = P(sp[0], (sp[1] + sp[2]) / 2); if (nearestShop(c[0], c[1]).d > 110) return;
        corral(P, sp); corrals++;
      });
    }
  }
  finish(blueB, flatMat(2), { drape: true });
  finish(lineB, flatMat(3), { drape: true });
  finish(islB, new THREE.MeshLambertMaterial({ vertexColors: true }), { drape: true });
  finish(corB, new THREE.MeshLambertMaterial({ vertexColors: true }), { drape: true, cast: true });

  // tall lot light poles with two LED heads (the common plaza style), knocked over when hit like street lights
  const poleG = new THREE.CylinderGeometry(0.09, 0.14, 9.5, 8); poleG.translate(0, 4.75, 0);
  const armG = new THREE.BoxGeometry(2.4, 0.08, 0.08); armG.translate(0, 9.4, 0);
  const headG = new THREE.BoxGeometry(0.7, 0.14, 0.4); const headL = headG.clone().translate(-1.25, 9.3, 0), headR = headG.clone().translate(1.25, 9.3, 0);
  const metal = new THREE.MeshLambertMaterial({ color: 0x8b8f93 }), lamp = new THREE.MeshLambertMaterial({ color: 0x4a4d50, emissive: 0x222222 });
  const ims = [new THREE.InstancedMesh(poleG, metal, poles.length), new THREE.InstancedMesh(armG, metal, poles.length),
    new THREE.InstancedMesh(headL, lamp, poles.length), new THREE.InstancedMesh(headR, lamp, poles.length)];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3();
  poles.forEach(([x, z, ux, uz], i) => {
    q.setFromAxisAngle(UP, Math.atan2(-uz, ux)); ps.set(x, heightAt(x, z), z); m.compose(ps, q, one);
    for (const im of ims) im.setMatrixAt(i, m);
    gridAdd({ kind: 'tree', x, z, r: 0.2, fall: { parts: ims.map(im => [im, i, m.clone()]), base: ps.clone() } }, x - 1, z - 1, x + 1, z + 1);
  });
  for (const im of ims) { im.castShadow = true; scene.add(im); }
  // canopies (OSM building=roof, R59 round 8): a flat roof on posts that you can drive under. Gas stations (a name, or a
  // fuel business within 40 m) get a 5.2 m canopy with a white fascia band and pump islands under it; others 3 m.
  // INFERRED: post grid, fascia, pump island size and spacing (the usual Ontario station layout).
  const canMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), WHITE = new THREE.Color(0xf2f2ee), UNDER = new THREE.Color(0xd8d8d4), POST = new THREE.Color(0xd0d2d4);
  const PUMP = new THREE.Color(0x5b6168), ISL = new THREE.Color(0xc4c1ba);
  const fuelAt = [];
  for (const b of M.buildings) for (const [x, z, n] of (b.pois || [])) if (/gas|esso|shell|petro|mobil|ultramar|circle k|stinson|pioneer|husky|fuel/i.test(n)) fuelAt.push([x, z, n]);
  for (const [x, z, n] of (M.furniture.pylons || [])) if (/gas|esso|shell|petro|mobil|ultramar|circle k|stinson|fuel/i.test(n)) fuelAt.push([x, z, n]);
  let nCan = 0; const canAt = [];
  for (const b of canopies) {
    const poly = ring(b.p); if (poly.length < 3) continue;
    const canB = makeBuilder();   // one mesh per canopy, lifted to the ground height at its centre (flat roof, not draped)
    const o = orientedBox(poly), [cx, cz] = centre(poly), L = o.u1 - o.u0, Wd = o.v1 - o.v0;
    const gas = !!b.n || fuelAt.some(([x, z]) => Math.hypot(x - cx, z - cz) < 40);
    const H = gas ? 5.2 : 3, th = gas ? 0.9 : 0.3;
    const Q = (u, v) => { const q = boxPt(o, u, v, 0); return [q[0], q[2]]; };
    const ug = (u0, u1, v0, v1, y0, y1, col) => {   // a box in the canopy's own frame
      const a = Q(u0, v0), bq = Q(u1, v0), c = Q(u0, v0 + 1), dir = [(bq[0] - a[0]) / (u1 - u0), (bq[1] - a[1]) / (u1 - u0)], nv = [c[0] - a[0], 0, c[1] - a[1]];
      const m = Q((u0 + u1) / 2, v0); box(canB, m[0], m[1], dir, nv, u1 - u0, v1 - v0, y0, y1, col);
    };
    ug(o.u0, o.u1, o.v0, o.v1, H, H + th, gas ? WHITE : POST);
    flatQuad(canB, Q(o.u0, o.v1), Q(o.u1, o.v1), Q(o.u1, o.v0), Q(o.u0, o.v0), H - 0.01, UNDER);   // underside, seen from below
    // posts: rows along the long side, ~8 m apart, inset 1.5 m
    const nu = Math.max(2, Math.round(L / 8) + 1), nv2 = Wd > 9 ? 2 : 1;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv2; j++) {
      const u = o.u0 + 1.5 + (L - 3) * i / (nu - 1), v = nv2 === 1 ? (o.v0 + o.v1) / 2 : o.v0 + 2 + (Wd - 4) * j;
      ug(u - 0.25, u + 0.25, v - 0.25, v + 0.25, 0, H, POST);
      const pp = Q(u, v); gridAdd({ kind: 'tree', x: pp[0], z: pp[1], r: 0.35 }, pp[0] - 1, pp[1] - 1, pp[0] + 1, pp[1] + 1);
      if (gas) {   // a pump island around each post: curb 0.2 m and two pump cabinets
        ug(u - 0.6, u + 0.6, v - 2.6, v + 2.6, 0, 0.2, ISL);
        ug(u - 0.35, u + 0.35, v - 2.2, v - 1.4, 0.2, 1.9, PUMP); ug(u - 0.35, u + 0.35, v + 1.4, v + 2.2, 0.2, 1.9, PUMP);
      }
    }
    const mesh = finish(canB, canMat, { cast: true }); if (mesh) mesh.position.y = heightAt(cx, cz);
    // the station's name on both long sides of the fascia (R59 round 9): OSM name of the canopy, else the nearest fuel
    // business within 40 m. Names only, no logos or brand colours (trademarks).
    let name = b.n || null;
    if (!name && gas) { let best = 40; for (const [x, z, n] of fuelAt) { const d = Math.hypot(x - cx, z - cz); if (d < best) { best = d; name = n; } } }
    if (gas && name) for (const [v, sg] of [[o.v1, 1], [o.v0, -1]]) {
      const p = Q(o.u0, v), q = Q(o.u1, v);
      shopSign({ p, q, n: [-o.s * sg, 0, o.c * sg], L }, name, heightAt(cx, cz) + H + th / 2, '#1d2a36', '#ffffff', 0.65);
    }
    nCan++; canAt.push([cx, cz, gas, name]);
  }

  // R61 loop 2 round 7: drive-throughs. For each fast-food place with a drive-through (OSM drive_through=yes, or a known
  // drive-through chain with no tag), on the building wall nearest a service lane: a pickup window with a small canopy,
  // a menu board and an order-speaker post ~14 m before the window, and a height bar ~26 m before it. Canadian lanes run
  // counter-clockwise (the building is on the driver's left), which sets which way is "before".
  // INFERRED: exact positions; the lane itself is the mapped service road.
  const dtB = makeBuilder(), DARK = new THREE.Color(0x2b2e33), GLASSC = new THREE.Color(0x9fc3d6), BAR = new THREE.Color(0xe0b324), MENU = new THREE.Color(0x1d2a36);
  const dtSpots = [], seenDT = [];
  for (const [x, z, name] of (M.furniture.drivethru || [])) {
    if (seenDT.some(([a, b]) => Math.hypot(a - x, b - z) < 15)) continue; seenDT.push([x, z]);
    const host = M.buildings.find(b => pointInPoly(x, z, ring(b.p))); if (!host) continue;
    let poly = ring(host.p); if (signedArea(poly) < 0) poly = poly.slice().reverse();
    // the wall with a service lane closest outside it
    let best = null;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 4) continue;
      const n = outwardNormal(a, b, poly), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      for (const it of gridNear(mx + n[0] * 5, mz + n[2] * 5)) {
        if (it.kind !== 'road' || it.seg.t !== 'service') continue; const sg = it.seg, dx = sg.x2 - sg.x1, dz = sg.z2 - sg.z1, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((mx - sg.x1) * dx + (mz - sg.z1) * dz) / L2)), px = sg.x1 + t * dx, pz = sg.z1 + t * dz, d = Math.hypot(px - mx, pz - mz);
        const along = Math.abs((dx * (b[0] - a[0]) + dz * (b[1] - a[1])) / Math.sqrt(L2) / L);   // lane runs along the wall
        if (d < 10 && along > 0.7 && (!best || d < best.d)) best = { d, a, b, n, L, px, pz, ux: dx / Math.sqrt(L2), uz: dz / Math.sqrt(L2), w: sg.w };
      }
    }
    if (!best) continue;
    const { a, b, n, L } = best;
    // driving direction: the building must be on the driver's left (left of (ux, uz) is (uz, -ux))
    let ux = best.ux, uz = best.uz; if ((uz * -n[0] + -ux * -n[2]) < 0) { ux = -ux; uz = -uz; }
    // window: on the wall, at the point level with the lane's nearest point
    const t = Math.max(1.2, Math.min(L - 1.2, ((best.px - a[0]) * (b[0] - a[0]) + (best.pz - a[1]) * (b[1] - a[1])) / L));
    const wx = a[0] + (b[0] - a[0]) * t / L, wz = a[1] + (b[1] - a[1]) * t / L, y0 = 0;   // draped: heights are above the ground
    const dirW = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const at = (u, out) => [wx + dirW[0] * u + n[0] * out, wz + dirW[1] * u + n[2] * out];
    const bxW = (u0, u1, out0, out1, y1, y2, col) => {   // a box in the wall's frame (u along the wall, out away from it)
      const c = at((u0 + u1) / 2, out0); box(dtB, c[0], c[1], dirW, n, u1 - u0, out1 - out0, y0 + y1, y0 + y2, col);
    };
    bxW(-0.8, 0.8, 0.02, 0.06, 0.9, 2.1, GLASSC);         // pickup window glass
    bxW(-0.95, 0.95, 0.02, 0.08, 0.8, 0.9, DARK);          // sill
    bxW(-1.3, 1.3, 0.02, 1.0, 2.6, 2.75, DARK);            // little canopy over the window
    // lane points before the window (opposite to the driving direction), on the driver's left = building side
    const lx = best.px, lz = best.pz, left = [uz, -ux], off = best.w / 2 + 0.9;
    const P = (back, side) => [lx - ux * back + left[0] * side, lz - uz * back + left[1] * side];
    const mp = P(14, off), sp = P(17, off), hb = P(26, 0);
    // along = true: the box's width runs along the lane (menu board side-on to the car); false: across the lane
    const placeBox = (x, z, w, d, yA, yB, col, along) => along ? box(dtB, x, z, [ux, uz], [left[0], 0, left[1]], w, d, yA, yB, col)
      : box(dtB, x, z, [left[0], left[1]], [ux, 0, uz], w, d, yA, yB, col);
    placeBox(mp[0], mp[1], 2.2, 0.25, 0.6, 2.4, MENU, true);           // menu board
    placeBox(mp[0], mp[1], 0.3, 0.3, 0, 0.6, DARK, true);              // its base
    placeBox(sp[0], sp[1], 0.35, 0.3, 0, 1.4, DARK, true);             // order speaker post
    for (const sd of [-1, 1]) { const q = P(26, sd * (best.w / 2 + 0.4)); placeBox(q[0], q[1], 0.15, 0.15, 0, 3.0, DARK, true);
      gridAdd({ kind: 'tree', x: q[0], z: q[1], r: 0.15 }, q[0] - 1, q[1] - 1, q[0] + 1, q[1] + 1); }
    const hc = P(26, 0); placeBox(hc[0], hc[1], best.w + 0.8, 0.15, 2.75, 2.95, BAR, false);   // height bar across the lane
    gridAdd({ kind: 'tree', x: mp[0], z: mp[1], r: 0.5 }, mp[0] - 1, mp[1] - 1, mp[0] + 1, mp[1] + 1);
    dtSpots.push([wx, wz, name, n[0], n[2]]);
  }
  window.__dtTris = dtB.pos.length / 9; finish(dtB, new THREE.MeshLambertMaterial({ vertexColors: true }), { drape: true, cast: true });

  window.__plazas = { spaces, poles: poles.length, accessible: accSpaces, corrals, islands, spots, canopies: canAt, driveThrus: dtSpots };   // counts, for testing
}

(window.__loadT = window.__loadT || []).push(['plazas', Math.round(performance.now())]);   // load timing (see ?debug)
