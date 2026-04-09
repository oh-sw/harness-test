/**
 * QA API Helper — HTTP 기반 API 테스트 유틸리티
 *
 * 사용법:
 *   import { createApiTest } from './api-helper.mjs';
 *
 *   const t = createApiTest('http://localhost:8080');
 *   const res = await t.get('/api/users');
 *   t.expectStatus('GET /api/users', res, 200);
 *   t.expectBodyContains('GET /api/users — has users', res, 'users');
 *   t.report();
 *
 * 환경변수:
 *   API_BASE_URL — 기본 base URL (createApiTest 인자가 우선)
 */

const DEFAULT_BASE = process.env.API_BASE_URL || 'http://localhost:8080';

/**
 * API 테스트 세션을 생성한다.
 * @param {string} [baseUrl]
 * @param {object} [options]
 * @param {number} [options.timeoutMs=10000] - 요청 타임아웃
 * @param {object} [options.defaultHeaders] - 모든 요청에 포함할 기본 헤더
 * @returns {TestSession}
 */
export function createApiTest(baseUrl = DEFAULT_BASE, options = {}) {
  const {
    timeoutMs = 10000,
    defaultHeaders = { 'Content-Type': 'application/json' },
  } = options;

  const results = [];

  /**
   * HTTP 요청을 보낸다.
   * @param {string} method
   * @param {string} path
   * @param {object} [opts]
   * @param {object} [opts.body]
   * @param {object} [opts.headers]
   * @returns {Promise<{status: number, body: string, json: object|null, headers: Headers, elapsed: number}>}
   */
  async function request(method, path, opts = {}) {
    const url = `${baseUrl}${path}`;
    const headers = { ...defaultHeaders, ...opts.headers };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const start = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      const body = await res.text();
      let json = null;
      try { json = JSON.parse(body); } catch {}
      return { status: res.status, body, json, headers: res.headers, elapsed: Date.now() - start };
    } catch (err) {
      return { status: 0, body: err.message, json: null, headers: null, elapsed: Date.now() - start };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /** @param {string} path @param {object} [opts] */
    get: (path, opts) => request('GET', path, opts),
    /** @param {string} path @param {object} [opts] */
    post: (path, opts) => request('POST', path, opts),
    /** @param {string} path @param {object} [opts] */
    put: (path, opts) => request('PUT', path, opts),
    /** @param {string} path @param {object} [opts] */
    patch: (path, opts) => request('PATCH', path, opts),
    /** @param {string} path @param {object} [opts] */
    delete: (path, opts) => request('DELETE', path, opts),

    /**
     * Use case 검증 결과를 기록한다.
     */
    record(name, passed, detail = {}) {
      results.push({ name, passed, ...detail });
    },

    /**
     * 상태 코드를 검증한다.
     */
    expectStatus(ucName, res, expectedStatus) {
      const passed = res.status === expectedStatus;
      this.record(ucName, passed, {
        expected: `status ${expectedStatus}`,
        actual: `status ${res.status}`,
        repro: ucName,
      });
      return passed;
    },

    /**
     * 응답 body 에 문자열이 포함되어 있는지 검증한다.
     */
    expectBodyContains(ucName, res, substring) {
      const passed = res.body.includes(substring);
      this.record(ucName, passed, {
        expected: `body contains "${substring}"`,
        actual: passed ? 'found' : `not found in: ${res.body.slice(0, 200)}`,
      });
      return passed;
    },

    /**
     * 응답 JSON 의 특정 필드 값을 검증한다.
     * @param {string} ucName
     * @param {object} res
     * @param {string} jsonPath - dot notation (예: "data.length", "status")
     * @param {*} expected
     */
    expectJsonField(ucName, res, jsonPath, expected) {
      const actual = jsonPath.split('.').reduce((o, k) => o?.[k], res.json);
      const passed = actual === expected;
      this.record(ucName, passed, {
        expected: `${jsonPath} === ${JSON.stringify(expected)}`,
        actual: `${jsonPath} === ${JSON.stringify(actual)}`,
      });
      return passed;
    },

    /**
     * 서버가 실행 중인지 health check 한다.
     * @param {string} [path="/"] - health check 경로
     * @param {number} [retries=5] - 재시도 횟수
     * @param {number} [intervalMs=1000] - 재시도 간격
     */
    async waitForServer(path = '/', retries = 5, intervalMs = 1000) {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await request('GET', path);
          if (res.status > 0) return true;
        } catch {}
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      return false;
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
  };
}
