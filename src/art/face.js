// Pixel-art male face renderer.
// generateFacePixels is a pure function so tests can verify determinism without canvas.
// drawFace renders the pixel array onto a canvas context at (x, y).

const FACE_W = 16;
const FACE_H = 16;

// Pixel layout constants (rows are 0-indexed, columns 0-indexed within FACE_W)
// Row 0-1  : hair top
// Row 2    : hair / forehead
// Row 3-4  : forehead
// Row 5-9  : eyes, nose area
// Row 10   : nose
// Row 11   : mouth area
// Row 12   : chin / beard
// Row 13-15: neck/hair-bottom

const TRANSPARENT = null;

// Returns a flat array of FACE_W * FACE_H colour strings (or null for transparent).
// The result is fully determined by faceParams — no randomness at call time.
export function generateFacePixels(faceParams) {
  const { skinTone, hairStyle, hairColor, eyeColor, beard } = faceParams;
  const pixels = new Array(FACE_W * FACE_H).fill(TRANSPARENT);

  function set(row, col, color) {
    if (row >= 0 && row < FACE_H && col >= 0 && col < FACE_W) {
      pixels[row * FACE_W + col] = color;
    }
  }

  // --- Skin base (oval face area cols 3-12, rows 3-13) ---
  for (let r = 3; r <= 13; r++) {
    for (let c = 3; c <= 12; c++) {
      set(r, c, skinTone);
    }
  }
  // Narrow the face slightly at forehead and chin for oval shape
  for (let c = 3; c <= 4; c++) {
    set(3, c, TRANSPARENT);
    set(13, c, TRANSPARENT);
  }
  for (let c = 11; c <= 12; c++) {
    set(3, c, TRANSPARENT);
    set(13, c, TRANSPARENT);
  }

  // --- Hair ---
  const hairCols = {
    short: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    parted: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    buzz: [4, 5, 6, 7, 8, 9, 10, 11],
    long: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  };
  const hCols = hairCols[hairStyle] ?? hairCols.short;

  // Top hair rows
  const hairTopRows = hairStyle === 'buzz' ? [1, 2] : [0, 1, 2];
  for (const r of hairTopRows) {
    for (const c of hCols) {
      set(r, c, hairColor);
    }
  }

  // Side hair (rows 3-5)
  for (let r = 3; r <= 5; r++) {
    set(r, 3, hairColor);
    set(r, 12, hairColor);
  }

  // Parted style gets a centre part line
  if (hairStyle === 'parted') {
    set(2, 7, skinTone);
    set(2, 8, skinTone);
  }

  // Long hair extends down the sides
  if (hairStyle === 'long') {
    for (let r = 3; r <= 13; r++) {
      set(r, 2, hairColor);
      set(r, 13, hairColor);
    }
  }

  // --- Eyes (row 6, cols 5-6 and 9-10) ---
  // White of eye
  set(6, 5, '#FFFFFF');
  set(6, 6, '#FFFFFF');
  set(6, 9, '#FFFFFF');
  set(6, 10, '#FFFFFF');
  // Pupil
  set(6, 6, eyeColor);
  set(6, 9, eyeColor);
  // Eyebrow (row 5)
  set(5, 5, hairColor);
  set(5, 6, hairColor);
  set(5, 9, hairColor);
  set(5, 10, hairColor);

  // --- Nose (rows 8-10, col 7-8) ---
  set(8, 7, skinTone);
  set(9, 7, '#C4956A');
  set(9, 8, '#C4956A');
  set(10, 7, skinTone);
  set(10, 8, skinTone);

  // --- Mouth (row 11) ---
  set(11, 6, '#8B3A3A');
  set(11, 7, '#C0504F');
  set(11, 8, '#C0504F');
  set(11, 9, '#8B3A3A');

  // --- Beard ---
  if (beard === 'stubble') {
    const stubbleCols = [4, 5, 6, 9, 10, 11];
    for (const c of stubbleCols) {
      set(12, c, '#6B4C3B');
    }
  } else if (beard === 'full') {
    for (let c = 4; c <= 11; c++) {
      set(12, c, hairColor);
      set(13, c, hairColor);
    }
  } else if (beard === 'mustache') {
    for (let c = 6; c <= 9; c++) {
      set(11, c, hairColor);
    }
  }

  return pixels;
}

// Draws the face pixel array (FACE_W x FACE_H) onto ctx at pixel position (x, y).
// scale controls how many canvas pixels each face pixel occupies.
export function drawFace(ctx, x, y, faceParams, scale = 4) {
  ctx.imageSmoothingEnabled = false;
  const pixels = generateFacePixels(faceParams);
  for (let r = 0; r < FACE_H; r++) {
    for (let c = 0; c < FACE_W; c++) {
      const color = pixels[r * FACE_W + c];
      if (color !== null) {
        ctx.fillStyle = color;
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }
}

export { FACE_W, FACE_H };
