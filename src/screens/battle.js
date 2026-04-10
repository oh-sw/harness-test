// Battle screen: game loop, input, physics, rendering.
// Returns a destroy() function following the same contract as select.js.

import { CHARACTERS } from '../characters.js';
import { createFighter, applyMovement, applyJump, MOVE_SPEED } from '../engine/fighter.js';
import { stepFighter } from '../engine/physics.js';
import { createInputHandler } from '../engine/input.js';
import { drawBody } from '../art/body.js';
import { drawStage } from '../art/stage.js';
import { drawFace } from '../art/face.js';

const GROUND_Y = 600; // bottom of sprite rests at this y
const P1_START_X = 200;
const P2_START_X = 1000;

/**
 * Initialises the battle screen.
 * @param {HTMLCanvasElement} canvas
 * @param {{ p1: string, p2: string }} detail - character ids from game:start
 * @returns {function} destroy - cleans up the screen
 */
export function initBattleScreen(canvas, { p1: p1Id, p2: p2Id }) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const p1Char = CHARACTERS.find(c => c.id === p1Id);
  const p2Char = CHARACTERS.find(c => c.id === p2Id);

  let p1 = createFighter({
    characterId: p1Char.id,
    faceParams: p1Char.faceParams,
    x: P1_START_X,
    groundY: GROUND_Y,
  });

  let p2 = createFighter({
    characterId: p2Char.id,
    faceParams: p2Char.faceParams,
    x: P2_START_X,
    groundY: GROUND_Y,
  });

  const input = createInputHandler();
  let rafId = null;

  function applyPlayerInput(fighter, playerNum) {
    let dx = 0;
    if (input.isAction(playerNum, 'left'))  dx -= MOVE_SPEED;
    if (input.isAction(playerNum, 'right')) dx += MOVE_SPEED;
    let next = dx !== 0 ? applyMovement(fighter, dx) : fighter;
    if (input.wasPressed(playerNum, 'jump')) {
      next = applyJump(next);
      input.consumePressed(playerNum, 'jump');
    }
    return next;
  }

  function update() {
    p1 = applyPlayerInput(p1, 1);
    p2 = applyPlayerInput(p2, 2);

    // Physics step (gravity + clamp)
    p1 = stepFighter(p1);
    p2 = stepFighter(p2);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStage(ctx);
    drawBody(ctx, p1.x, p1.y, p1.faceParams);
    drawBody(ctx, p2.x, p2.y, p2.faceParams);
    // HUD: face portraits in top corners, standard fighting game pattern
    drawFace(ctx, 50, 80, p1.faceParams, 4);
    drawFace(ctx, 1150, 80, p2.faceParams, 4);
  }

  function loop() {
    update();
    render();
    // Expose fighter positions for QA automation
    window.__gameState = {
      fighters: [
        { x: p1.x, y: p1.y, vy: p1.vy },
        { x: p2.x, y: p2.y, vy: p2.vy },
      ],
    };
    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);

  return function destroy() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    input.destroy();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    delete window.__gameState;
  };
}
