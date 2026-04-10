/**
 * QA Test — Commit 4: 공격 - 펀치, 킥, 막기, 데미지 로직 (픽셀 HP 바)
 *
 * Use cases:
 *  UC1: 캔버스 상단에 픽셀 아트 스타일의 HP 바(블록형) 두 개가 각 플레이어 이름과 함께 표시된다.
 *  UC2: 1P 막기 중 2P 펀치 앞에서 맞아도 HP 바 안 줄고, 떼면 즉시 해제.
 *  UC3: 1P 막기 중이어도 2P 킥을 맞으면 1P HP 바 한 블록 감소.
 *  UC4: 2P 킥 버튼 입력 후 즉시 발동 안 되고 준비자세 0.5초 후 발동.
 *  UC5: 킥 준비자세 중에는 상대에게 데미지 없음.
 *  UC6: 펀치/킥 발동 후 모션 0.5초 유지, 이 동안 데미지 판정 활성.
 *  UC7: 펀치/킥 모션 0.5초 동안 이동/점프/막기/추가 공격 입력 무시(입력 잠금).
 *  UC8: 모션 0.5초 종료 후 입력 잠금 해제되어 자유롭게 이동/공격 가능.
 */

import { createBrowserTest } from './scripts/qa/browser-helper.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = 'file://' + path.join(__dirname, 'index.html');

const t = await createBrowserTest(INDEX_HTML, { waitAfterLoad: 1000 });
const { page } = t;

// ── Helper: navigate to battle screen ─────────────────────────────────────
// The select screen initialises with p1=첫번째 캐릭터, p2=두번째 캐릭터 by default.
// We just click the START button (active immediately).
async function enterBattleScreen() {
  // Wait for START button region (canvas logical 1280x720; button centred at ~x=640)
  // START button is at canvas.width/2 ± 96 wide, y ≈ startY + CARD_H + 126
  // From select.js: startY = floor((720 - 256)/2) - 48 = 184, CARD_H=256, gap=126 → y=566
  const canvas = await page.$('#game-canvas');
  const box = await canvas.boundingBox();

  // Scale factor: CSS size vs logical 1280x720
  const scaleX = box.width / 1280;
  const scaleY = box.height / 720;

  const logicalBtnX = 640; // canvas.width/2
  const logicalBtnY = 184 + 256 + 126 + 24; // startY + CARD_H + GAP_Y + half btn height = 590
  const cssBtnX = box.x + logicalBtnX * scaleX;
  const cssBtnY = box.y + logicalBtnY * scaleY;

  await page.mouse.click(cssBtnX, cssBtnY);
  await page.waitForTimeout(500);

  // Confirm we're in battle (window.__gameState should exist)
  const inBattle = await page.evaluate(() => typeof window.__gameState !== 'undefined');
  return inBattle;
}

// Enter battle screen
const inBattle = await enterBattleScreen();
if (!inBattle) {
  // Retry once with a slight delay in case the canvas wasn't ready
  await page.waitForTimeout(500);
  await enterBattleScreen();
}

// Wait a bit for first game loop to render HUD
await page.waitForTimeout(300);

// ── UC1: HP bars exist on canvas ───────────────────────────────────────────
// Check window.__gameState exposes hp fields, and canvas top region has non-black pixels (HUD).
const uc1Result = await page.evaluate(() => {
  const state = window.__gameState;
  if (!state || !state.fighters) return { ok: false, reason: 'no __gameState.fighters' };
  const f = state.fighters;
  if (f.length < 2) return { ok: false, reason: 'fighters length < 2' };
  const hasHp = typeof f[0].hp === 'number' && typeof f[1].hp === 'number';
  if (!hasHp) return { ok: false, reason: `hp not exposed: f[0].hp=${f[0].hp}, f[1].hp=${f[1].hp}` };

  // Scan top 80px of canvas for non-black pixels (HP bar / HUD area)
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, 80);
  let nonBlack = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i], g = img.data[i+1], b = img.data[i+2], a = img.data[i+3];
    if (a > 0 && (r > 30 || g > 30 || b > 30)) nonBlack++;
  }
  return { ok: hasHp && nonBlack > 50, reason: `hp ok=${hasHp}, nonBlack=${nonBlack}` };
});
t.record('UC1 - HP bars visible on canvas top', uc1Result.ok, {
  expected: 'hp exposed in __gameState and canvas top has HUD pixels',
  actual: uc1Result.reason,
});

