/**
 * QA Test — Commit 2: 캐릭터 선택 화면 해상도 업스케일 + 중복 선택 방지
 *
 * UC1: 픽셀 아트 액자 5개 표시 (얼굴 픽셀 + 이름표 픽셀)
 * UC2: 캔버스 논리 해상도 1280x720 + 안티 에일리어싱 비활성화
 * UC3: 결정적 랜덤 — 새로고침 후 동일 픽셀 체크섬
 * UC4: 1P/2P 선택 테두리 강조 + START 버튼 game:start 이벤트
 * UC5: 중복 선택 시 경고 모달 표시 + 선택 미반영
 * UC6: 경고 모달 3초 후 자동 소멸 + 모달 중 다른 캐릭터 선택 가능
 */

import { createBrowserTest } from './scripts/qa/browser-helper.mjs';

// ── 레이아웃 상수 (src/screens/select.js 와 동일 계산) ─────────────────────
const CANVAS_W = 1280;
const CANVAS_H = 720;
const CARD_W   = 192;
const CARD_H   = 256;
const CARD_GAP = 32;
const CARD_STEP = CARD_W + CARD_GAP;           // 224
const N_CHARS   = 5;
const TOTAL_W   = N_CHARS * CARD_W + (N_CHARS - 1) * CARD_GAP; // 1088
const START_X   = Math.floor((CANVAS_W - TOTAL_W) / 2);         // 96
const START_Y   = Math.floor((CANVAS_H - CARD_H)  / 2) - 48;    // 184
const FACE_SCALE    = 8;
const FACE_W        = 16;  // src/art/face.js FACE_W
const FACE_OFFSET_X = (CARD_W - FACE_W * FACE_SCALE) / 2; // 32
const FACE_OFFSET_Y = 12;
const FACE_RENDER_W = FACE_W * FACE_SCALE;     // 128
const FACE_RENDER_H = FACE_RENDER_W;           // 128

// START 버튼 레이아웃
const START_BTN_W = 192;
const START_BTN_H = 48;
const START_BTN_X = Math.floor(CANVAS_W / 2 - START_BTN_W / 2); // 544
const START_BTN_Y = START_Y + CARD_H + 28;                       // 468

// 선택 강조색 (tolerance 20으로 근사 비교)
const COLOR_1P = { r: 0x3A, g: 0x6E, b: 0xFF }; // #3A6EFF
const COLOR_2P = { r: 0xFF, g: 0x3A, b: 0x3A }; // #FF3A3A

// 경고 모달 레이아웃 (select.js 동일)
const MODAL_W = 560;
const MODAL_H = 96;
const MODAL_X = Math.floor((CANVAS_W - MODAL_W) / 2); // 360
const MODAL_Y = Math.floor((CANVAS_H - MODAL_H) / 2); // 312

// ── 헬퍼 함수 ──────────────────────────────────────────────────────────────

/**
 * 캔버스 논리 좌표 (lx, ly) → CSS 픽셀로 변환 후 마우스 클릭
 */
async function clickCanvas(page, lx, ly, button = 'left') {
  const info = await page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, cssW: r.width, cssH: r.height, logW: c.width, logH: c.height };
  });
  const cx = info.left + lx * (info.cssW / info.logW);
  const cy = info.top  + ly * (info.cssH / info.logH);
  await page.mouse.click(cx, cy, { button });
}

/** 캔버스에서 1픽셀 샘플 반환 */
async function samplePx(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const d = document.getElementById('game-canvas').getContext('2d').getImageData(x, y, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2] };
  }, { x, y });
}

/** 두 색상이 tolerance 범위 안에 있는지 */
function near(a, target, tol = 20) {
  return Math.abs(a.r - target.r) <= tol &&
         Math.abs(a.g - target.g) <= tol &&
         Math.abs(a.b - target.b) <= tol;
}

/** 지정 영역에 어둡지 않은 픽셀이 하나라도 있는지 */
async function regionHasContent(page, x, y, w, h) {
  return page.evaluate(({ x, y, w, h }) => {
    const d = document.getElementById('game-canvas').getContext('2d').getImageData(x, y, w, h).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0 && (d[i] > 15 || d[i + 1] > 15 || d[i + 2] > 15)) return true;
    }
    return false;
  }, { x, y, w, h });
}

/** 전체 캔버스 픽셀 합계 (결정적 랜덤 검증용) */
async function canvasChecksum(page) {
  return page.evaluate(() => {
    const d = document.getElementById('game-canvas').getContext('2d').getImageData(0, 0, 1280, 720).data;
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[i];
    return s;
  });
}

// ── 테스트 세션 시작 ────────────────────────────────────────────────────────

const t = await createBrowserTest(
  'file:///Users/dev/IdeaProjects/harness-test/index.html',
  { waitAfterLoad: 800 }
);

