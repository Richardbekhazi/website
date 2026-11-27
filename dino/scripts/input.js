/* input.js
   Global input state. Keyboard and touch. */

export const keys = { jump: false, duck: false };

/* Helper. If a panel is visible we use Space or Enter to start or replay.
   In that case we must not send jump. */
function aPanelIsVisible() {
  const start = document.getElementById('startScreen');
  const hs = document.getElementById('highscores');
  return (start && start.style.display === 'block') ||
         (hs && hs.style.display === 'block');
}

/* Keyboard */
window.addEventListener('keydown', e => {
  // If we are on a panel. Let gameLoop handle Space or Enter. Do not jump.
  if (aPanelIsVisible() && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    return;
  }
  if (e.code === 'Space' || e.code === 'ArrowUp') keys.jump = true;
  if (e.code === 'ArrowDown')                      keys.duck = true;
});

window.addEventListener('keyup', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') keys.jump = false;
  if (e.code === 'ArrowDown')                      keys.duck = false;
});

/* Touch. Tap to jump. Hold to crouch. Release ends crouch. */
const gameCanvas = document.getElementById('game');
let holdTimer = null;
let crouchingFromTouch = false;
let touchStartAt = 0;

if (gameCanvas) {
  gameCanvas.addEventListener('touchstart', e => {
    e.preventDefault();
    touchStartAt = Date.now();
    crouchingFromTouch = false;

    // Start a timer. If the finger stays long enough we enter crouch.
    holdTimer = setTimeout(() => {
      keys.duck = true;
      crouchingFromTouch = true;
    }, 250);
  });

  gameCanvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    const duration = Date.now() - touchStartAt;

    if (crouchingFromTouch) {
      // End crouch on release.
      keys.duck = false;
      crouchingFromTouch = false;
    } else {
      // Short tap. Jump once.
      if (duration < 250) {
        keys.jump = true;
        setTimeout(() => { keys.jump = false; }, 60);
      }
    }
  }, { passive: false });

  // We ignore touchmove. Holding already triggers crouch via the timer.
}
