/* ui.js
   Score text plus high‑score storage and display. */

import { ctx } from './canvas.js';

const key = 'highscores';

function list() {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

export function pushHS(n) {
  const arr = list();
  arr.push(n);
  arr.sort((a,b) => b - a);
  if (arr.length > 10) arr.length = 10;
  localStorage.setItem(key, JSON.stringify(arr));
}

export function drawScore(score) {
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Score: ${score}`, 10, 22);
}

export function showPanel() {
  const panel = document.getElementById('highscores');
  const listTag = document.getElementById('scoreList');
  listTag.innerHTML = list().map(x => `<li>${x}</li>`).join('');
  panel.style.display = 'block';
}

export function hidePanel() {
  document.getElementById('highscores').style.display = 'none';
}
