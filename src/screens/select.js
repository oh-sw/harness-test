import { CHARACTERS } from '../characters.js';
import { drawFace, FACE_W, FACE_H } from '../art/face.js';
import { drawFrame } from '../art/frame.js';

// Pixel colours for 1P/2P selection highlight
const COLOR_1P = '#3A6EFF';
const COLOR_2P = '#FF3A3A';
const COLOR_DEFAULT = '#555555';
const COLOR_BG = '#111111';
const COLOR_NAME = '#FFFFFF';

// Card layout (all values in logical canvas pixels)
const CARD_W = 48;
const CARD_H = 64;
const CARD_GAP = 8;
const FACE_SCALE = 2; // each face pixel → 2 canvas pixels (32x32 rendered)
const FACE_OFFSET_X = (CARD_W - FACE_W * FACE_SCALE) / 2;
const FACE_OFFSET_Y = 6;

// --- Pure reducer ---------------------------------------------------------

// State shape: { p1: characterId | null, p2: characterId | null }
export const INITIAL_SELECT_STATE = { p1: null, p2: null };

// Returns a new state object; does not mutate the previous state.
export function selectReducer(state, action) {
  switch (action.type) {
    case 'SELECT_1P':
      return { ...state, p1: action.characterId };
    case 'SELECT_2P':
      return { ...state, p2: action.characterId };
    default:
      return state;
  }
}

// --- Rendering ------------------------------------------------------------

export function initSelectScreen(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let state = INITIAL_SELECT_STATE;
  // Default selections so START is possible immediately
  state = selectReducer(state, { type: 'SELECT_1P', characterId: CHARACTERS[0].id });
  state = selectReducer(state, { type: 'SELECT_2P', characterId: CHARACTERS[1].id });

  // Layout: centre the row of cards
  const totalW = CHARACTERS.length * CARD_W + (CHARACTERS.length - 1) * CARD_GAP;
  const startX = Math.floor((canvas.width - totalW) / 2);
  const startY = Math.floor((canvas.height - CARD_H) / 2) - 12;

  function getCardX(index) {
    return startX + index * (CARD_W + CARD_GAP);
  }

  function render() {
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header label
    ctx.fillStyle = COLOR_NAME;
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT CHARACTER', canvas.width / 2, 12);

    // 1P / 2P labels above cards
    ctx.font = '6px "Courier New", monospace';
    CHARACTERS.forEach((char, i) => {
      const cx = getCardX(i);
      if (state.p1 === char.id) {
        ctx.fillStyle = COLOR_1P;
        ctx.fillText('1P', cx + CARD_W / 2, startY - 6);
      }
      if (state.p2 === char.id) {
        ctx.fillStyle = COLOR_2P;
        ctx.fillText('2P', cx + CARD_W / 2, startY - (state.p1 === char.id ? 12 : 6));
      }
    });

    // Cards
    CHARACTERS.forEach((char, i) => {
      const cx = getCardX(i);
      const cy = startY;

      // Card background
      ctx.fillStyle = '#222222';
      ctx.fillRect(cx, cy, CARD_W, CARD_H);

      // Face
      drawFace(ctx, cx + FACE_OFFSET_X, cy + FACE_OFFSET_Y, char.faceParams, FACE_SCALE);

      // Name label
      ctx.fillStyle = COLOR_NAME;
      ctx.font = '5px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(char.name, cx + CARD_W / 2, cy + CARD_H - 6);

      // Frame — colour depends on selection state
      let frameColor = COLOR_DEFAULT;
      if (state.p1 === char.id && state.p2 === char.id) {
        // Both players chose this character — split: draw p1 frame on top half, p2 on bottom
        drawFrame(ctx, cx, cy, CARD_W, CARD_H / 2, COLOR_1P, 2);
        drawFrame(ctx, cx, cy + CARD_H / 2, CARD_W, CARD_H / 2, COLOR_2P, 2);
        return;
      } else if (state.p1 === char.id) {
        frameColor = COLOR_1P;
      } else if (state.p2 === char.id) {
        frameColor = COLOR_2P;
      }
      drawFrame(ctx, cx, cy, CARD_W, CARD_H, frameColor, 2);
    });

    // START button
    const startBtnY = startY + CARD_H + 14;
    const canStart = state.p1 !== null && state.p2 !== null;
    ctx.fillStyle = canStart ? '#22CC44' : '#444444';
    ctx.fillRect(canvas.width / 2 - 24, startBtnY, 48, 12);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 7px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('START', canvas.width / 2, startBtnY + 9);
  }

  function handleClick(evt) {
    const rect = canvas.getBoundingClientRect();
    // Map from CSS pixels back to logical canvas pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const lx = Math.floor((evt.clientX - rect.left) * scaleX);
    const ly = Math.floor((evt.clientY - rect.top) * scaleY);

    // Check START button
    const startBtnY = startY + CARD_H + 14;
    if (
      lx >= canvas.width / 2 - 24 &&
      lx <= canvas.width / 2 + 24 &&
      ly >= startBtnY &&
      ly <= startBtnY + 12 &&
      state.p1 !== null &&
      state.p2 !== null
    ) {
      canvas.dispatchEvent(
        new CustomEvent('game:start', {
          bubbles: true,
          detail: { p1: state.p1, p2: state.p2 },
        })
      );
      return;
    }

    // Check card clicks — left-click = 1P, right-click = 2P
    CHARACTERS.forEach((char, i) => {
      const cx = getCardX(i);
      if (lx >= cx && lx < cx + CARD_W && ly >= startY && ly < startY + CARD_H) {
        if (evt.button === 2) {
          state = selectReducer(state, { type: 'SELECT_2P', characterId: char.id });
        } else {
          state = selectReducer(state, { type: 'SELECT_1P', characterId: char.id });
        }
        render();
      }
    });
  }

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
    handleClick({ clientX: evt.clientX, clientY: evt.clientY, button: 2 });
  });

  render();

  // Return a teardown function so the router can clean up listeners
  return function destroy() {
    canvas.removeEventListener('click', handleClick);
  };
}
