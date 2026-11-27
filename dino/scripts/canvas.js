/* canvas.js
   Integer scale canvas with a locked scale for stability. */

import { BASE_W, BASE_H } from './constants.js';

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const stage  = document.getElementById('stage');

/* device pixel buffer always BASE_W by BASE_H */
canvas.width  = BASE_W;
canvas.height = BASE_H;

let lockedScale = 1;

/* compute largest integer scale that fits.
   use documentElement client sizes to avoid scrollbar jitter. */
function computeScale() {
  const maxW = document.documentElement.clientWidth  - 40;
  const maxH = document.documentElement.clientHeight - 40;
  const s = Math.min(Math.floor(maxW / BASE_W), Math.floor(maxH / BASE_H));
  return Math.max(1, s);
}

function applyScale(scale) {
  const cssW = BASE_W * scale;
  const cssH = BASE_H * scale;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  stage.style.width   = cssW + 'px';
  stage.style.height  = cssH + 'px';
  /* world space is one to one with the back buffer */
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* lock once on load */
function lockScaleNow() {
  lockedScale = computeScale();
  applyScale(lockedScale);
}

/* optional gentle resize.
   only recompute if the window truly changed a lot.
   this avoids flicker from tiny viewport jitter. */
let resizeTimer = null;
function onResizeDebounced() {
  if (resizeTimer) return;
  resizeTimer = requestAnimationFrame(() => {
    resizeTimer = null;
    const newScale = computeScale();
    if (Math.abs(newScale - lockedScale) >= 1) {
      lockedScale = newScale;
      applyScale(lockedScale);
    }
  });
}

/* lock on load. update only on real window changes. */
window.addEventListener('load', lockScaleNow);
window.addEventListener('orientationchange', () => { lockScaleNow(); });
window.addEventListener('resize', onResizeDebounced);

/* export */
function applyWorldTransform() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export { canvas, ctx, applyWorldTransform };
