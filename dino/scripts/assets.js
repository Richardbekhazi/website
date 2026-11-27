/* assets.js
   Image preloader for Dino, Lantern, and Plane sprites. */

import { DINO_STATES, LANTERN_STATES, PLANE_STATES } from './constants.js';

export const dinoImgs    = {};
export const lanternImgs = {};
export const planeImgs   = {};

let loaded = 0;
const total =
  Object.values(DINO_STATES).reduce((a, b) => a + b, 0) +
  Object.values(LANTERN_STATES).reduce((a, b) => a + b, 0) +
  Object.values(PLANE_STATES).reduce((a, b) => a + b, 0);

function preload(store, folder, states, ready) {
  for (const [state, count] of Object.entries(states)) {
    store[state] = [];
    const cap = state[0].toUpperCase() + state.slice(1);
    for (let i = 1; i <= count; i++) {
      const img = new Image();
      img.src = `Sprites/${folder}/${cap} (${i}).png`;
      img.onload = () => { if (++loaded === total) ready(); };
      store[state].push(img);
    }
  }
}

export function loadAll(ready) {
  preload(dinoImgs,    'Dino',    DINO_STATES,    ready);
  preload(lanternImgs, 'Lantern', LANTERN_STATES, ready);
  preload(planeImgs,   'Plane',   PLANE_STATES,   ready);
}
