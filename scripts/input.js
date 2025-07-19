/* input.js
   Simple global key state tracker. */

export const keys = { jump: false, duck: false };

window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') keys.jump = true;
  if (e.code === 'ArrowDown')                      keys.duck = true;
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') keys.jump = false;
  if (e.code === 'ArrowDown')                      keys.duck = false;
});
