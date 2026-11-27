/* gameLoop.js
   Main loop with clean restart and a pause on death. */

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
  if (loopID !== null) cancelAnimationFrame(loopID);

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

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  applyWorldTransform();
  drawBG();

  // Always update the dino so its death frames play
  updateDino(frame);

  if (!gameOver) {
    if (hit(dino)) {
      gameOver = true;
      killAll();
      markDead();
    } else {
      maybeSpawn(frame, false);
    }
    score = Math.floor(frame / 10);
  } else {
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
  loopID = requestAnimationFrame(loop);
}

// Show start only after assets load
export function prepare() {
  loadAll(() => {
    document.getElementById('startScreen').style.display = 'block';
  });
}

// Buttons
document.getElementById('startButton').onclick = () => {
  document.getElementById('startScreen').style.display = 'none';
  newGame();
};
document.getElementById('playAgain').onclick = () => newGame();

// Space or Enter can start or replay. This does not trigger jump.
window.addEventListener('keydown', e => {
  if (e.code !== 'Space' && e.code !== 'Enter') return;

  const startScreen = document.getElementById('startScreen');
  const highScores = document.getElementById('highscores');

  if (startScreen.style.display === 'block') {
    e.preventDefault();
    startScreen.style.display = 'none';
    newGame();
  } else if (highScores.style.display === 'block') {
    e.preventDefault();
    hidePanel();
    newGame();
  }
});
