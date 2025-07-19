/* canvas.js
   Integer‑scale canvas so sprites stay sharp. */

import { BASE_W, BASE_H } from './constants.js';

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const stage  = document.getElementById('stage');

/* device‑pixel buffer always BASE_W × BASE_H */
canvas.width  = BASE_W;
canvas.height = BASE_H;

function resizeCanvas() {
  /* find the largest integer scale that fits inside the viewport */
  const maxW = window.innerWidth  - 40;   // small margin
  const maxH = window.innerHeight - 40;
  const scale = Math.max(1, Math.floor(Math.min(maxW / BASE_W,
                                                maxH / BASE_H)));
  const cssW  = BASE_W * scale;
  const cssH  = BASE_H * scale;

  canvas.style.width  = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  /* stage gets the same size so its border hugs the canvas */
  stage.style.width  = canvas.style.width;
  stage.style.height = canvas.style.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function applyWorldTransform() {
  /* map world space 1:1 to back‑buffer; we already scale via CSS   */
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export { canvas, ctx, applyWorldTransform };
