/* canvas.js
   Canvas creation, resize logic, and world transform helper. */

import { BASE_W, BASE_H } from './constants.js';

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function applyWorldTransform() {
  const scale = Math.min(canvas.width  / BASE_W,
                         canvas.height / BASE_H);
  const offX  = (canvas.width  - BASE_W * scale) * 0.5;
  const offY  = (canvas.height - BASE_H * scale) * 0.5;
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
}

export { canvas, ctx, applyWorldTransform };
