/* constants.js
   Shared numeric game settings. */

export const BASE_W   = 900;
export const BASE_H   = 500;              // was 250
export const SPRITE_H = 60;
export const FLOOR_Y  = BASE_H - 8;

export const BASE_SPEED   = 8;
export const SPAWN_EVERY  = 100;
export const PLANE_CHANCE = 0.4;
export const FPS_DIV      = 5;
export const DEATH_HOLD   = 60;
export const HIT_FRAC     = 0.2;

export const DINO_STATES    = { run:8, jump:12, dead:8 };
export const LANTERN_STATES = { idle:10, dead:10 };
export const PLANE_STATES   = { fly:2, dead:1 };
