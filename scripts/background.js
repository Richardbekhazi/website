/* background.js
   Draw a crisp mosaic background without stretching. */

import { canvas, ctx } from './canvas.js';

const bgImg = new Image();
bgImg.src = 'Sprites/BG.png';

/* integer factor < 1 means “draw at natural size”.
   2 means “scale each tile down to one‑half of its original width/height”, etc. */
const DESIRED_TILE = 1;   // change to 2,3… if your BG image is very large

export function drawBG() {
  if (!bgImg.complete) return;

  const tileW = Math.floor(bgImg.width  / DESIRED_TILE);
  const tileH = Math.floor(bgImg.height / DESIRED_TILE);

  for (let y = 0; y < canvas.height; y += tileH) {
    for (let x = 0; x < canvas.width;  x += tileW) {
      ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height,
                    x, y, tileW, tileH);
    }
  }
}
