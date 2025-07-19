/* scripts/dino.js
   Player with jump, one‑off reversible crouch that you can cancel by jumping,
   and death animation. */

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
  ducking: false,
  dead: false,
  width: 0,
  crouchIndex: 0,
  crouchPhase: 'down'   // 'down' then 'up'
};

const idx = { run: 0, jump: 0, dead: 0 };
let crouchRequested = false;

// Listen for a down‑arrow press to trigger a single crouch
window.addEventListener('keydown', e => {
  if (e.code === 'ArrowDown'
      && dino.grounded
      && !dino.dead
      && !dino.ducking) {
    crouchRequested = true;
  }
});

export function markDead() {
  dino.dead = true;
  dino.ducking = false;
}

export function update(frame) {
  // 1) Death animation
  if (dino.dead) {
    if (frame % FPS_DIV === 0 && idx.dead < DINO_STATES.dead - 1) {
      idx.dead++;
    }
    return;
  }

  // 2) Jump: allow jump even if crouching
  if (keys.jump && dino.grounded) {
    dino.ducking = false;        // cancel any crouch
    dino.vy = dino.jumpVel;      // start jump
    dino.grounded = false;
    return;
  }

  // 3) One‑off crouch trigger (only if not jumped)
  if (crouchRequested) {
    dino.ducking = true;
    dino.crouchIndex = 0;
    dino.crouchPhase = 'down';
    crouchRequested = false;
    return;
  }

  // 4) Crouch reversible animation
  if (dino.ducking) {
    if (frame % FPS_DIV === 0) {
      const max = DINO_STATES.dead;
      if (dino.crouchPhase === 'down') {
        if (dino.crouchIndex < max - 1) {
          dino.crouchIndex++;
        } else {
          dino.crouchPhase = 'up';
        }
      } else { // phase 'up'
        if (dino.crouchIndex > 0) {
          dino.crouchIndex--;
        } else {
          dino.ducking = false;
        }
      }
    }
    return;
  }

  // 5) Normal gravity + running/jumping animation
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
  let state, frameIndex;

  if (dino.dead) {
    state = 'dead';
    frameIndex = idx.dead;
  } else if (dino.ducking) {
    state = 'dead';  // reuse dead frames for crouch
    frameIndex = dino.crouchIndex;
  } else {
    state = dino.grounded ? 'run' : 'jump';
    frameIndex = idx[state];
  }

  const img = dinoImgs[state][frameIndex];
  dino.width = SPRITE_H * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, dino.x, dino.y, dino.width, SPRITE_H);
}
