// Keyboard input handler.
// Tracks which keys are currently held, mapped to logical actions per player.

// 1P key bindings — use event.code (physical key position) so Korean/English IME state is irrelevant
const KEYMAP_P1 = {
  KeyF: 'left',
  KeyH: 'right',
  KeyT: 'jump',
  KeyG: 'block',
  KeyZ: 'punch',
  KeyX: 'kick',
};

// 2P key bindings — arrow codes are identical in event.code
const KEYMAP_P2 = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'jump',
  ArrowDown: 'block',
  Comma: 'punch',
  Period: 'kick',
};

/**
 * Creates an input handler that listens to the window for keydown/keyup events.
 * Returns an object with:
 *   - isAction(player, action): boolean — true if the action key is held
 *   - wasPressed(player, action): boolean — true once per keydown
 *   - consumePressed(player, action): void — clear the "was pressed" flag
 *   - destroy(): void — remove listeners
 */
export function createInputHandler() {
  // held[key] = true while the key is physically down
  const held = {};
  // pressed[key] = true from keydown until consumed
  const pressed = {};

  // All mapped codes across both players — used for targeted preventDefault
  const ALL_CODES = new Set([...Object.keys(KEYMAP_P1), ...Object.keys(KEYMAP_P2)]);

  function onKeyDown(e) {
    if (held[e.code]) return; // already held, ignore repeat
    held[e.code] = true;
    pressed[e.code] = true;
    // Prevent IME interference and browser default actions (e.g. arrow scroll) for mapped keys
    if (ALL_CODES.has(e.code)) e.preventDefault();
  }

  function onKeyUp(e) {
    held[e.code] = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function resolveAction(player, action) {
    const map = player === 1 ? KEYMAP_P1 : KEYMAP_P2;
    return Object.entries(map).find(([, v]) => v === action)?.[0] ?? null;
  }

  return {
    isAction(player, action) {
      const key = resolveAction(player, action);
      return key !== null && !!held[key];
    },
    wasPressed(player, action) {
      const key = resolveAction(player, action);
      return key !== null && !!pressed[key];
    },
    consumePressed(player, action) {
      const key = resolveAction(player, action);
      if (key) pressed[key] = false;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
