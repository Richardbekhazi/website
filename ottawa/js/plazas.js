// Street Test - plazas.js: painted parking spaces and light poles in plaza / store parking lots (R57).
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
// INFERRED: OpenStreetMap only maps the lot outline here, not each space. The layout follows the usual Ottawa plaza
// pattern (2.75 m x 5.5 m spaces in back-to-back double rows, 7 m driving aisles, tall double-head light poles), lined up
// with the lot's long side. Lots whose spaces ARE mapped (OSM parking_space) keep the mapped ones (js/parks.js).
'use strict';
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
  let spaces = 0;
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
    for (let v = o.v0 + 6.5; v + 11 <= o.v1 - 0.5; v += 18) {
      for (const [v0, v1] of [[v, v + 5.5], [v + 5.5, v + 11]]) {
        for (let u = o.u0 + 3; u <= o.u1 - 3; u += 2.75) {
          const a = P(u, v0), b = P(u, v1), m = P(u, (v0 + v1) / 2);
          if (ok(a[0], a[1]) && ok(b[0], b[1]) && ok(m[0], m[1])) { stripe(a, b, 0.1); spaces++; }
        }
      }
      for (let u = o.u0 + 12; u <= o.u1 - 8; u += 36) {   // light pole on the centre line of the double row
        const c = P(u, v + 5.5); if (ok(c[0], c[1])) poles.push([c[0], c[1], o.c, o.s]);
      }
    }
  }
  finish(lineB, flatMat(3), { drape: true });

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
  window.__plazas = { spaces, poles: poles.length };   // counts, for testing
}

(window.__loadT = window.__loadT || []).push(['plazas', Math.round(performance.now())]);   // load timing (see ?debug)
