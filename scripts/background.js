/* background.js
   Background image loader and drawer. */

import { canvas, ctx } from './canvas.js';

const bgImg = new Image();
bgImg.src = 'Sprites/BG.png';

export function drawBG() {
  if (!bgImg.complete) return;
  for (let x = 0; x < canvas.width; x += bgImg.width) {
    ctx.drawImage(bgImg, x, 0, bgImg.width, canvas.height);
  }
}
