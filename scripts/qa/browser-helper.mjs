/**
 * QA Browser Helper — Playwright 기반 브라우저 테스트 유틸리티
 *
 * 사용법:
 *   import { createBrowserTest } from './browser-helper.mjs';
 *
 *   const t = await createBrowserTest('file:///path/to/index.html');
 *   // ... 검증 로직 ...
 *   t.report();          // 결과 출력
 *   await t.cleanup();   // 브라우저 종료
 *
 * 환경변수:
 *   PLAYWRIGHT_BROWSERS_PATH — 브라우저 바이너리 경로 (기본: /tmp/pw-browsers)
 */

import { chromium } from 'playwright';

const BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/tmp/pw-browsers';

/**
 * 브라우저 테스트 세션을 생성한다.
 * @param {string} url - 테스트 대상 URL (file:// 또는 http://)
 * @param {object} [options]
 * @param {boolean} [options.headless=true]
 * @param {number} [options.waitAfterLoad=500] - 페이지 로드 후 대기 ms
 * @param {number} [options.viewportWidth=1280]
 * @param {number} [options.viewportHeight=720]
 * @returns {Promise<TestSession>}
 */
export async function createBrowserTest(url, options = {}) {
  const {
    headless = true,
    waitAfterLoad = 500,
    viewportWidth = 1280,
    viewportHeight = 720,
  } = options;

  const browser = await chromium.launch({
    headless,
    args: ['--allow-file-access-from-files'],
  });
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleLogs = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto(url);
  await page.waitForTimeout(waitAfterLoad);

  const results = [];

  return {
    page,
    context,
    browser,
    consoleErrors,
    consoleLogs,

    /**
     * Use case 검증 결과를 기록한다.
     * @param {string} name - UC 이름 (예: "UC1")
     * @param {boolean} passed
     * @param {object} [detail]
     * @param {string} [detail.expected]
     * @param {string} [detail.actual]
     * @param {string} [detail.repro]
     */
    record(name, passed, detail = {}) {
      results.push({ name, passed, ...detail });
    },

    /**
     * 스크린샷을 저장한다.
     * @param {string} path - 저장 경로
     */
    async screenshot(path) {
      await page.screenshot({ path, fullPage: true });
    },

    /**
     * 콘솔 에러가 없는지 검증하고 UC 로 기록한다.
     * @param {string} [ucName="Console Errors"]
     */
    checkNoConsoleErrors(ucName = 'Console Errors') {
      const passed = consoleErrors.length === 0;
      this.record(ucName, passed, {
        expected: 'no console errors',
        actual: passed ? 'none' : consoleErrors.join('\n'),
      });
      return passed;
    },

    /**
     * 결과를 표준 포맷으로 stdout 에 출력한다.
     */
    report() {
      const lines = [];
      let allPassed = true;

      for (const r of results) {
        if (r.passed) {
          lines.push(`- ${r.name}: PASS`);
        } else {
          allPassed = false;
          lines.push(`- ${r.name}: FAIL`);
          if (r.expected) lines.push(`  - expected: ${r.expected}`);
          if (r.actual) lines.push(`  - actual: ${r.actual}`);
          if (r.repro) lines.push(`  - repro: \`${r.repro}\``);
        }
      }

      lines.push('');
      lines.push(`Verdict: ${allPassed ? 'PASS' : 'FAIL'}`);
      console.log(lines.join('\n'));
      return allPassed;
    },

    /**
     * 브라우저를 종료한다.
     */
    async cleanup() {
      await browser.close();
    },
  };
}