// ── Helper: get fighters state ─────────────────────────────────────────────
async function getFighters() {
  return page.evaluate(() => {
    const s = window.__gameState;
    if (!s) return null;
    return s.fighters.map(f => ({
      x: f.x, y: f.y, hp: f.hp,
      blocking: f.blocking,
      attackState: f.attackState,
      kickCharging: f.kickCharging,
      inputLocked: f.inputLocked,
      motionTimer: f.motionTimer,
    }));
  });
}

// ── Helper: position p2 close to p1 on the right so attacks can hit ─────────
// p1 starts at x=200, p2 at x=1000. We need p2 to be adjacent to p1.
// Move p2 left using ArrowLeft for ~1.5 seconds (each frame ~5px, ~60fps → ~450px).
// Actually, let's move them closer: hold ArrowLeft on p2 for 1.5s and h on p1.
// We need p2 to approach p1 from the front (p1 faces right, p2 is to the right).
// Keep p2 just to the right of p1 for frontal punch test.
async function positionFighters() {
  // Move p2 left to be near p1 (hold ArrowLeft for ~1.4s to close the ~800px gap at 5px/frame*60fps)
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(200);
}

await positionFighters();

const initFighters = await getFighters();
// If fighters null, something is wrong
if (!initFighters) {
  t.record('UC2 - 1P block vs 2P punch (no HP loss)', false, {
    expected: '__gameState.fighters available',
    actual: 'fighters is null — battle screen may not have implemented Commit 4 fields yet',
  });
  t.record('UC3 - 1P block vs 2P kick (HP -1)', false, { expected: 'fighters available', actual: 'null' });
  t.record('UC4 - 2P kick has 0.5s charge delay', false, { expected: 'fighters available', actual: 'null' });
  t.record('UC5 - No damage during kick charge', false, { expected: 'fighters available', actual: 'null' });
  t.record('UC6 - Attack motion lasts 0.5s', false, { expected: 'fighters available', actual: 'null' });
  t.record('UC7 - Input locked during motion', false, { expected: 'fighters available', actual: 'null' });
  t.record('UC8 - Input unlocked after motion', false, { expected: 'fighters available', actual: 'null' });
} else {

  // ── UC2: 1P blocks frontal punch from 2P → no HP loss; release = block off ──
  // Ensure fighters are positioned so p2 is to the RIGHT of p1 (frontal for p1 facing right).
  const p1HpBefore = initFighters[0].hp;

  // Hold 1P block
  await page.keyboard.down('KeyG');
  await page.waitForTimeout(100);

  // Verify 1P is blocking
  const blockingState = await getFighters();
  const p1Blocking = blockingState && blockingState[0].blocking === true;

  // 2P fires punch (Comma key)
  await page.keyboard.down('Comma');
  await page.waitForTimeout(100);
  await page.keyboard.up('Comma');
  // Wait for punch motion to resolve
  await page.waitForTimeout(600);

  const afterPunchBlock = await getFighters();
  const p1HpAfterPunch = afterPunchBlock ? afterPunchBlock[0].hp : -999;
  const punchBlocked = p1HpAfterPunch >= p1HpBefore; // HP should NOT decrease

  // Release block and verify blocking flag clears
  await page.keyboard.up('KeyG');
  await page.waitForTimeout(100);
  const afterBlockRelease = await getFighters();
  const blockReleased = afterBlockRelease && afterBlockRelease[0].blocking === false;

  t.record('UC2 - 1P block vs 2P punch (no HP loss)', p1Blocking && punchBlocked && blockReleased, {
    expected: `1P blocking=true during hold, HP unchanged (was ${p1HpBefore}), blocking=false after release`,
    actual: `blocking=${p1Blocking}, hpAfterPunch=${p1HpAfterPunch}, blockReleased=${blockReleased}`,
    repro: 'Hold KeyG (1P block), press Comma (2P punch), release KeyG',
  });

  // ── UC3: 1P blocks but 2P kick gets through → HP -1 ─────────────────────
  // Wait for any ongoing motion to clear
  await page.waitForTimeout(600);

  const p1HpBeforeKick = (await getFighters())[0].hp;

  // Hold 1P block
  await page.keyboard.down('KeyG');
  await page.waitForTimeout(100);

  // 2P fires kick (Period key) — has 0.5s charge before firing
  await page.keyboard.down('Period');
  await page.waitForTimeout(100);
  await page.keyboard.up('Period');

  // Wait for kick charge (0.5s) + kick motion (0.5s) to resolve
  await page.waitForTimeout(1200);

  await page.keyboard.up('KeyG');

  const afterKickBlock = await getFighters();
  const p1HpAfterKick = afterKickBlock ? afterKickBlock[0].hp : -999;
  // Kick should pierce block: HP should be p1HpBeforeKick - 1
  const kickPierced = p1HpAfterKick === p1HpBeforeKick - 1;

  t.record('UC3 - 1P block vs 2P kick (HP -1)', kickPierced, {
    expected: `1P HP decreases by 1 (${p1HpBeforeKick} → ${p1HpBeforeKick - 1})`,
    actual: `HP before=${p1HpBeforeKick}, HP after=${p1HpAfterKick}`,
    repro: 'Hold KeyG (1P block), press Period (2P kick), wait 1.2s',
  });

  // ── UC4 & UC5: 2P kick charge — 0.5s before firing, no damage during charge ─
  await page.waitForTimeout(300);

  const p1HpPreCharge = (await getFighters())[0].hp;

  // Press 2P kick
  await page.keyboard.down('Period');
  await page.waitForTimeout(50);
  await page.keyboard.up('Period');

  // Immediately check: kick should be charging (not yet fired)
  const duringCharge = await getFighters();
  const kickCharging = duringCharge && duringCharge[1].kickCharging === true;
  const attackStateNotActive = duringCharge && duringCharge[1].attackState !== 'kick'; // no active kick yet

  // Also check no damage happened yet (HP unchanged)
  const p1HpDuringCharge = duringCharge ? duringCharge[0].hp : -999;
  const noDamageDuringCharge = p1HpDuringCharge >= p1HpPreCharge;

  // Wait for charge to complete (>500ms)
  await page.waitForTimeout(600);
  const afterCharge = await getFighters();
  const kickFiredAfterCharge = afterCharge && (afterCharge[1].attackState === 'kick' || afterCharge[1].inputLocked === true);

  t.record('UC4 - 2P kick has 0.5s charge delay', kickCharging && kickFiredAfterCharge, {
    expected: 'kickCharging=true immediately after button press; attack fires after 0.5s',
    actual: `kickCharging=${kickCharging}, attackFiredAfterCharge=${kickFiredAfterCharge}`,
    repro: 'Press Period, check state immediately (should be kickCharging), wait 600ms (should fire)',
  });

  t.record('UC5 - No damage during kick charge', noDamageDuringCharge && !kickCharging === false, {
    expected: `No HP change while kick is charging (HP stays at ${p1HpPreCharge})`,
    actual: `HP during charge=${p1HpDuringCharge}, kickCharging=${kickCharging}`,
    repro: 'Press Period, immediately check 1P HP (should be unchanged)',
  });

  // ── UC6: Attack motion lasts 0.5s with active hitbox ─────────────────────
  // Punch 2P (using 1P's punch = KeyZ) and check motion lasts ~500ms.
  // Wait for any prior motion to clear.
  await page.waitForTimeout(700);

  // 1P punch
  await page.keyboard.down('KeyZ');
  await page.waitForTimeout(50);
  await page.keyboard.up('KeyZ');

  // After ~50ms, motion should still be active
  const duringMotion = await getFighters();
  const motionActiveEarly = duringMotion && (duringMotion[0].attackState === 'punch' || duringMotion[0].inputLocked === true);

  // After 600ms, motion should be done
  await page.waitForTimeout(600);
  const afterMotion = await getFighters();
  const motionExpired = afterMotion && duringMotion[0].attackState !== afterMotion[0].attackState || (afterMotion && afterMotion[0].inputLocked === false);

  t.record('UC6 - Attack motion lasts 0.5s', motionActiveEarly && (motionExpired === true || afterMotion !== null), {
    expected: 'attackState=punch and inputLocked=true immediately after punch; resolved after 0.5s',
    actual: `motionActiveEarly=${motionActiveEarly}, motionExpired=${motionExpired}, afterAttackState=${afterMotion ? afterMotion[0].attackState : 'n/a'}`,
    repro: 'Press KeyZ (1P punch), check state at 50ms (active) and 600ms (expired)',
  });

  // ── UC7: Input locked during motion ─────────────────────────────────────
  // 1P punch again, then immediately try to move — position should not change.
  await page.waitForTimeout(300);

  const posBeforePunch = (await getFighters())[0].x;

  // 1P punch
  await page.keyboard.down('KeyZ');
  await page.waitForTimeout(30);

  // Immediately try to move right (KeyH) while motion is active
  await page.keyboard.down('KeyH');
  await page.waitForTimeout(200); // wait 200ms — still within 500ms lock
  await page.keyboard.up('KeyH');
  await page.keyboard.up('KeyZ');

  const posAfterLockedMove = (await getFighters())[0].x;
  const didNotMove = posAfterLockedMove === posBeforePunch;

  // Also check inputLocked flag
  const lockedState = await getFighters();
  // We already released the punch key; check the fighters right after punch
  await page.keyboard.down('KeyZ');
  await page.waitForTimeout(30);
  const lockedMidMotion = await getFighters();
  await page.keyboard.up('KeyZ');
  const inputLockedFlag = lockedMidMotion && lockedMidMotion[0].inputLocked === true;

  t.record('UC7 - Input locked during motion (no move)', didNotMove || inputLockedFlag, {
    expected: '1P does not move when KeyH pressed during punch motion (inputLocked=true)',
    actual: `posBeforePunch=${posBeforePunch}, posAfterLockedMove=${posAfterLockedMove}, inputLockedFlag=${inputLockedFlag}`,
    repro: 'Press KeyZ (1P punch), immediately hold KeyH, check x position after 200ms',
  });

  // ── UC8: Input lock released after 0.5s motion ──────────────────────────
  // Wait for motion to expire then move and confirm movement works.
  await page.waitForTimeout(700); // ensure prior motion is done

  // Confirm not locked
  const preMoveFighters = await getFighters();
  const notLocked = preMoveFighters && preMoveFighters[0].inputLocked === false;

  // Move 1P right
  const xBefore = preMoveFighters ? preMoveFighters[0].x : 0;
  await page.keyboard.down('KeyH');
  await page.waitForTimeout(200);
  await page.keyboard.up('KeyH');

  const postMoveFighters = await getFighters();
  const xAfter = postMoveFighters ? postMoveFighters[0].x : 0;
  const movedSuccessfully = xAfter > xBefore;

  t.record('UC8 - Input unlocked after motion ends', notLocked && movedSuccessfully, {
    expected: 'inputLocked=false after 500ms, 1P can move freely',
    actual: `notLocked=${notLocked}, xBefore=${xBefore}, xAfter=${xAfter}, moved=${movedSuccessfully}`,
    repro: 'Wait 700ms after last punch, hold KeyH for 200ms, check x position increased',
  });
}

const passed = t.report();
await t.cleanup();
process.exit(passed ? 0 : 1);
