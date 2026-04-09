// Logical canvas resolution kept small so integer CSS scaling gives crisp pixels.
export const GAME_TITLE = 'FIGHTING GAME';

import { initSelectScreen } from './screens/select.js';

const CANVAS_W = 640;
const CANVAS_H = 360;

function init() {
  const canvas = document.getElementById('game-canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Show the character select screen on load.
  // Each screen init returns a destroy() function for teardown when routing away.
  let destroyCurrent = initSelectScreen(canvas);

  canvas.addEventListener('game:start', (evt) => {
    // Future commits will route to the battle screen here.
    // For now just log so QA can verify the event fires.
    console.log('game:start', evt.detail);
    if (destroyCurrent) destroyCurrent();
  });
}

// Only run in a real browser context (not when imported by the test runner)
if (typeof document !== 'undefined' && document.getElementById('game-canvas')) {
  init();
}
