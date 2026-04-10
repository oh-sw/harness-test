/**
 * QA Test — Commit 5: 액션별 픽셀 아트 스프라이트 모션
 *
 * Use cases:
 * UC1. 1P가 막기(g)를 누르면 방어 자세가 되어 idle과 시각적으로 구분된다.
 * UC2. 1P가 펀치(z)를 누르면 주먹을 내미는 모션이 나오고 0.5초 후 idle로 복귀한다.
 * UC3. 2P가 킥(.)을 누르면 킥 준비 자세를 취하고 0.5초 후 킥 발동 모션으로 전환된다.
 * UC4. 킥 발동 모션은 킥 준비 자세와 시각적으로 구분된다.
 * UC5. 모든 액션 모션이 끝나면 캐릭터가 idle로 복귀한다.
 *
 * 스냅샷 좌표 근거:
 *   1P body: x=200, y=520, 48x80 → snapshot(180, 500, 100, 100)
 *   2P body: x=1000, y=520, 48x80 → snapshot(980, 500, 100, 100)
 */

import { createBrowserTest } from './scripts/qa/browser-helper.mjs';

const INDEX_HTML = 'file:///Users/dev/IdeaProjects/harness-test/index.html';

const t = await createBrowserTest(INDEX_HTML, { waitAfterLoad: 800 });
const { page } = t;

// ── 대전 화면 진입 ──────────────────────────────────────────────────────────
// 기본으로 p1=CHARACTERS[0], p2=CHARACTERS[1]이 선택되어 있으므로 Enter만 누른다.
await page.keyboard.press('Enter');
await page.waitForTimeout(800);

// 대전 화면 진입 확인
const gameStateExists = await page.evaluate(() => {
  return typeof window.__gameState !== 'undefined' &&
    Array.isArray(window.__gameState.fighters) &&
    window.__gameState.fighters.length >= 2;
});

if (!gameStateExists) {
  t.record('GameState', false, {
    expected: 'window.__gameState.fighters[0..1] available after Enter',
    actual: 'not found',
    repro: 'Press Enter on character select screen',
  });
  t.report();
  await t.cleanup();
  process.exit(1);
}

// ── 캔버스 스냅샷 헬퍼 ────────────────────────────────────────────────────
// 지정 영역의 픽셀 합계를 반환 (변화 감지용)
async function getCanvasSnapshot(x, y, w, h) {
  return page.evaluate(({ x, y, w, h }) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(x, y, w, h);
    let sum = 0;
    for (let i = 0; i < img.data.length; i++) sum += img.data[i];
    return sum;
  }, { x, y, w, h });
}

// ── UC1: 1P 막기 — 방어 자세가 idle과 시각적으로 구분 ──────────────────────

await page.waitForTimeout(200);
const p1IdleSnapshot = await getCanvasSnapshot(180, 500, 100, 100);

// g 키 누름 (막기 유지)
await page.keyboard.down('KeyG');
await page.waitForTimeout(200);

const p1BlockingState = await page.evaluate(() => window.__gameState?.fighters?.[0]?.blocking);
const p1BlockSnapshot = await getCanvasSnapshot(180, 500, 100, 100);

await page.keyboard.up('KeyG');
await page.waitForTimeout(100);

t.record('UC1: 1P 막기 — blocking 상태', p1BlockingState === true, {
  expected: 'fighters[0].blocking === true',
  actual: `fighters[0].blocking = ${p1BlockingState}`,
  repro: 'KeyG down → check window.__gameState.fighters[0].blocking',
});
t.record('UC1: 1P 막기 — 방어 자세 시각적 변화', p1IdleSnapshot !== p1BlockSnapshot, {
  expected: '1P body snapshot differs between idle and blocking',
  actual: `idle.sum=${p1IdleSnapshot}, block.sum=${p1BlockSnapshot}`,
  repro: 'KeyG down → getCanvasSnapshot(180,500,100,100) vs idle snapshot',
});

// ── UC2: 1P 펀치 — 주먹 내미는 모션 + 0.5초 후 idle 복귀 ───────────────────

await page.waitForTimeout(200);
const p1IdleBeforePunch = await getCanvasSnapshot(180, 500, 100, 100);

await page.keyboard.press('KeyZ');
await page.waitForTimeout(100);

const p1PunchState = await page.evaluate(() => window.__gameState?.fighters?.[0]?.attackState);
const p1PunchSnapshot = await getCanvasSnapshot(180, 500, 100, 100);

// 0.5초 이상 대기 후 idle 복귀 확인
await page.waitForTimeout(600);
const p1AfterPunchState = await page.evaluate(() => window.__gameState?.fighters?.[0]?.attackState);
const p1AfterPunchSnapshot = await getCanvasSnapshot(180, 500, 100, 100);

