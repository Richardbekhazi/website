/* gameLoop.js
   Stage loop with start, death, and restart handling. */

import { canvas, ctx, applyWorldTransform } from './canvas.js';
import { loadAll } from './assets.js';
import { drawBG } from './background.js';
import { dino, update as updateDino, draw as drawDino, markDead } from './dino.js';
import {
  maybeSpawn, updateAndDraw, hit, killAll, resetEnemies
} from './enemy.js';
import { drawScore, pushHS, showPanel, hidePanel } from './ui.js';
import { FLOOR_Y, SPRITE_H } from './constants.js';

let frame, score, gameOver, deathCounter;

function newGame() {
  frame = 0;
  score = 0;
  gameOver = false;
  deathCounter = 0;

  resetEnemies();
  dino.dead = false;
  dino.y = FLOOR_Y - SPRITE_H;
  dino.vy = 0;
  dino.grounded = true;
  dino.duck = false;

  hidePanel();
  requestAnimationFrame(loop);
}

function loop() {
  frame++;

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyWorldTransform();
  drawBG();

  if (!gameOver) {
    updateDino(frame);
    maybeSpawn(frame, false);
    if (hit(dino)) {
      gameOver = true;
      killAll();
      markDead();
    }
    score = Math.floor(frame / 10);
  } else {
    updateDino(frame);
    maybeSpawn(frame, true);
    if (deathCounter++ === 120) {
      pushHS(score);
      showPanel();
    }
  }

  drawDino();
  updateAndDraw(frame, gameOver);
  drawScore(score);

  ctx.restore();
  requestAnimationFrame(loop);
}

export function prepare() {
  loadAll(() => {
    document.getElementById('startScreen').style.display = 'block';
  });
}

document.getElementById('startButton').onclick = () => {
  document.getElementById('startScreen').style.display = 'none';
  newGame();
};
document.getElementById('playAgain').onclick = () => newGame();
