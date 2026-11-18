// Street Test - labels.js: text sprites and the HOME marker.
// Plain script (not a module) so the game still opens by double-clicking index.html.
// All files share one global scope and must load in the order listed in index.html.
'use strict';

// ---------- labels ----------
function textSprite(text, opts = {}) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), fs = 64;
  ctx.font = `700 ${fs}px system-ui, Segoe UI, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 40; c.width = w; c.height = fs + 32;
  ctx.font = `700 ${fs}px system-ui, Segoe UI, sans-serif`;
  ctx.fillStyle = opts.bg || 'rgba(20,28,38,0.78)';
  const r = 18; ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, c.height, r); ctx.arcTo(w, c.height, 0, c.height, r); ctx.arcTo(0, c.height, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.fill();
  ctx.fillStyle = opts.fg || '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(text, 20, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: true }));
  const scale = opts.scale || 0.05; s.scale.set(w * scale, c.height * scale, 1);
  return s;
}
// one label per named street, at its longest segment
{
  const best = new Map();
  for (const s of roadSegs) { if (!s.n) continue; const L = Math.hypot(s.x2-s.x1, s.z2-s.z1); if (!best.has(s.n) || best.get(s.n).L < L) best.set(s.n, { s, L }); }
  // (floating 3D street-name labels removed: unrealistic; the street name shows at the top of the screen)
}
// street names painted on the road (R47, to learn where you are): big white letters along the lane every ~160 m,
// kept away from junctions, alternating direction so each way of travel gets readable ones. N hides / shows them.
const roadNameMeshes = [];
{
  const ABBR = { Avenue: 'Ave', Street: 'St', Drive: 'Dr', Road: 'Rd', Boulevard: 'Blvd', Crescent: 'Cres', Place: 'Pl', Private: 'Pvt',
    Terrace: 'Terr', Circle: 'Circ', Court: 'Crt', Way: 'Way', Gate: 'Gate', Grove: 'Grove' };
  const short = n => n.replace(/\b(\w+)$/, w => ABBR[w] || w);
  const byName = new Map();
  const H = 1.6;                                    // letter band height across the lane (m)
  const otherRoadNear = (x, z, name, rad) => {
    for (const it of gridNear(x, z)) {
      if (it.kind !== 'road' || !CAR_ROADS.has(it.seg.t) || it.seg.n === name) continue;
      const s = it.seg, dx = s.x2 - s.x1, dz = s.z2 - s.z1, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (z - s.z1) * dz) / L2));
      if (Math.hypot(x - s.x1 - t * dx, z - s.z1 - t * dz) < s.w / 2 + rad) return true;
    }
    return false;
  };
  let flip = 0;
  for (const r of M.roads) {
    if (!r.n || !CAR_ROADS.has(r.t) || r.t === 'service' || r.t === 'track') continue;
    if (!byName.has(r.n)) {
      const c = document.createElement('canvas'), g = c.getContext('2d'), txt = short(r.n).toUpperCase();
      g.font = 'bold 110px Arial, sans-serif'; c.width = Math.ceil(g.measureText(txt).width + 40); c.height = 150;
      g.font = 'bold 110px Arial, sans-serif'; g.fillStyle = 'rgba(245,245,240,0.92)'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, c.width / 2, 80);
      const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      byName.set(r.n, { B: makeBuilder(), tex, len: H * c.width / c.height });
    }
    const e = byName.get(r.n), len = e.len, white = new THREE.Color(1, 1, 1);
    let acc = 0, next = 70;
    for (let i = 0; i + 1 < r.p.length; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1], L = Math.hypot(x2 - x1, z2 - z1); if (L < 0.01) continue;
      while (next < acc + L) {
        const s = next - acc; next += 160;
        if (s < len / 2 + 2 || s > L - len / 2 - 2) continue;   // must fit on this straight piece
        let ux = (x2 - x1) / L, uz = (z2 - z1) / L;
        if (flip++ % 2) { ux = -ux; uz = -uz; }
        const rx = -uz, rz = ux, lane = r.w / 4;                // right-hand lane for this reading direction
        const cx = x1 + (x2 - x1) / L * s + rx * lane, cz = z1 + (z2 - z1) / L * s + rz * lane;
        if (otherRoadNear(cx + ux * len / 2, cz + uz * len / 2, r.n, 6) || otherRoadNear(cx - ux * len / 2, cz - uz * len / 2, r.n, 6)) continue;
        const P = (a, b) => [cx + ux * a + rx * b, 0.15, cz + uz * a + rz * b];
        // text runs along the road (start -> end), letter tops toward the left of the reading direction
        quadUp(e.B, P(-len / 2, -H / 2), P(len / 2, -H / 2), P(len / 2, H / 2), P(-len / 2, H / 2), white, [0, 1], [1, 1], [1, 0], [0, 0]);
      }
      acc += L;
    }
  }
  for (const e of byName.values()) {
    if (!e.B.pos.length) continue;
    roadNameMeshes.push(finish(e.B, new THREE.MeshLambertMaterial({ map: e.tex, vertexColors: true, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -12 }), { drape: true }));
  }
}
function toggleRoadNames() { for (const m of roadNameMeshes) m.visible = !m.visible; }
// destination marker (the drive to Bergeron Private): blue light beam and label
if (M.route) {
  const [dx, dz] = M.route.dest, y = heightAt(dx, dz);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 120, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(dx, y + 60, dz); scene.add(beam);
  const lbl = textSprite('Bergeron Private', { bg: 'rgba(30,110,220,0.95)', fg: '#fff', scale: 0.06 });
  lbl.position.set(dx, y + 9, dz); scene.add(lbl);
}
// home marker (not in the public copy, R56)
if (!M.public) {
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 80, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(homeInfo.x, homeInfo.h + 40, homeInfo.z); scene.add(beam);
  const lbl = textSprite('HOME', { bg: 'rgba(255,201,77,0.95)', fg: '#2a1c00', scale: 0.06 });
  lbl.position.set(homeInfo.x, homeInfo.h + 5, homeInfo.z); scene.add(lbl);
}

(window.__loadT = window.__loadT || []).push(['labels', Math.round(performance.now())]);   // load timing (see ?debug)
