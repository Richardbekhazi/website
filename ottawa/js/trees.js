// Street Test - trees.js: trees (lidar + young trees) and placement checks.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

// ---------- trees ----------
function nearRoad(x, z, margin) {
  for (const it of gridNear(x, z)) {
    if (it.kind !== 'road') continue; const s = it.seg;
    const dx = s.x2-s.x1, dz = s.z2-s.z1, L2 = dx*dx + dz*dz || 1;
    const t = Math.max(0, Math.min(1, ((x-s.x1)*dx + (z-s.z1)*dz) / L2));
    if (Math.hypot(x - (s.x1 + t*dx), z - (s.z1 + t*dz)) < s.w/2 + margin) return true;
  }
  return false;
}
// trees: [x, z, height m, crown radius m]
const treeSpots = [];
function treeOK(x, z, pad = 2.2) {
  if (inBuilding(x, z, pad) || nearRoad(x, z, 1.2)) return false;
  for (const p of blockedAreas) if (pointInPoly(x, z, p)) return false;
  return true;
}
if (LD) {
  // real trees measured by the 2020 lidar scan (anything over 28 m is a hydro tower, not a tree)
  for (const [x, z, h, r] of LD.trees) if (h <= 28 && treeOK(x, z, 1.0)) treeSpots.push([x, z, h, r]);
  // homes built after the scan: the builder plants one young tree in most front yards
  for (const { front, bi } of newHouses) {
    if (!front || hashStr('tree' + bi) % 10 < 3) continue;
    const { p, q, n, r } = front, mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
    const yard = (r.x - mx) * n[0] + (r.z - mz) * n[2] - r.w / 2;
    if (yard < 3) continue;
    const x = mx + n[0] * yard * 0.6, z = mz + n[2] * yard * 0.6;
    if (treeOK(x, z, 1.2)) treeSpots.push([x, z, 3 + (hashStr(bi) % 20) / 10, 1.1]);
  }
  for (const t of youngTrees) if (treeOK(t[0], t[1], 1.0)) treeSpots.push(t);
} else {
  for (let i = 0; i < 2600; i++) { const x = minX + rand() * (maxX - minX), z = minZ + rand() * (maxZ - minZ); if (treeOK(x, z)) treeSpots.push([x, z, 5 + rand() * 4, 2 + rand()]); }
}
{
  const trunkG = new THREE.CylinderGeometry(0.22, 0.3, 2.4, 6); trunkG.translate(0, 1.2, 0);
  const leafG = new THREE.IcosahedronGeometry(2.2, 0); leafG.translate(0, 4.2, 0);
  const pineG = new THREE.ConeGeometry(1.9, 6, 7); pineG.translate(0, 5, 0);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x6b4a2f }), treeSpots.length);
  const leaves = new THREE.InstancedMesh(leafG, new THREE.MeshLambertMaterial({ color: 0xffffff }), treeSpots.length);
  const pines = new THREE.InstancedMesh(pineG, new THREE.MeshLambertMaterial({ color: 0x2f5b33 }), treeSpots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  let nl = 0, np = 0; const leafCols = [0x4f8a3a, 0x5d9a41, 0x3f7a34, 0x6ea548];
  treeSpots.forEach(([x, z, h, r], i) => {
    // the model is 6.4 m tall with a 2.2 m crown; stretch it to the measured height and crown
    const sy = h / 6.4, sxz = Math.max(0.35, r / 2.2);
    q.setFromAxisAngle(UP, rand() * 6.28); ps.set(x, heightAt(x, z) - 0.1, z);
    sc.set(Math.min(sxz, sy * 1.2), sy, Math.min(sxz, sy * 1.2)); m.compose(ps, q, sc);
    const trunkM = new THREE.Matrix4().compose(ps, q, new THREE.Vector3(Math.max(0.6, sxz * 0.8), sy, Math.max(0.6, sxz * 0.8)));
    trunks.setMatrixAt(i, trunkM);
    const parts = [[trunks, i, trunkM.clone()]];
    // tall narrow crowns read as conifers (spruce / cedar are common in Ottawa)
    if (r < h * 0.14 && h > 7) { parts.push([pines, np, m.clone()]); pines.setMatrixAt(np++, m); }
    else { parts.push([leaves, nl, m.clone()]); leaves.setMatrixAt(nl, m); leaves.setColorAt(nl++, new THREE.Color(leafCols[Math.floor(rand() * 4)])); }
    gridAdd({ kind: 'tree', x, z, r: 0.25 + 0.06 * h, fall: { parts, base: ps.clone() } }, x - 1, z - 1, x + 1, z + 1);
  });
  leaves.count = nl; pines.count = np;
  for (const im of [trunks, leaves, pines]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }
}

(window.__loadT = window.__loadT || []).push(['trees', Math.round(performance.now())]);   // load timing (see ?debug)
