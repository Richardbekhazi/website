// Street Test - ground.js: ground meshes (coarse + fine lidar) and land areas (lawns, parks, parking, pools).
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

// ---------- ground ----------
function worldUV(geo) { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6, p.getZ(i) / 6); uv.needsUpdate = true; }
{
  const size = T ? T.half * 2 : 3000, segs = T ? T.n - 1 : 1;
  const g = new THREE.PlaneGeometry(size, size, segs, segs); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  // where the fine (lidar) ground mesh covers, tuck the coarse one 40 cm under it
  const inFine = (x, z) => LD && Math.max(Math.abs(x), Math.abs(z)) < LD.half - 12;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, heightAt(x, z) - (inFine(x, z) ? 0.4 : 0)); }
  g.computeVertexNormals(); worldUV(g);
  const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x627f3d, map: texGrass }));
  ground.receiveShadow = true; scene.add(ground);
  if (LD) {   // fine ground over the lidar area: 4 m mesh, sitting just under the lawns / roads that drape on it
    const half = LD.half - 8, seg = Math.round(half * 2 / 4);
    const fg = new THREE.PlaneGeometry(half * 2, half * 2, seg, seg); fg.rotateX(-Math.PI / 2);
    const fp = fg.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setY(i, heightAt(fp.getX(i), fp.getZ(i)) - 0.03);
    fg.computeVertexNormals(); worldUV(fg);
    const fine = new THREE.Mesh(fg, ground.material); fine.receiveShadow = true; scene.add(fine);
  }
  // far-away flat land beyond the elevation data, hidden by fog
  const far = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x627f3d }));
  far.position.y = (T ? T.h.reduce((m, v) => Math.min(m, v), 0) * HILLS : 0) - 2; scene.add(far);
}

// ---------- areas (lawns, parks, parking, pools) ----------
const AREA_COL = { grass: 0x5f7f3c, park: 0x5a7a38, play: 0xb39a72, pitch: 0x55773a, wood: 0x46632f, scrub: 0x5d7140,
  parking: 0x5c5e61, pool: 0x3fb4e0, water: 0x3d8fc4, paved: 0x9a9a96, dirt: 0xa68a62, ice: 0x5c7c3a };   // outdoor rinks are lawn in summer (the game shows summer)
// layers kept several cm apart so overlapping areas never flicker on the (slightly bumpy) lidar ground
const AREA_Y = { paved: 0.02, grass: 0.045, park: 0.04, wood: 0.04, scrub: 0.04, dirt: 0.04, pitch: 0.06, play: 0.065, parking: 0.075, pool: 0.09, water: 0.09, ice: 0.09 };
const areaB = makeBuilder();
const blockedAreas = [];
const woodAreas = [];
for (const a of M.areas) {
  const poly = ring(a.p); if (poly.length < 3) continue;
  addFlatPoly(areaB, poly, AREA_Y[a.t] || 0.02, new THREE.Color(AREA_COL[a.t] || 0x888888));
  if (['parking', 'pool', 'water', 'paved', 'pitch', 'ice'].includes(a.t)) blockedAreas.push(poly);
  if (a.t === 'wood' || a.t === 'scrub' || a.t === 'park') woodAreas.push(poly);
}
finish(areaB, new THREE.MeshLambertMaterial({ vertexColors: true, map: texGrass, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }), { drape: true });

(window.__loadT = window.__loadT || []).push(['ground', Math.round(performance.now())]);   // load timing (see ?debug)
