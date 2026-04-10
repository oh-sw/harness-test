/**
 * QA Test — Commit 5: 머리 위 점프 넘기 및 공격 방향 제한
 *
 * Use cases:
 * UC1. 1P가 2P 바로 앞에서 점프(KeyT)하여 2P 머리 위를 넘으면, 공중에서 밀려나지 않고 2P 뒤쪽에 착지한다.
 * UC2. 1P가 2P 왼쪽에서 오른쪽을 바라보며 펀치(KeyZ)를 누르면 사거리 안의 2P에게 데미지가 적용된다.
 * UC3. 1P가 2P 오른쪽에 위치한 채 facingRight=true 상태로 펀치(KeyZ)를 누르면 왼쪽 2P에게 데미지가 없다.
 * UC4. 킥도 바라보는 방향에 있는 상대에게만 데미지가 적용된다 (2P 오른쪽에서 facingRight=true 킥 → 데미지 없음).
 * UC5. 스프라이트가 facingRight 값에 따라 좌우 반전되어 렌더링된다 (1P 오른쪽, 2P 왼쪽 바라봄).
 */

import { createBrowserTest } from './scripts/qa/browser-helper.mjs';

const INDEX_HTML = `file://${process.cwd()}/index.html`;

const t = await createBrowserTest(INDEX_HTML, { waitAfterLoad: 800 });
const { page } = t;

// ── 대전 화면 진입 ─────────────────────────────────────────────────────────
// 선택 화면 로드 시 1P=첫 번째, 2P=두 번째 캐릭터가 이미 기본 선택되어 있음.
// Enter 키로 즉시 대전 진입.
await page.keyboard.press('Enter');
await page.waitForTimeout(1000);

// 대전 화면 진입 확인
const inBattle = await page.evaluate(() => {
  return typeof window.__gameState !== 'undefined' &&
    Array.isArray(window.__gameState.fighters) &&
    window.__gameState.fighters.length === 2;
});

if (!inBattle) {
  t.record('Setup: 대전 화면 진입', false, {
    expected: 'window.__gameState.fighters (length 2) available after Enter key',
    actual: 'not found — game state unavailable',
  });
  t.report();
  await t.cleanup();
  process.exit(1);
}

// ── UC5: facingRight 초기값 확인 ───────────────────────────────────────────
// 게임 초기: 1P facingRight=true, 2P facingRight=false (자동 페이싱 없음, 고정)
const facingInit = await page.evaluate(() => {
  const [p1, p2] = window.__gameState.fighters;
  return { p1: p1.facingRight, p2: p2.facingRight };
});

t.record('UC5: 1P facingRight=true, 2P facingRight=false (초기값)', facingInit.p1 === true && facingInit.p2 === false, {
  expected: 'p1.facingRight=true, p2.facingRight=false',
  actual: JSON.stringify(facingInit),
});

// UC5: 스프라이트 렌더링 반전 — 캔버스 픽셀 패턴으로 확인
// 1P body: x=200, y=520(groundY=600, FIGHTER_H=80), FIGHTER_W=48
// 두 스프라이트의 픽셀 분포가 좌우 비대칭으로 서로 다르면 반전 적용됨을 의미
const spritePixels = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // 1P 스프라이트 영역 좌절반 / 우절반
  const p1Left = ctx.getImageData(200, 520, 24, 80);
  const p1Right = ctx.getImageData(224, 520, 24, 80);
  let p1LeftSum = 0, p1RightSum = 0;
  for (let i = 0; i < p1Left.data.length; i++) p1LeftSum += p1Left.data[i];
  for (let i = 0; i < p1Right.data.length; i++) p1RightSum += p1Right.data[i];

  // 2P 스프라이트 영역 좌절반 / 우절반
  const p2Left = ctx.getImageData(1000, 520, 24, 80);
  const p2Right = ctx.getImageData(1024, 520, 24, 80);
  let p2LeftSum = 0, p2RightSum = 0;
  for (let i = 0; i < p2Left.data.length; i++) p2LeftSum += p2Left.data[i];
  for (let i = 0; i < p2Right.data.length; i++) p2RightSum += p2Right.data[i];

  return { p1LeftSum, p1RightSum, p2LeftSum, p2RightSum };
});

