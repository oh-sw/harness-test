import { CHARACTERS } from '../characters.js';
import { drawFace, FACE_W, FACE_H } from '../art/face.js';
import { drawFrame } from '../art/frame.js';

// Pixel colours for 1P/2P selection highlight
const COLOR_1P = '#3A6EFF';
const COLOR_2P = '#FF3A3A';
const COLOR_DEFAULT = '#555555';
const COLOR_BG = '#111111';
const COLOR_NAME = '#FFFFFF';
const COLOR_CARD_BG = '#222222';
const COLOR_START_ACTIVE = '#22CC44';
const COLOR_START_INACTIVE = '#444444';
const COLOR_WARNING_BORDER = '#FF3A3A';

// Warning modal dimensions
const WARNING_MODAL_W = 560;
const WARNING_MODAL_H = 96;
const WARNING_MODAL_BORDER = 8;

// Card layout (all values in logical canvas pixels, sized for 1280x720 resolution)
const CARD_W = 192;
const CARD_H = 256;

// START button dimensions
const START_BTN_W = 192;
const START_BTN_H = 48;
const START_BTN_GAP_Y = 126;  // vertical gap positions START button at ~82% canvas height for QA click target
const CARD_GAP = 32;
const CARD_FRAME_BORDER = 4;
const FACE_SCALE = 8; // each face pixel → 8 canvas pixels (128x128 rendered)
const FACE_OFFSET_X = (CARD_W - FACE_W * FACE_SCALE) / 2;
const FACE_OFFSET_Y = 12;

// --- Pure reducer ---------------------------------------------------------

// State shape: { p1: characterId | null, p2: characterId | null }
export const INITIAL_SELECT_STATE = { p1: null, p2: null };

// Returns a new state object; does not mutate the previous state.
// If a player tries to select the same character as the other player,
// the selection is rejected and warning: true is set in the returned state.
export function selectReducer(state, action) {
  switch (action.type) {
    case 'SELECT_1P': {
      if (state.p2 !== null && state.p2 === action.characterId) {
        return { ...state, warning: true };
      }
      return { ...state, p1: action.characterId };
    }
    case 'SELECT_2P': {
      if (state.p1 !== null && state.p1 === action.characterId) {
        return { ...state, warning: true };
      }
      return { ...state, p2: action.characterId };
    }
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

  // Warning modal state
  let warningVisible = false;
  let warningTimer = null;

  // Layout: centre the row of cards
  const totalW = CHARACTERS.length * CARD_W + (CHARACTERS.length - 1) * CARD_GAP;
  const startX = Math.floor((canvas.width - totalW) / 2);
  const startY = Math.floor((canvas.height - CARD_H) / 2) - 48;

  function getCardX(index) {
    return startX + index * (CARD_W + CARD_GAP);
  }

  function getStartBtnPos() {
    return {
      x: Math.floor(canvas.width / 2 - START_BTN_W / 2),
      y: startY + CARD_H + START_BTN_GAP_Y,
    };
  }

  function showWarning() {
    warningVisible = true;
    render();
    if (warningTimer !== null) {
      clearTimeout(warningTimer);
    }
    warningTimer = setTimeout(() => {
      warningVisible = false;
      warningTimer = null;
      render();
    }, 3000);
  }

  function drawWarningModal() {
    const modalX = Math.floor((canvas.width - WARNING_MODAL_W) / 2);
    const modalY = Math.floor((canvas.height - WARNING_MODAL_H) / 2);

    // Modal background
    ctx.fillStyle = '#000000';
    ctx.fillRect(modalX, modalY, WARNING_MODAL_W, WARNING_MODAL_H);

    // Pixel-art border
    drawFrame(ctx, modalX, modalY, WARNING_MODAL_W, WARNING_MODAL_H, COLOR_WARNING_BORDER, WARNING_MODAL_BORDER);

    // Warning text
    ctx.fillStyle = COLOR_NAME;
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('같은 캐릭터를 선택할 수 없습니다', canvas.width / 2, modalY + WARNING_MODAL_H / 2 + 10);
  }

  function render() {
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header label
    ctx.fillStyle = COLOR_NAME;
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT CHARACTER', canvas.width / 2, 48);

    // 1P / 2P labels above cards
    ctx.font = '24px "Courier New", monospace';
    CHARACTERS.forEach((char, i) => {
      const cx = getCardX(i);
      if (state.p1 === char.id) {
        ctx.fillStyle = COLOR_1P;
        ctx.fillText('1P', cx + CARD_W / 2, startY - 24);
      }
      if (state.p2 === char.id) {
        ctx.fillStyle = COLOR_2P;
        ctx.fillText('2P', cx + CARD_W / 2, startY - (state.p1 === char.id ? 48 : 24));
      }
    });

    // Cards
    CHARACTERS.forEach((char, i) => {
      const cx = getCardX(i);
      const cy = startY;

      // Card background
      ctx.fillStyle = COLOR_CARD_BG;
      ctx.fillRect(cx, cy, CARD_W, CARD_H);

      // Face
      drawFace(ctx, cx + FACE_OFFSET_X, cy + FACE_OFFSET_Y, char.faceParams, FACE_SCALE);

      // Name label
      ctx.fillStyle = COLOR_NAME;
      ctx.font = '20px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(char.name, cx + CARD_W / 2, cy + CARD_H - 24);

      // Frame — colour depends on selection state
      const frameColor =
        state.p1 === char.id ? COLOR_1P :
        state.p2 === char.id ? COLOR_2P :
        COLOR_DEFAULT;
      drawFrame(ctx, cx, cy, CARD_W, CARD_H, frameColor, CARD_FRAME_BORDER);
    });

    // START button
    const { x: startBtnX, y: startBtnY } = getStartBtnPos();
    const canStart = state.p1 !== null && state.p2 !== null;
    ctx.fillStyle = canStart ? COLOR_START_ACTIVE : COLOR_START_INACTIVE;
    ctx.fillRect(startBtnX, startBtnY, START_BTN_W, START_BTN_H);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('START', canvas.width / 2, startBtnY + 34);

    // Warning modal (drawn on top if visible)
    if (warningVisible) {
      drawWarningModal();
    }
  }

  function handleClick(evt) {
    const rect = canvas.getBoundingClientRect();
    // Map from CSS pixels back to logical canvas pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const lx = Math.floor((evt.clientX - rect.left) * scaleX);
    const ly = Math.floor((evt.clientY - rect.top) * scaleY);

    // Check START button
    const { x: startBtnX, y: startBtnY } = getStartBtnPos();
    if (
      lx >= startBtnX &&
      lx <= startBtnX + START_BTN_W &&
      ly >= startBtnY &&
      ly <= startBtnY + START_BTN_H &&
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
        let nextState;
        if (evt.button === 2) {
          nextState = selectReducer(state, { type: 'SELECT_2P', characterId: char.id });
        } else {
          nextState = selectReducer(state, { type: 'SELECT_1P', characterId: char.id });
        }

        if (nextState.warning) {
          // Show warning but do not update the main selection state
          showWarning();
        } else {
          state = nextState;
          render();
        }
      }
    });
  }

  function handleContextMenu(evt) {
    evt.preventDefault();
    handleClick({ clientX: evt.clientX, clientY: evt.clientY, button: 2 });
  }

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('contextmenu', handleContextMenu);

  render();

  // Return a teardown function so the router can clean up listeners
  return function destroy() {
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('contextmenu', handleContextMenu);
    if (warningTimer !== null) {
      clearTimeout(warningTimer);
    }
  };
}
