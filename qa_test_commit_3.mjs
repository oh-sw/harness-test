import { createBrowserTest } from './scripts/qa/browser-helper.mjs';

const t = await createBrowserTest('file:///Users/dev/IdeaProjects/harness-test/index.html');

// ── Navigate to battle screen ──
// Default selections: characters[0] as 1P, characters[1] as 2P.
// START button is horizontally centered on the 1280px canvas, at y ≈ 82% of 720px canvas height.
const canvas = await t.page.$('canvas');
const canvasBox = await canvas.boundingBox();

await t.page.click('canvas', {
  position: { x: canvasBox.width / 2, y: canvasBox.height * 0.82 },
});
await t.page.waitForTimeout(800);

// ── UC1: 대전 화면 배경/캐릭터 모두 픽셀 아트 스타일로 또렷하게 보인다 ──
const uc1 = await t.page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { hasCanvas: false };
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hasContent = imgData.data.some(v => v !== 0);
  const smoothingOff = ctx.imageSmoothingEnabled === false;
  const correctResolution = canvas.width === 1280 && canvas.height === 720;
  return { hasContent, smoothingOff, correctResolution };
});
t.record(
  'UC1: 대전 화면 픽셀 아트 렌더링',
  uc1.hasContent && uc1.smoothingOff && uc1.correctResolution,
  {
    expected: 'canvas has content, imageSmoothingEnabled=false, resolution 1280x720',
    actual: JSON.stringify(uc1),
  }
);

// ── UC2: 각 파이터의 얼굴은 선택 화면 액자에서 본 해당 캐릭터의 얼굴과 동일하다 ──
// HUD face portraits: P1 at (50,80) 64x64, P2 at (1150,80) 64x64.
// Verify both regions have non-zero pixels and are distinct from each other.
const uc2 = await t.page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { ok: false, reason: 'no canvas' };
  const ctx = canvas.getContext('2d');
  const p1Data = ctx.getImageData(50, 80, 64, 64).data;
  const p2Data = ctx.getImageData(1150, 80, 64, 64).data;
  const p1HasContent = Array.from(p1Data).some(v => v !== 0);
  const p2HasContent = Array.from(p2Data).some(v => v !== 0);
  let diffCount = 0;
  for (let i = 0; i < p1Data.length; i++) {
    if (p1Data[i] !== p2Data[i]) diffCount++;
  }
  return { p1HasContent, p2HasContent, diffCount };
});
t.record(
  'UC2: 각 파이터 얼굴이 선택 화면과 동일한 캐릭터',
  uc2.p1HasContent && uc2.p2HasContent && uc2.diffCount > 0,
  {
    expected: 'P1 and P2 face portrait regions have content and are visually distinct',
    actual: JSON.stringify(uc2),
  }
);

// ── UC3: 1P 가 h 를 누르면 오른쪽으로 이동한다 ──
const p1xBefore = await t.page.evaluate(() => window.__gameState?.fighters?.[0]?.x ?? null);

await t.page.keyboard.down('KeyH');
await t.page.waitForTimeout(300);
await t.page.keyboard.up('KeyH');
await t.page.waitForTimeout(100);

const p1xAfter = await t.page.evaluate(() => window.__gameState?.fighters?.[0]?.x ?? null);

t.record(
  'UC3: 1P KeyH → 오른쪽 이동',
  p1xBefore !== null && p1xAfter !== null && p1xAfter > p1xBefore,
  {
    expected: `P1 x increases after pressing KeyH (was ${p1xBefore})`,
    actual: `P1 x after = ${p1xAfter}`,
  }
);

// ── UC4: 2P 가 ↑ 를 누르면 점프했다가 착지한다 ──
const p2GroundY = await t.page.evaluate(() => window.__gameState?.fighters?.[1]?.y ?? null);

await t.page.keyboard.down('ArrowUp');
await t.page.waitForTimeout(100);
await t.page.keyboard.up('ArrowUp');

// Sample vy shortly after jump is triggered
const p2MidAir = await t.page.evaluate(() => ({
  y: window.__gameState?.fighters?.[1]?.y ?? null,
  vy: window.__gameState?.fighters?.[1]?.vy ?? null,
}));

// Wait for landing
await t.page.waitForTimeout(900);
const p2LandedY = await t.page.evaluate(() => window.__gameState?.fighters?.[1]?.y ?? null);

