/* dino.js
   Player with jump and a true hold crouch. */

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
  crouchPhase: 'down'   // down then up while exiting
};

const idx = { run: 0, jump: 0, dead: 0 };

export function markDead() {
  dino.dead = true;
  dino.ducking = false;
}

export function update(frame) {
  // Death animation
  if (dino.dead) {
    if (frame % FPS_DIV === 0 && idx.dead < DINO_STATES.dead - 1) {
      idx.dead++;
    }
    return;
  }

  // Jump cancels crouch
  if (keys.jump && dino.grounded) {
    dino.ducking = false;
    dino.crouchPhase = 'down';
    dino.vy = dino.jumpVel;
    dino.grounded = false;
  }

  // Crouch while grounded. Hold as long as duck is true.
  if (dino.grounded && !keys.jump) {
    if (keys.duck) {
      dino.ducking = true;
      // Animate down to full crouch, then hold at the bottom.
      if (frame % FPS_DIV === 0) {
        const max = DINO_STATES.dead - 1;
        if (dino.crouchPhase === 'down' && dino.crouchIndex < max) {
          dino.crouchIndex++;
        }
      }
      return;
    } else if (dino.ducking) {
      // Animate up until fully standing. Then clear crouch.
      if (frame % FPS_DIV === 0) {
        if (dino.crouchIndex > 0) {
          dino.crouchIndex--;
        } else {
          dino.ducking = false;
          dino.crouchPhase = 'down';
        }
      }
      return;
    }
  }

  // Normal gravity and running or jumping animation
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
    state = 'dead';  // reuse dead frames for crouch frames
    frameIndex = dino.crouchIndex;
  } else {
    state = dino.grounded ? 'run' : 'jump';
    frameIndex = idx[state];
  }

  const img = dinoImgs[state][frameIndex];
  dino.width = SPRITE_H * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, dino.x, dino.y, dino.width, SPRITE_H);
}
