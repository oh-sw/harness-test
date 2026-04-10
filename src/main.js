// Logical canvas resolution: 1280x720 (HD, 1:1 CSS display).
import { initSelectScreen } from './screens/select.js';
import { initBattleScreen } from './screens/battle.js';

const CANVAS_W = 1280;
const CANVAS_H = 720;

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
    destroyCurrent();
    destroyCurrent = initBattleScreen(canvas, evt.detail);
  });
}

// Only run in a real browser context (not when imported by the test runner)
if (typeof document !== 'undefined' && document.getElementById('game-canvas')) {
  init();
}