const spritesLookDifferent = spritePixels &&
  (spritePixels.p1LeftSum !== spritePixels.p2LeftSum || spritePixels.p1RightSum !== spritePixels.p2RightSum);

t.record('UC5: 1P와 2P 스프라이트 픽셀 패턴이 다름 (반전 렌더링)', spritesLookDifferent, {
  expected: '서로 다른 픽셀 분포 (facingRight 반전 반영)',
  actual: spritePixels
    ? `p1(L=${spritePixels.p1LeftSum},R=${spritePixels.p1RightSum}), p2(L=${spritePixels.p2LeftSum},R=${spritePixels.p2RightSum})`
    : 'canvas not found',
});

// ── UC2: 1P 왼쪽에서 오른쪽 바라보며 사거리 내 2P 펀치 → 데미지 적용 ────────
// 초기: 1P x=200, 2P x=1000. 1P를 2P 가까이 이동 (MOVE_SPEED=5 * ~60fps * 3s ≈ 900px)
// PUNCH_REACH=80, FIGHTER_W=48이므로 거리 128px 이내면 적중. 3초 이동으로 충분.
await page.keyboard.down('KeyH');
await page.waitForTimeout(3000);
await page.keyboard.up('KeyH');
await page.waitForTimeout(300);

const beforeUC2 = await page.evaluate(() => {
  const [p1, p2] = window.__gameState.fighters;
  return { p1x: p1.x, p2x: p2.x, p1hp: p1.hp, p2hp: p2.hp, p1facing: p1.facingRight };
});

if (beforeUC2.p1x < beforeUC2.p2x) {
  // 1P가 2P 왼쪽 → facingRight=true → 펀치 적중해야 함
  await page.keyboard.press('KeyZ');
  await page.waitForTimeout(700); // 모션 0.5s + 여유

  const afterUC2 = await page.evaluate(() => {
    const [p1, p2] = window.__gameState.fighters;
    return { p1x: p1.x, p2x: p2.x, p2hp: p2.hp };
  });

  const punchHit = afterUC2.p2hp < beforeUC2.p2hp;
  t.record('UC2: 1P 왼쪽에서 facingRight=true 펀치 → 2P 데미지 적용', punchHit, {
    expected: `p2.hp < ${beforeUC2.p2hp} (데미지 1 감소)`,
    actual: `p1x=${afterUC2.p1x}, p2x=${afterUC2.p2x}, p2hp=${afterUC2.p2hp}, p1facing=${beforeUC2.p1facing}`,
  });
} else {
  t.record('UC2: 1P 왼쪽에서 facingRight=true 펀치 → 2P 데미지 적용', false, {
    expected: '1P가 2P 왼쪽에 위치해야 함 (p1x < p2x)',
    actual: `p1x=${beforeUC2.p1x}, p2x=${beforeUC2.p2x} — 이동 실패`,
  });
}

// ── UC1: 1P가 2P 바로 앞에서 점프로 머리 위 넘기 ─────────────────────────────
// 모션 잠금 해제 대기
await page.waitForTimeout(800);

// 현재 1P가 2P 왼쪽에 근접해 있는 상태.
// 점프(KeyT) + 오른쪽 이동(KeyH) 동시 → 2P 위를 넘어감
// JUMP_VELOCITY=-15, GRAVITY=0.8 → 체공 약 37.5프레임 @ 60fps ≈ 625ms
// 넘어가기 위한 이동 여유 포함 1500ms 유지
await page.keyboard.down('KeyT');
await page.waitForTimeout(50);
await page.keyboard.down('KeyH');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyT');
await page.keyboard.up('KeyH');
await page.waitForTimeout(600); // 착지 안정화

const afterJump = await page.evaluate(() => {
  const [p1, p2] = window.__gameState.fighters;
  return { p1x: p1.x, p2x: p2.x, p1y: p1.y, p1vy: p1.vy };
});

const p1Landed = Math.abs(afterJump.p1vy) < 2;
const p1CrossedOver = afterJump.p1x > afterJump.p2x;