// ── UC2: 캔버스 해상도 및 안티 에일리어싱 ────────────────────────────────────
{
  const info = await t.page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    const ctx = c.getContext('2d');
    return { w: c.width, h: c.height, smooth: ctx.imageSmoothingEnabled };
  });

  t.record('UC2-canvas-1280x720', info.w === 1280 && info.h === 720, {
    expected: '1280x720',
    actual: `${info.w}x${info.h}`,
  });

  t.record('UC2-no-antialiasing', info.smooth === false, {
    expected: 'imageSmoothingEnabled=false',
    actual: `imageSmoothingEnabled=${info.smooth}`,
  });
}

// ── UC1: 5개 액자 얼굴 픽셀 콘텐츠 ──────────────────────────────────────────
{
  const missingFace = [];
  for (let i = 0; i < N_CHARS; i++) {
    const fx = START_X + i * CARD_STEP + FACE_OFFSET_X;
    const fy = START_Y + FACE_OFFSET_Y;
    const ok = await regionHasContent(t.page, fx, fy, FACE_RENDER_W, FACE_RENDER_H);
    if (!ok) missingFace.push(i);
  }
  t.record('UC1-five-face-regions', missingFace.length === 0, {
    expected: '5개 카드 얼굴 영역에 픽셀 콘텐츠 존재',
    actual: missingFace.length === 0 ? '모두 존재' : `없는 카드 인덱스: ${missingFace.join(', ')}`,
  });
}

// UC1: 5개 카드 이름 레이블 영역에 픽셀 콘텐츠
{
  const missingLabel = [];
  for (let i = 0; i < N_CHARS; i++) {
    const lx = START_X + i * CARD_STEP + 10;
    const ly = START_Y + CARD_H - 52;
    const ok = await regionHasContent(t.page, lx, ly, CARD_W - 20, 40);
    if (!ok) missingLabel.push(i);
  }
  t.record('UC1-five-name-labels', missingLabel.length === 0, {
    expected: '5개 카드 이름 레이블 영역에 픽셀 콘텐츠 존재',
    actual: missingLabel.length === 0 ? '모두 존재' : `없는 카드 인덱스: ${missingLabel.join(', ')}`,
  });
}

// ── UC3: 결정적 랜덤 (새로고침 후 동일 픽셀 체크섬) ─────────────────────────
{
  const sum1 = await canvasChecksum(t.page);
  await t.page.reload();
  await t.page.waitForTimeout(800);
  const sum2 = await canvasChecksum(t.page);

  t.record('UC3-deterministic', sum1 === sum2 && sum1 > 0, {
    expected: '새로고침 전후 캔버스 픽셀 합계 동일',
    actual: `sum1=${sum1}, sum2=${sum2}, match=${sum1 === sum2}`,
  });
}

// ── UC4: 1P/2P 테두리 강조 ─────────────────────────────────────────────────
// 재로드 후 기본 상태: p1=현재(idx 0), p2=재현(idx 1)
{
  // 카드 0 왼쪽 테두리 안 (프레임 두께 4px → x+2)
  const borderCard0 = await samplePx(t.page, START_X + 2, START_Y + CARD_H / 2);
  t.record('UC4-p1-blue-border', near(borderCard0, COLOR_1P), {
    expected: `카드0 테두리 ≈ #3A6EFF (1P 파랑)`,
    actual: `rgb(${borderCard0.r},${borderCard0.g},${borderCard0.b})`,
  });

  // 카드 1 왼쪽 테두리 안
  const borderCard1 = await samplePx(t.page, START_X + CARD_STEP + 2, START_Y + CARD_H / 2);
  t.record('UC4-p2-red-border', near(borderCard1, COLOR_2P), {
    expected: `카드1 테두리 ≈ #FF3A3A (2P 빨강)`,
    actual: `rgb(${borderCard1.r},${borderCard1.g},${borderCard1.b})`,
  });
}

// UC4: 클릭으로 1P 선택 변경 → 새 카드에 파란 테두리
{
  // 1P가 카드 2 (상우) 클릭
  await clickCanvas(t.page, START_X + 2 * CARD_STEP + CARD_W / 2, START_Y + CARD_H / 2, 'left');
  await t.page.waitForTimeout(200);

  const borderCard2 = await samplePx(t.page, START_X + 2 * CARD_STEP + 2, START_Y + CARD_H / 2);
  t.record('UC4-click-changes-p1-border', near(borderCard2, COLOR_1P), {
    expected: '카드2 선택 후 1P 파란 테두리',
    actual: `rgb(${borderCard2.r},${borderCard2.g},${borderCard2.b})`,
  });

  // 원상복구: 1P를 카드 0 (현재) 으로
  await clickCanvas(t.page, START_X + CARD_W / 2, START_Y + CARD_H / 2, 'left');
  await t.page.waitForTimeout(200);
}

// UC4: START 버튼 클릭 → game:start 이벤트 발화
{
  // 이벤트 리스너를 먼저 등록
  await t.page.evaluate(() => {
    window.__startDetail = null;
    document.getElementById('game-canvas').addEventListener('game:start', (e) => {
      window.__startDetail = e.detail;
    }, { once: true });
  });

  await clickCanvas(t.page, START_BTN_X + START_BTN_W / 2, START_BTN_Y + START_BTN_H / 2, 'left');
  await t.page.waitForTimeout(400);

  const detail = await t.page.evaluate(() => window.__startDetail);
  t.record('UC4-start-event-fired', detail !== null, {
    expected: 'game:start 이벤트 발화',
    actual: detail !== null ? `발화됨, detail=${JSON.stringify(detail)}` : '이벤트 없음',
  });

  // p1=현재(hyunjae), p2=재현(jaehyun) 이어야 함
  t.record('UC4-start-event-detail', detail?.p1 === 'hyunjae' && detail?.p2 === 'jaehyun', {
    expected: '{ p1: "hyunjae", p2: "jaehyun" }',
    actual: JSON.stringify(detail),
  });
}

