// Logical canvas resolution kept small so integer CSS scaling gives crisp pixels.
export const GAME_TITLE = 'FIGHTING GAME';

const CANVAS_W = 320;
const CANVAS_H = 180;

function drawTitle(ctx) {
  ctx.imageSmoothingEnabled = false;

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title text rendered in monospace to preserve pixel-font feel
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(GAME_TITLE, CANVAS_W / 2, CANVAS_H / 2);
}

function init() {
  const canvas = document.getElementById('game-canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const ctx = canvas.getContext('2d');
  drawTitle(ctx);
}

// Only run in a real browser context (not when imported by the test runner)
if (typeof document !== 'undefined' && document.getElementById('game-canvas')) {
  init();
}