const p2WasAirborne = p2MidAir.vy !== null && p2MidAir.vy !== 0;
const p2ReturnedToGround = p2LandedY !== null && p2GroundY !== null && Math.abs(p2LandedY - p2GroundY) < 5;

t.record(
  'UC4: 2P ArrowUp → 점프 후 착지',
  p2WasAirborne && p2ReturnedToGround,
  {
    expected: 'P2 vy != 0 after jump, then y returns to ground level',
    actual: `groundY=${p2GroundY}, midAir=${JSON.stringify(p2MidAir)}, landedY=${p2LandedY}`,
  }
);

// ── UC5: 1P h 누른 상태에서 2P ↑ 누르면 두 입력이 서로 간섭하지 않는다 ──
const p1x5Before = await t.page.evaluate(() => window.__gameState?.fighters?.[0]?.x ?? null);

// Hold 1P right
await t.page.keyboard.down('KeyH');
await t.page.waitForTimeout(80);

// 2P jumps while 1P is still held
await t.page.keyboard.down('ArrowUp');
await t.page.waitForTimeout(100);
await t.page.keyboard.up('ArrowUp');

// Sample immediately: 1P should have moved right, 2P should have non-zero vy
const uc5State = await t.page.evaluate(() => ({
  p1x: window.__gameState?.fighters?.[0]?.x ?? null,
  p2vy: window.__gameState?.fighters?.[1]?.vy ?? null,
}));

await t.page.keyboard.up('KeyH');
await t.page.waitForTimeout(900); // let 2P land

const p1MovedRight = uc5State.p1x !== null && p1x5Before !== null && uc5State.p1x > p1x5Before;
const p2JumpedSimul = uc5State.p2vy !== null && uc5State.p2vy !== 0;

t.record(
  'UC5: 1P 이동 + 2P 점프 동시 입력 (간섭 없음)',
  p1MovedRight && p2JumpedSimul,
  {
    expected: 'P1 x increases AND P2 vy != 0 at the same time',
    actual: `P1 x: ${p1x5Before}→${uc5State.p1x} (moved=${p1MovedRight}), P2 vy=${uc5State.p2vy} (jumped=${p2JumpedSimul})`,
  }
);

// ── UC6: 한글 입력 모드에서 1P가 'ㅗ'(h 키 위치)를 누르면 오른쪽으로 이동한다 ──
const p1x6Before = await t.page.evaluate(() => window.__gameState?.fighters?.[0]?.x ?? null);

// Korean IME: key='ㅗ' but code='KeyH' — game must use event.code
await t.page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH', key: 'ㅗ', bubbles: true }));
});
await t.page.waitForTimeout(300);
await t.page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyH', key: 'ㅗ', bubbles: true }));
});
await t.page.waitForTimeout(100);

const p1x6After = await t.page.evaluate(() => window.__gameState?.fighters?.[0]?.x ?? null);

t.record(
  'UC6: 한글 모드 1P ㅗ(KeyH) → 오른쪽 이동',
  p1x6Before !== null && p1x6After !== null && p1x6After > p1x6Before,
  {
    expected: `P1 x increases when KeyboardEvent code='KeyH' key='ㅗ' (was ${p1x6Before})`,
    actual: `P1 x after = ${p1x6After}`,
  }
);

// ── UC7: 한글 입력 모드에서 2P의 방향키(ArrowUp)는 영문 모드와 동일하게 동작한다 ──
// Arrow keys have the same code in both IME modes; dispatch explicitly to confirm code-based handling.
const p2vy7Before = await t.page.evaluate(() => window.__gameState?.fighters?.[1]?.vy ?? null);

await t.page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp', bubbles: true }));
});
await t.page.waitForTimeout(100);
await t.page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', key: 'ArrowUp', bubbles: true }));
});

const p2vy7After = await t.page.evaluate(() => window.__gameState?.fighters?.[1]?.vy ?? null);
await t.page.waitForTimeout(900); // let 2P land

t.record(
  'UC7: 한글 모드 2P ArrowUp → 점프 동작',
  p2vy7After !== null && p2vy7After !== 0,
  {
    expected: 'P2 vy != 0 after ArrowUp dispatched with explicit code (Korean IME simulation)',
    actual: `P2 vy before=${p2vy7Before}, after=${p2vy7After}`,
  }
);

const passed = t.report();
await t.cleanup();
process.exit(passed ? 0 : 1);
