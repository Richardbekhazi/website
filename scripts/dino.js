/* dino.js
   Player sprite with physics, animation, and clean death stop. */

import { FLOOR_Y, SPRITE_H, DINO_STATES, FPS_DIV } from './constants.js';
import { dinoImgs } from './assets.js';
import { keys } from './input.js';
import { ctx } from './canvas.js';

export const dino = {
  x: 50,
  y: FLOOR_Y - SPRITE_H,
  vy: 0,
  gravity: 0.6,
  jumpVel: -12,
  grounded: true,
  duck: false,
  width: 0,
  dead: false
};

const idx = { run: 0, jump: 0, dead: 0 };

export function markDead() { dino.dead = true; }

export function update(frame) {
  if (dino.dead) {
    const max = DINO_STATES.dead;
    if (idx.dead < max - 1 && frame % FPS_DIV === 0) idx.dead += 1;
    return;
  }

  dino.duck = keys.duck;

  if (keys.jump && dino.grounded) {
    dino.vy = dino.jumpVel;
    dino.grounded = false;
  }

  dino.vy += dino.gravity;
  dino.y  += dino.vy;

  if (dino.y + SPRITE_H > FLOOR_Y) {
    dino.y = FLOOR_Y - SPRITE_H;
    dino.vy = 0;
    dino.grounded = true;
  }

  const state = dino.grounded ? 'run' : 'jump';
  if (frame % FPS_DIV === 0) {
    idx[state] = (idx[state] + 1) % DINO_STATES[state];
  }
}

export function draw() {
  const state = dino.dead ? 'dead' : (dino.grounded ? 'run' : 'jump');
  const img   = dinoImgs[state][idx[state]];
  dino.width  = SPRITE_H * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, dino.x, dino.y, dino.width, SPRITE_H);
}