// ── UC5/UC6: 중복 선택 경고 모달 ─────────────────────────────────────────────
// 초기 상태 (p1=현재, p2=재현) 복구
await t.page.reload();
await t.page.waitForTimeout(800);

// UC5: 2P가 현재(카드 0, 1P 선택 중)를 우클릭 → 중복 → 경고 모달
{
  await clickCanvas(t.page, START_X + CARD_W / 2, START_Y + CARD_H / 2, 'right');
  await t.page.waitForTimeout(300);

  // 모달 배경 (#000000) 확인
  const bgPx = await samplePx(t.page, MODAL_X + 20, MODAL_Y + MODAL_H / 2);
  const modalBgBlack = bgPx.r < 20 && bgPx.g < 20 && bgPx.b < 20;

  // 모달 테두리 (#FF3A3A) 확인 — 상단 중앙 픽셀
  const borderPx = await samplePx(t.page, CANVAS_W / 2, MODAL_Y + 4);
  const modalBorderRed = borderPx.r > 200 && borderPx.g < 80 && borderPx.b < 80;

  t.record('UC5-modal-appears', modalBgBlack && modalBorderRed, {
    expected: '경고 모달 표시 (검정 배경 + 빨간 테두리)',
    actual: `bg=rgb(${bgPx.r},${bgPx.g},${bgPx.b}) border=rgb(${borderPx.r},${borderPx.g},${borderPx.b})`,
  });

  // UC5: p2 선택이 반영되지 않아야 함 — 카드 1 (재현) 여전히 2P 빨강
  const card1Border = await samplePx(t.page, START_X + CARD_STEP + 2, START_Y + CARD_H / 2);
  t.record('UC5-selection-not-applied', near(card1Border, COLOR_2P), {
    expected: '카드1 (재현) 여전히 2P 빨강 테두리',
    actual: `rgb(${card1Border.r},${card1Border.g},${card1Border.b})`,
  });
}

// UC6: 모달 표시 중 다른 캐릭터 선택 가능
{
  // 2P가 카드 2 (상우) 우클릭 — 모달이 떠 있는 상태
  await clickCanvas(t.page, START_X + 2 * CARD_STEP + CARD_W / 2, START_Y + CARD_H / 2, 'right');
  await t.page.waitForTimeout(300);

  const card2Border = await samplePx(t.page, START_X + 2 * CARD_STEP + 2, START_Y + CARD_H / 2);
  t.record('UC6-select-during-modal', near(card2Border, COLOR_2P), {
    expected: '모달 중 카드2 (상우) 2P 선택 가능 → 빨간 테두리',
    actual: `rgb(${card2Border.r},${card2Border.g},${card2Border.b})`,
  });
}

// UC6: 경고 모달 3초 후 자동 소멸
// 새로운 중복 선택으로 타이머를 리셋한 뒤 (이미 위에서 ~600ms 경과)
// 다시 중복 시도하여 깔끔하게 타이머를 재시작
{
  // 현재 p1=현재(0), p2=상우(2) 상태
  // 2P가 현재(카드 0)를 선택 시도 → 중복 → 새 모달
  await clickCanvas(t.page, START_X + CARD_W / 2, START_Y + CARD_H / 2, 'right');
  await t.page.waitForTimeout(300);

  // 모달이 떠 있는지 확인
  const borderBefore = await samplePx(t.page, CANVAS_W / 2, MODAL_Y + 4);
  const modalShown = borderBefore.r > 200 && borderBefore.g < 80 && borderBefore.b < 80;

  // 3.2초 대기 (3초 타이머 + 여유 200ms)
  await t.page.waitForTimeout(3200);

  // 모달 테두리 자리가 빨간색이 아니어야 함
  const borderAfter = await samplePx(t.page, CANVAS_W / 2, MODAL_Y + 4);
  const modalDismissed = !(borderAfter.r > 200 && borderAfter.g < 80 && borderAfter.b < 80);

  t.record('UC6-modal-auto-dismiss', modalShown && modalDismissed, {
    expected: '경고 모달이 3초 후 자동 소멸',
    actual: `표시됨=${modalShown}, 3.2초 후 소멸=${modalDismissed} (after: rgb(${borderAfter.r},${borderAfter.g},${borderAfter.b}))`,
  });
}

// ── 콘솔 에러 없음 ────────────────────────────────────────────────────────────
t.checkNoConsoleErrors();

// ── 결과 출력 및 종료 ─────────────────────────────────────────────────────────
const passed = t.report();
await t.cleanup();
process.exit(passed ? 0 : 1);
