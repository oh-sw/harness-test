# QA API 테스트 가이드

> `qa-mode: api` 일 때 따르는 검증 절차.

## 사전 조건
- 테스트 대상 서버가 로컬에서 실행 가능하다고 가정한다.
- 서버 시작 명령은 오케스트레이터 또는 plan.md 에서 전달받는다.

## 헬퍼 사용법

`scripts/qa/api-helper.mjs` 를 import 해서 사용한다. curl 을 직접 쓰거나 fetch 보일러플레이트를 처음부터 작성하지 마라.

```javascript
import { createApiTest } from './scripts/qa/api-helper.mjs';

const t = createApiTest('http://localhost:8080');

// --- 서버 대기 ---
const serverUp = await t.waitForServer('/health', 10, 1000);
if (!serverUp) {
  t.record('Server Health', false, { expected: 'server running', actual: 'connection refused' });
  t.report();
  process.exit(1);
}

// --- 검증 로직 ---

// GET 요청 + 상태 코드 확인
const res1 = await t.get('/api/users');
t.expectStatus('UC1: GET /api/users', res1, 200);

// 응답 body 에 특정 문자열 포함 확인
t.expectBodyContains('UC1: response has users', res1, '"users"');

// JSON 필드 값 확인
t.expectJsonField('UC1: user count', res1, 'data.length', 3);

// POST 요청
const res2 = await t.post('/api/users', { body: { name: 'test', email: 'test@test.com' } });
t.expectStatus('UC2: POST /api/users', res2, 201);

// 커스텀 검증
const res3 = await t.get('/api/users/1');
t.record('UC3: user has email', res3.json?.email === 'test@test.com', {
  expected: 'test@test.com',
  actual: res3.json?.email,
});

// --- 결과 출력 ---
const passed = t.report();
process.exit(passed ? 0 : 1);
```

## 절차

1. 서버 시작 명령을 확인하고 백그라운드로 실행한다.
2. `waitForServer()` 로 서버가 준비될 때까지 대기한다.
3. **`scripts/qa/api-helper.mjs`** 를 사용하는 테스트 스크립트를 작성한다.
   - HTTP 요청, 결과 포맷은 헬퍼가 처리한다.
   - use case 별 검증 로직만 작성한다.
4. `node <스크립트>` 로 실행한다.
5. 헬퍼의 `report()` 출력을 기반으로 PASS/FAIL 을 판정한다.
6. 서버 프로세스를 종료한다.

## 검증 패턴 우선순위
1. **`expectStatus`** — 모든 엔드포인트에 기본 적용.
2. **`expectJsonField`** — 응답 구조가 정해진 경우.
3. **`expectBodyContains`** — JSON 이 아닌 응답이나 느슨한 확인.
4. **`record` (커스텀)** — 위 헬퍼로 커버 안 되는 복합 조건.

## 서버 프로세스 관리
```bash
# 시작 (백그라운드)
node server.js &
SERVER_PID=$!

# 테스트 실행
node qa_test_commit_{N}.mjs
EXIT_CODE=$?

# 종료
kill $SERVER_PID 2>/dev/null
exit $EXIT_CODE
```

서버 시작/종료는 테스트 스크립트 안에 넣지 말고, Bash 에서 관리한다.