t.record('UC1: 점프로 2P 머리 위 넘기 후 뒤쪽 착지', p1CrossedOver && p1Landed, {
  expected: 'p1x > p2x (넘어감), p1vy ≈ 0 (착지)',
  actual: `p1x=${afterJump.p1x}, p2x=${afterJump.p2x}, p1vy=${afterJump.p1vy?.toFixed(2)}`,
});

// ── UC3: 1P가 2P 오른쪽에서 facingRight=true 펀치 → 왼쪽 2P에게 데미지 없음 ──
await page.waitForTimeout(500);

const beforeUC3 = await page.evaluate(() => {
  const [p1, p2] = window.__gameState.fighters;
  return { p1x: p1.x, p2x: p2.x, p2hp: p2.hp, p1facing: p1.facingRight };
});

if (beforeUC3.p1x > beforeUC3.p2x) {
  // 1P가 2P 오른쪽에 있고 facingRight=true → 1P 오른쪽 방향으로 펀치 → 왼쪽 2P에게 미적중
  await page.keyboard.press('KeyZ');
  await page.waitForTimeout(700);

  const afterUC3 = await page.evaluate(() => {
    const [p1, p2] = window.__gameState.fighters;
    return { p1x: p1.x, p2x: p2.x, p2hp: p2.hp };
  });

  const noHit = afterUC3.p2hp >= beforeUC3.p2hp;
  t.record('UC3: 2P 오른쪽+facingRight=true 펀치 → 왼쪽 2P에게 데미지 없음', noHit, {
    expected: `p2.hp 변화 없음 (≥ ${beforeUC3.p2hp})`,
    actual: `p1x=${afterUC3.p1x}, p2x=${afterUC3.p2x}, p2hp=${afterUC3.p2hp}, p1facing=${beforeUC3.p1facing}`,
  });
} else {
  t.record('UC3: 2P 오른쪽+facingRight=true 펀치 → 왼쪽 2P에게 데미지 없음', false, {
    expected: '1P가 2P 오른쪽에 위치해야 함 (p1x > p2x) — UC1 점프 넘기 선행 필요',
    actual: `p1x=${beforeUC3.p1x}, p2x=${beforeUC3.p2x}`,
  });
}

// ── UC4: 1P가 2P 오른쪽에서 facingRight=true 킥 → 왼쪽 2P에게 데미지 없음 ────
await page.waitForTimeout(400);

const beforeUC4 = await page.evaluate(() => {
  const [p1, p2] = window.__gameState.fighters;
  return { p1x: p1.x, p2x: p2.x, p2hp: p2.hp, p1facing: p1.facingRight };
});

if (beforeUC4.p1x > beforeUC4.p2x) {
  // 킥 버튼 누름 (KICK_CHARGE_DURATION=500ms 후 자동 발동)
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(1400); // 차징 0.5s + 모션 0.5s + 여유

  const afterUC4 = await page.evaluate(() => {
    const [p1, p2] = window.__gameState.fighters;
    return { p1x: p1.x, p2x: p2.x, p2hp: p2.hp };
  });

  const noKickHit = afterUC4.p2hp >= beforeUC4.p2hp;
  t.record('UC4: 2P 오른쪽+facingRight=true 킥 → 왼쪽 2P에게 데미지 없음', noKickHit, {
    expected: `p2.hp 변화 없음 (≥ ${beforeUC4.p2hp})`,
    actual: `p1x=${afterUC4.p1x}, p2x=${afterUC4.p2x}, p2hp=${afterUC4.p2hp}, p1facing=${beforeUC4.p1facing}`,
  });
} else {
  t.record('UC4: 2P 오른쪽+facingRight=true 킥 → 왼쪽 2P에게 데미지 없음', false, {
    expected: '1P가 2P 오른쪽에 위치해야 함 (p1x > p2x) — UC1 점프 넘기 선행 필요',
    actual: `p1x=${beforeUC4.p1x}, p2x=${beforeUC4.p2x}`,
  });
}

// ── 결과 출력 ──────────────────────────────────────────────────────────────
const passed = t.report();
await t.cleanup();
process.exit(passed ? 0 : 1);
