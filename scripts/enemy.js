/* enemy.js
   Enemy spawning, movement, drawing, and collision detection. */

import { canvas, ctx } from './canvas.js';
import {
  FLOOR_Y, SPRITE_H, BASE_SPEED,
  SPAWN_EVERY, PLANE_CHANCE,
  LANTERN_STATES, PLANE_STATES,
  FPS_DIV, HIT_FRAC
} from './constants.js';
import { lanternImgs, planeImgs } from './assets.js';

const lanterns = [];
const planes   = [];

function spawnLantern() {
  lanterns.push({
    x: canvas.width,
    y: FLOOR_Y - SPRITE_H,
    state: 'idle',
    idx: 0,
    width: 0
  });
}

function spawnPlane() {
  const offset = SPRITE_H * 0.75 * Math.random();
  planes.push({
    x: canvas.width,
    y: FLOOR_Y - SPRITE_H - offset,
    state: 'fly',
    idx: 0,
    width: 0
  });
}

export function maybeSpawn(frame, stopped) {
  if (stopped) return;
  if (frame % SPAWN_EVERY === 0) {
    Math.random() < PLANE_CHANCE ? spawnPlane() : spawnLantern();
  }
}

export function updateAndDraw(frame, stopped) {
  // If stopped (dino dead), freeze movement; otherwise use BASE_SPEED
  const speed = stopped ? 0 : BASE_SPEED;

  // Draw planes
  planes.forEach((p, i) => {
    // Advance animation frame when flying or dead
    if (frame % FPS_DIV === 0) {
      p.idx = (p.idx + 1) % PLANE_STATES[p.state];
    }

    // Move left unless stopped
    p.x -= speed;

    // Compute display size
    const img = planeImgs[p.state][p.idx];
    const r   = img.naturalWidth / img.naturalHeight;
    p.width   = SPRITE_H * r;

    // Flip horizontally when flying so plane faces left
    if (p.state === 'fly') {
      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + SPRITE_H / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -p.width / 2, -SPRITE_H / 2, p.width, SPRITE_H);
      ctx.restore();
    } else {
      // Dead plane just sits (no flip)
      ctx.drawImage(img, p.x, p.y, p.width, SPRITE_H);
    }

    // Remove off‑screen only if still running
    if (!stopped && p.x + p.width < 0) planes.splice(i, 1);
  });

  // Draw lanterns (pumpkins), always flipped to face left
  lanterns.forEach((l, i) => {
    // Advance lantern animation
    if (frame % FPS_DIV === 0) {
      l.idx = (l.idx + 1) % LANTERN_STATES[l.state];
    }

    // Move left unless stopped
    l.x -= speed;

    // Compute display size
    const img = lanternImgs[l.state][l.idx];
    l.width   = SPRITE_H * (img.naturalWidth / img.naturalHeight);

    // Flip pumpkin horizontally
    ctx.save();
    ctx.translate(l.x + l.width / 2, l.y + SPRITE_H / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -l.width / 2, -SPRITE_H / 2, l.width, SPRITE_H);
    ctx.restore();

    // Remove off‑screen only if still running
    if (!stopped && l.x + l.width < 0) lanterns.splice(i, 1);
  });
}


export function hit(d) {
  const hh = d.duck ? SPRITE_H * 0.5 : SPRITE_H;
  const hy = d.y + SPRITE_H - hh;

  function coll(e) {
    const ix = e.width * HIT_FRAC;
    const iy = hh * HIT_FRAC;
    return d.x < e.x + e.width - ix &&
           d.x + d.width > e.x + ix &&
           hy < e.y + SPRITE_H - iy &&
           hy + hh > e.y + iy;
  }
  return planes.some(coll) || lanterns.some(coll);
}

export function killAll() {
  planes.forEach(p => { p.state = 'dead'; p.idx = 0; });
  lanterns.forEach(l => { l.state = 'dead'; l.idx = 0; });
}

export function resetEnemies() {
  planes.length = 0;
  lanterns.length = 0;
}
