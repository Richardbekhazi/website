/* scripts/background.js
   Draw a seamless mirrored mosaic of the full BG image. */

import { canvas, ctx } from './canvas.js';

const bgImg = new Image();
bgImg.src = 'Sprites/BG.png';

export function drawBG() {
  if (!bgImg.complete) return;

  // Compute scale to fit the full image inside the canvas
  const scale = Math.min(
    canvas.width  / bgImg.width,
    canvas.height / bgImg.height
  );
  const tileW = bgImg.width  * scale;
  const tileH = bgImg.height * scale;

  // Offset to center the tiling grid
  const offsetX = -((canvas.width  % tileW) / 2);
  const offsetY = -((canvas.height % tileH) / 2);

  // Number of rows and columns needed
  const cols = Math.ceil((canvas.width  - offsetX) / tileW) + 1;
  const rows = Math.ceil((canvas.height - offsetY) / tileH) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * tileW;
      const y = offsetY + row * tileH;

      const flipX = col % 2 === 1;  // mirror every odd column

      if (flipX) {
        ctx.save();
        ctx.translate(x + tileW, y);
        ctx.scale(-1, 1);
        ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, 0, 0, tileW, tileH);
        ctx.restore();
      } else {
        ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, x, y, tileW, tileH);
      }
    }
  }
}
