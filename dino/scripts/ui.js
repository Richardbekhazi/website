/* ui.js
   Score text plus high score storage and display. */

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
  // Only HTML score. No canvas text. Prevents duplicate score.
  const scoreEl = document.getElementById('scoreDisplay');
  if (scoreEl) scoreEl.textContent = score;
  // Expose to the AI agent.
  window.bekhaziScore = score;
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
