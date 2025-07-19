/* scripts/gameLoop.js
   Main loop with clean restart and true “freeze” on death. */

import { canvas, ctx, applyWorldTransform } from './canvas.js';
import { loadAll } from './assets.js';
import { drawBG } from './background.js';
import {
  dino,
  update as updateDino,
  draw as drawDino,
  markDead
} from './dino.js';
import {
  maybeSpawn,
  updateAndDraw,
  hit,
  killAll,
  resetEnemies
} from './enemy.js';
import {
  drawScore,
  pushHS,
  showPanel,
  hidePanel
} from './ui.js';
import { FLOOR_Y, SPRITE_H } from './constants.js';

let frame, score, gameOver, deathCounter;
let loopID = null;

function newGame() {
  // Stop any existing loop
  if (loopID !== null) cancelAnimationFrame(loopID);

  // Reset game state
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
  loopID = requestAnimationFrame(loop);
}

function loop() {
  frame++;

  // Clear and draw background
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyWorldTransform();
  drawBG();

  // Always animate the dino (so its death frames play out)
  updateDino(frame);

  if (!gameOver) {
    // Collision check happens before any new spawn
    if (hit(dino)) {
      gameOver = true;
      killAll();
      markDead();
    } else {
      // Only spawn while alive
      maybeSpawn(frame, false);
    }
    // Update score while alive
    score = Math.floor(frame / 10);
  } else {
    // No spawns after death
    maybeSpawn(frame, true);

    // After a short pause, record and show highscores
    if (deathCounter++ === 120) {
      pushHS(score);
      showPanel();
    }
  }

  // Draw everything
  drawDino();
  updateAndDraw(frame, gameOver);
  drawScore(score);

  ctx.restore();

  // Schedule next frame
  loopID = requestAnimationFrame(loop);
}

// Wait for assets before showing the start button
export function prepare() {
  loadAll(() => {
    document.getElementById('startScreen').style.display = 'block';
  });
}

// Button handlers
document.getElementById('startButton').onclick = () => {
  document.getElementById('startScreen').style.display = 'none';
  newGame();
};
document.getElementById('playAgain').onclick = () => newGame();
