// Battle screen: game loop, input, physics, rendering.
// Returns a destroy() function following the same contract as select.js.

import { CHARACTERS } from '../characters.js';
import { createFighter, applyMovement, applyJump, MOVE_SPEED } from '../engine/fighter.js';
import { stepFighter, preventOverlap } from '../engine/physics.js';
import { createInputHandler } from '../engine/input.js';
import {
  startPunch,
  startKickCharge,
  updateKickCharge,
  updateMotion,
  resolveAttack,
} from '../engine/combat.js';
import { drawBody } from '../art/body.js';
import { drawStage } from '../art/stage.js';
import { drawFace } from '../art/face.js';
import { drawHud } from '../art/hud.js';

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
    facingRight: false, // P2 starts on the right side and faces left
  });

  const input = createInputHandler();
  let rafId = null;

  /**
   * Applies movement and jump for a fighter, skipping if input is locked.
   * Blocking state is updated regardless of inputLocked (hold = always current).
   * When input is locked, blocking is also suppressed.
   */
  function applyPlayerInput(fighter, playerNum, now) {
    // Blocking is a hold action — update before the lock check so it can be cleared
    // during motion (spec: input locked ⇒ blocking input ignored)
    let next = fighter;

    if (!next.inputLocked) {
      // Blocking (hold)
      next = { ...next, blocking: input.isAction(playerNum, 'block') };

      // Movement
      let dx = 0;
      if (input.isAction(playerNum, 'left'))  dx -= MOVE_SPEED;
      if (input.isAction(playerNum, 'right')) dx += MOVE_SPEED;
      if (dx !== 0) next = applyMovement(next, dx);

      // Jump (edge-triggered)
      if (input.wasPressed(playerNum, 'jump')) {
        next = applyJump(next);
        input.consumePressed(playerNum, 'jump');
      }

      // Punch (edge-triggered)
      if (input.wasPressed(playerNum, 'punch')) {
        next = startPunch(next, now);
        input.consumePressed(playerNum, 'punch');
      }

      // Kick charge (edge-triggered; startKickCharge guards double-charge)
      if (input.wasPressed(playerNum, 'kick')) {
        next = startKickCharge(next, now);
        input.consumePressed(playerNum, 'kick');
      }
    } else {
      // While locked: consume pending presses so they don't queue up
      input.consumePressed(playerNum, 'jump');
      input.consumePressed(playerNum, 'punch');
      input.consumePressed(playerNum, 'kick');
      // Ensure blocking is cleared during motion lock
      next = { ...next, blocking: false };
    }

    return next;
  }

  function update() {
    const now = performance.now();

    // Update timers first so motionEndTime is evaluated with the current timestamp
    p1 = updateKickCharge(p1, now);
    p2 = updateKickCharge(p2, now);
    p1 = updateMotion(p1, now);
    p2 = updateMotion(p2, now);

    // Apply player input (respects inputLocked)
    p1 = applyPlayerInput(p1, 1, now);
    p2 = applyPlayerInput(p2, 2, now);

    // Resolve mutual attacks — each fighter is simultaneously attacker and potential defender
    [p1, p2] = resolveAttack(p1, p2, now);
    [p2, p1] = resolveAttack(p2, p1, now);

    // Physics step (gravity + clamp)
    p1 = stepFighter(p1);
    p2 = stepFighter(p2);

    // Prevent fighters from passing through each other;
    // clampToBounds is re-applied inside preventOverlap to keep both within canvas
    [p1, p2] = preventOverlap(p1, p2);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStage(ctx);
    drawBody(ctx, p1.x, p1.y, p1.faceParams);
    drawBody(ctx, p2.x, p2.y, p2.faceParams);
    // HUD: face portraits in top corners, standard fighting game pattern
    drawFace(ctx, 50, 80, p1.faceParams, 4);
    drawFace(ctx, 1150, 80, p2.faceParams, 4);
    // HP bars
    drawHud(ctx, { fighter: p1, name: p1Char.name }, { fighter: p2, name: p2Char.name });
  }

  // Extracts the subset of fighter state exposed to QA automation.
  function toGameStateFighter(f) {
    return {
      x: f.x, y: f.y, vy: f.vy,
      hp: f.hp,
      blocking: f.blocking,
      attackState: f.attackState,
      kickCharging: f.kickCharging,
      inputLocked: f.inputLocked,
    };
  }

  function loop() {
    update();
    render();
    // Expose fighter state for QA automation
    window.__gameState = { fighters: [toGameStateFighter(p1), toGameStateFighter(p2)] };
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