t.record('UC2: 1P 펀치 — attackState=punch', p1PunchState === 'punch', {
  expected: `fighters[0].attackState === 'punch'`,
  actual: `fighters[0].attackState = ${p1PunchState}`,
  repro: 'KeyZ press → check attackState immediately after',
});
t.record('UC2: 1P 펀치 — 모션 시각적 변화', p1IdleBeforePunch !== p1PunchSnapshot, {
  expected: 'punch snapshot differs from idle',
  actual: `idle.sum=${p1IdleBeforePunch}, punch.sum=${p1PunchSnapshot}`,
  repro: 'KeyZ press → compare canvas snapshot vs idle',
});
t.record('UC2: 1P 펀치 — 0.5초 후 idle 복귀 (state)', p1AfterPunchState === 'idle', {
  expected: `fighters[0].attackState === 'idle' after 600ms`,
  actual: `fighters[0].attackState = ${p1AfterPunchState}`,
  repro: 'KeyZ press → wait 600ms → check attackState',
});
t.record('UC2: 1P 펀치 — 0.5초 후 idle 복귀 (visual)', p1AfterPunchSnapshot !== p1PunchSnapshot, {
  expected: 'snapshot after punch differs from punch snapshot (returned to idle)',
  actual: `punch.sum=${p1PunchSnapshot}, afterPunch.sum=${p1AfterPunchSnapshot}`,
  repro: 'KeyZ press → wait 600ms → compare snapshots',
});

// ── UC3 & UC4: 2P 킥 — 준비 자세 → 킥 발동 모션으로 전환 ──────────────────

await page.waitForTimeout(200);
const p2IdleSnapshot = await getCanvasSnapshot(980, 500, 100, 100);

await page.keyboard.press('Period');
await page.waitForTimeout(100);

const p2KickChargeData = await page.evaluate(() => ({
  attackState: window.__gameState?.fighters?.[1]?.attackState,
  kickCharging: window.__gameState?.fighters?.[1]?.kickCharging,
}));
const p2KickChargeSnapshot = await getCanvasSnapshot(980, 500, 100, 100);

// UC3: 킥 누르면 준비 자세 (kickCharging === true)
const uc3ChargingOk = p2KickChargeData.kickCharging === true;
const uc3VisualOk = p2IdleSnapshot !== p2KickChargeSnapshot;

t.record('UC3: 2P 킥 — 준비 자세 상태 (kickCharging)', uc3ChargingOk, {
  expected: 'fighters[1].kickCharging === true',
  actual: `kickCharging=${p2KickChargeData.kickCharging}, attackState=${p2KickChargeData.attackState}`,
  repro: 'Period press → check fighters[1].kickCharging',
});
t.record('UC3: 2P 킥 — 준비 자세 시각적 변화', uc3VisualOk, {
  expected: 'kickCharge snapshot differs from idle',
  actual: `idle.sum=${p2IdleSnapshot}, kickCharge.sum=${p2KickChargeSnapshot}`,
  repro: 'Period press → compare canvas snapshot vs idle (980,500,100,100)',
});

// 0.5초 대기 → 킥 발동 모션 전환 확인
await page.waitForTimeout(550);
const p2KickFireState = await page.evaluate(() => window.__gameState?.fighters?.[1]?.attackState);
const p2KickFireSnapshot = await getCanvasSnapshot(980, 500, 100, 100);

t.record('UC4: 킥 발동 — attackState=kick', p2KickFireState === 'kick', {
  expected: `fighters[1].attackState === 'kick' after 550ms`,
  actual: `fighters[1].attackState = ${p2KickFireState}`,
  repro: 'Period press → wait 550ms → check attackState',
});
t.record('UC4: 킥 발동 — 준비 자세와 시각적으로 구분', p2KickChargeSnapshot !== p2KickFireSnapshot, {
  expected: 'kick fire snapshot differs from kickCharge snapshot',
  actual: `kickCharge.sum=${p2KickChargeSnapshot}, kickFire.sum=${p2KickFireSnapshot}`,
  repro: 'Period press → snapshot at 100ms vs snapshot at 650ms',
});

// ── UC5: 킥 발동 모션 종료 후 idle 복귀 ────────────────────────────────────

// 킥 발동 모션 0.5초 추가 대기
await page.waitForTimeout(600);
const p2AfterKickState = await page.evaluate(() => ({
  attackState: window.__gameState?.fighters?.[1]?.attackState,
  kickCharging: window.__gameState?.fighters?.[1]?.kickCharging,
}));
const p2AfterKickSnapshot = await getCanvasSnapshot(980, 500, 100, 100);

t.record('UC5: 킥 종료 후 2P idle 복귀 (state)', p2AfterKickState.attackState === 'idle' && p2AfterKickState.kickCharging === false, {
  expected: `fighters[1].attackState === 'idle' && kickCharging === false`,
  actual: `attackState=${p2AfterKickState.attackState}, kickCharging=${p2AfterKickState.kickCharging}`,
  repro: 'Period press → wait ~1250ms total → check fighters[1]',
});
t.record('UC5: 킥 종료 후 2P idle 복귀 (visual)', p2AfterKickSnapshot !== p2KickFireSnapshot, {
  expected: 'snapshot after kick cycle differs from kick-fire snapshot (back to idle)',
  actual: `kickFire.sum=${p2KickFireSnapshot}, afterKick.sum=${p2AfterKickSnapshot}`,
  repro: 'Period press → wait ~1250ms total → compare snapshots',
});

// ── 결과 ────────────────────────────────────────────────────────────────────
const passed = t.report();
await t.cleanup();
process.exit(passed ? 0 : 1);
