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
  const speed = stopped ? 0 : BASE_SPEED;

  // --- Planes ---
  planes.forEach((p, i) => {
    // Advance animation or death‐animation once
    if (frame % FPS_DIV === 0) {
      if (!stopped) {
        p.idx = (p.idx + 1) % PLANE_STATES[p.state];
      } else if (p.state === 'dead' && p.idx < PLANE_STATES.dead - 1) {
        p.idx++;
      }
    }

    // Move only if still alive
    if (!stopped) p.x -= speed;

    // Compute size
    const img = planeImgs[p.state][p.idx];
    const r   = img.naturalWidth / img.naturalHeight;
    p.width   = SPRITE_H * r;

    // Always flip horizontally so even dead plane looks left
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + SPRITE_H / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -p.width / 2, -SPRITE_H / 2, p.width, SPRITE_H);
    ctx.restore();

    // Remove offscreen only while alive
    if (!stopped && p.x + p.width < 0) planes.splice(i, 1);
  });

  // --- Lanterns (Pumpkins) ---
  lanterns.forEach((l, i) => {
    if (frame % FPS_DIV === 0) {
      if (!stopped) {
        l.idx = (l.idx + 1) % LANTERN_STATES[l.state];
      } else if (l.state === 'dead' && l.idx < LANTERN_STATES.dead - 1) {
        l.idx++;
      }
    }

    if (!stopped) l.x -= speed;

    const img = lanternImgs[l.state][l.idx];
    l.width  = SPRITE_H * (img.naturalWidth / img.naturalHeight);

    // Flip pumpkins so they always face left
    ctx.save();
    ctx.translate(l.x + l.width / 2, l.y + SPRITE_H / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -l.width / 2, -SPRITE_H / 2, l.width, SPRITE_H);
    ctx.restore();

    if (!stopped && l.x + l.width < 0) lanterns.splice(i, 1);
  });
}

export function hit(d) {
  const hh = d.ducking ? SPRITE_H * 0.5 : SPRITE_H;
  const hy = d.y + SPRITE_H - hh;

  function coll(e) {
    const ix = e.width * HIT_FRAC;
    const iy = hh       * HIT_FRAC;
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
