# QA 브라우저 테스트 가이드

> `qa-mode: browser` 일 때 따르는 검증 절차.

## 사전 조건
- Playwright 와 Chromium 이 이미 설치되어 있다고 가정한다.
- 환경변수 `PLAYWRIGHT_BROWSERS_PATH` 가 설정되어 있다.
- **Playwright 설치 여부 확인이나 브라우저 다운로드를 직접 하지 마라.** 이미 되어 있다.

## 헬퍼 사용법

`scripts/qa/browser-helper.mjs` 를 import 해서 사용한다. 테스트 스크립트를 처음부터 작성하지 마라.

```javascript
import { createBrowserTest } from './scripts/qa/browser-helper.mjs';

const t = await createBrowserTest('file:///path/to/index.html');

// --- 검증 로직 ---

// DOM 요소 존재 확인
const el = await t.page.$('#my-element');
t.record('UC1', el !== null, { expected: '#my-element exists', actual: el ? 'found' : 'not found' });

// 텍스트 내용 확인
const text = await t.page.textContent('#result');
t.record('UC2', text === 'expected value', { expected: 'expected value', actual: text });

// 클릭 후 상태 변화
await t.page.click('#button');
await t.page.waitForTimeout(300);
const after = await t.page.textContent('#counter');
t.record('UC3', after === '1', { expected: '1', actual: after });

// Canvas 내용 확인
const canvasData = await t.page.evaluate(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, hasContent: img.data.some(v => v !== 0) };
});
t.record('UC4', canvasData.hasContent, { expected: 'canvas has content', actual: JSON.stringify(canvasData) });

// 콘솔 에러 없음 확인
t.checkNoConsoleErrors();

// --- 결과 출력 ---
const passed = t.report();
await t.cleanup();
process.exit(passed ? 0 : 1);
```

## 절차

1. 테스트 대상 URL 을 파악한다 (`file://` 또는 로컬 서버).
2. **`scripts/qa/browser-helper.mjs`** 를 사용하는 테스트 스크립트를 작성한다.
   - 보일러플레이트(브라우저 실행, 콘솔 수집, 결과 포맷)는 헬퍼가 처리한다.
   - use case 별 검증 로직만 작성한다.
3. `node <스크립트>` 로 실행한다.
4. 헬퍼의 `report()` 출력을 기반으로 PASS/FAIL 을 판정한다.

## 검증 패턴 우선순위
1. **DOM 쿼리** (`page.$`, `page.textContent`, `page.getAttribute`) — 가장 빠르고 안정적.
2. **`page.evaluate`** — DOM 쿼리로 안 되는 경우 (Canvas, Web API 등).
3. **스크린샷** — 시각적 확인이 필요한 경우에만. 자동 판정이 어려우므로 보조 수단.
4. **`waitForTimeout`** 은 최소한으로. `waitForSelector` 나 `waitForFunction` 을 우선한다.
