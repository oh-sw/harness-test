// Pixel-art HUD: HP bars and name labels for both fighters.

import { MAX_HP } from '../engine/fighter.js';

const BAR_BLOCK_W = 32;  // width of each HP block in pixels
const BAR_BLOCK_H = 20;  // height of each HP block in pixels
const BAR_GAP = 4;        // gap between blocks
const BAR_BORDER = 2;     // border thickness

const COLOR_HP_FULL   = '#44DD44';
const COLOR_HP_EMPTY  = '#222222';
const COLOR_HP_BORDER = '#FFFFFF';
const COLOR_NAME_BG   = '#000000CC';
const COLOR_NAME_TEXT = '#FFFFFF';

const P1_BAR_X = 40;
const P2_BAR_X = 1280 - 40 - (MAX_HP * (BAR_BLOCK_W + BAR_GAP) - BAR_GAP);
const BAR_Y = 20;
const NAME_Y = BAR_Y + BAR_BLOCK_H + BAR_BORDER + 6;

/**
 * Draws a pixel-art HP bar at (x, y) for the given fighter.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - left edge of the bar
 * @param {number} hp - current HP value
 * @param {string} name - character display name
 */
function drawHpBar(ctx, x, hp, name) {
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < MAX_HP; i++) {
    const bx = Math.round(x + i * (BAR_BLOCK_W + BAR_GAP));
    const by = BAR_Y;

    // Border
    ctx.fillStyle = COLOR_HP_BORDER;
    ctx.fillRect(bx - BAR_BORDER, by - BAR_BORDER, BAR_BLOCK_W + BAR_BORDER * 2, BAR_BLOCK_H + BAR_BORDER * 2);

    // Block fill
    ctx.fillStyle = i < hp ? COLOR_HP_FULL : COLOR_HP_EMPTY;
    ctx.fillRect(bx, by, BAR_BLOCK_W, BAR_BLOCK_H);
  }

  // Name label
  ctx.fillStyle = COLOR_NAME_BG;
  const labelW = MAX_HP * (BAR_BLOCK_W + BAR_GAP) - BAR_GAP + BAR_BORDER * 2;
  ctx.fillRect(x - BAR_BORDER, NAME_Y, labelW, 22);

  ctx.fillStyle = COLOR_NAME_TEXT;
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(name, x, NAME_Y + 16);
}

/**
 * Draws the full HUD (both HP bars and names) for a frame.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ fighter: { hp: number }, name: string }} p1Entry
 * @param {{ fighter: { hp: number }, name: string }} p2Entry
 */
export function drawHud(ctx, { fighter: p1, name: p1Name }, { fighter: p2, name: p2Name }) {
  drawHpBar(ctx, P1_BAR_X, p1.hp, p1Name);
  drawHpBar(ctx, P2_BAR_X, p2.hp, p2Name);
}
