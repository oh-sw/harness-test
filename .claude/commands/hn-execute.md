---
description: plan.md 의 특정 커밋을 programmer → qa 워크플로우로 실행한다.
argument-hint: <커밋 번호>
---

대상 커밋 번호: $ARGUMENTS

너는 이 워크플로우의 **오케스트레이터**다. 직접 코드를 작성하지 말고, 아래 순서대로 서브에이전트를 호출하라.
**동시에 두 개 이상의 에이전트를 실행하지 마라. 항상 하나씩 순차 실행한다.**

---

## 0. 로그 초기화

워크플로우 시작 시 **가장 먼저** 로그 파일을 생성한다.

1. `mkdir -p agent_logs` 를 **단독 Bash 명령**으로 실행한다. (`&&` 로 다른 명령과 연결하지 마라)
2. 로그 파일명: `agent_logs/YYYYMMDD-HHmmss-execute.log` (현재 시각 기준).
3. 아래 헤더를 **별도 Bash 명령**으로 기록한다 (`echo "..." > agent_logs/...`):

```
=====================================
[hn-execute] Session Start
Commit: <커밋 번호>
Time: <ISO 8601 타임스탬프>
=====================================
```

이후 모든 단계에서 이 로그 파일에 **append** 한다.

### 로그 기록 명령 (반드시 이 형식을 사용)
로그 파일 경로를 셸 변수에 저장하지 마라. 매번 **리터럴 경로**를 직접 써라:

```bash
echo "----- [$(date +%Y-%m-%dT%H:%M:%S%z)] [태그] -----
본문" >> agent_logs/YYYYMMDD-HHmmss-execute.log
```

- `>> agent_logs/...` 형태의 단순 echo/printf append 만 사용한다.
- `LOG=$(cat ...)` 같은 변수 치환을 쓰지 마라.
- `/tmp` 에 경로를 저장하지 마라.

### 타임스탬프 규칙
모든 타임스탬프(파일명, 헤더, 로그 엔트리)는 **로컬 타임존**을 사용한다.
- 파일명: `date +%Y%m%d-%H%M%S`
- 로그 본문: `date +%Y-%m-%dT%H:%M:%S%z` (예: `2026-04-09T23:15:30+0900`)

---

## 로깅 규칙

오케스트레이터는 **자신의 판단·흐름**과 **각 에이전트의 입출력**을 빠짐없이 기록한다.

### 기록할 항목

| 시점 | 기록 내용 |
|---|---|
| 에이전트 호출 직전 | `[ORCHESTRATOR → AGENT] agent=programmer\|qa`, 전달한 입력 요약 (plan 커밋 내용, 실패 로그 등) |
| 에이전트 반환 직후 | `[AGENT → ORCHESTRATOR] agent=programmer\|qa`, 에이전트가 보고한 결과 요약 (수정 파일, 구현 요약, 검증 결과 등) |
| 테스트 실행 | `[ORCHESTRATOR] test execution`, 실행 명령, PASS/FAIL, 실패 시 핵심 로그 (최대 50줄) |
| 흐름 분기 | `[ORCHESTRATOR] decision`, 어떤 판단을 했는지 (재시도, QA 진행, 중단 등) |
| 세션 종료 | `[hn-execute] Session End`, 최종 결과 (PASS/FAIL), 총 시도 횟수 |

### 로그 포맷

```
----- [YYYY-MM-DDTHH:mm:ss] <태그> -----
<본문>
```

예시:
```
----- [2026-04-09T14:23:01] [ORCHESTRATOR → programmer] -----
Input:
  - commit: Commit 2
  - task: 버튼 클릭 시 카운터 증가 구현
  - retry: 1/3, previous failure: "counter not incremented on click"

----- [2026-04-09T14:23:45] [programmer → ORCHESTRATOR] -----
Output:
  - modified: scripts/counter.js
  - summary: click 이벤트 핸들러 누락 수정, getElementById 셀렉터 오타 교정
  - notes: 없음
```

---

## 절차

1. **로그 초기화** (위 0번 참조).

2. **컨텍스트 파악**
   - `plan.md` 를 읽어 지정된 커밋 번호의 작업 내용과 use case 를 파악한다.
   - 해당 커밋의 **변경 대상 파일/영역이 이미 존재하는지** 확인한다 (Glob/Read).
   - 이미 존재하면 → 이것은 **재실행 (수정/보강)** 이다. 기존 코드 상태를 요약해 둔다.
   - 존재하지 않으면 → 이것은 **신규 구현**이다.
   - 로그: `[ORCHESTRATOR] plan loaded — commit N 내용 요약`, `mode: new | patch (기존 파일: ...)`

3. **Programmer + QA 스크립트 작성 (병렬 실행)**

   아래 두 에이전트를 **동시에** 호출한다 (Agent 도구를 한 메시지에 두 개 사용):

   **3a. programmer 서브에이전트** — 프로덕션 코드 작성
   - programmer 에게는 아래를 전달한다:
     - plan.md 의 해당 커밋 섹션
     - **실행 모드**: `new` (신규) 또는 `patch` (재실행)
     - `patch` 인 경우: 이미 존재하는 파일 목록과 현재 상태 요약
   - programmer 는 **테스트 코드를 절대 수정할 수 없다**. 프로덕션 코드만 수정한다.
   - 로그: 호출 전 `[ORCHESTRATOR → programmer]` 입력, 반환 후 `[programmer → ORCHESTRATOR]` 출력.

   **3b. qa 서브에이전트** — QA 테스트 스크립트 작성
   - qa 에게 아래를 전달한다:
     - `qa-mode`: HTML/CSS/JS 프로젝트 → `browser`, 서버 프로젝트 → `api`
     - 커밋 번호
     - plan.md 의 해당 커밋 use case 목록
   - qa 는 `qa_test.mjs` 를 작성하고 반환한다 (Bash 권한 없음).
   - 로그: 호출 전 `[ORCHESTRATOR → qa]` 입력, 반환 후 `[qa → ORCHESTRATOR]` 출력.

   > **qa 는 plan.md 만 읽고 스크립트를 작성하므로 programmer 와 의존성이 없다.**
   > qa 스크립트는 한 번만 작성하면 된다. 이후 재시도에서 다시 호출하지 않는다.

4. **QA 실행 루프 (최대 3회 시도)**

   3a(programmer)와 3b(qa) 가 **모두 완료된 후** 이 단계를 시작한다.

   **4a. 오케스트레이터가 QA 스크립트를 실행한다**
   - `node qa_test.mjs` 를 Bash 로 실행한다.
   - 로그: `[ORCHESTRATOR] QA script execution` — 실행 명령, stdout 전체, 종료코드.

   **4b. 결과에 따른 분기**
   - 종료코드 0 (PASS) → 로그에 `[ORCHESTRATOR] decision: QA passed → proceed to refactoring` 기록 후 5번으로 진행.
   - 종료코드 1 (FAIL) → stdout 의 FAIL 사유를 가지고:
     - 로그에 `[ORCHESTRATOR] decision: QA failed → retry programmer (N/3)` 기록.
     - **programmer 만 재호출**한다 (qa 스크립트는 이미 작성 완료, 재작성하지 않음).
       - programmer 에게 FAIL 사유를 전달한다.
     - programmer 완료 후 4a 로 돌아가 QA 스크립트를 다시 실행한다.
     - 3회 시도해도 실패하면 로그에 `[ORCHESTRATOR] decision: max retries reached → abort` 기록 후 사용자에게 실패 원인을 보고하고 중단한다.

5. **Refactorer 단계**
   - `refactorer` 서브에이전트를 호출한다.
   - refactorer 에게는 **이번 커밋에서 수정/생성된 파일 목록**을 전달한다.
   - refactorer 는 동작을 유지하면서 가독성/유지보수성만 개선한다 (새 기능 추가 금지).
   - 로그: 호출 전 `[ORCHESTRATOR → refactorer]` 입력, 반환 후 `[refactorer → ORCHESTRATOR]` 출력.
   - refactorer 가 "리팩토링 불필요" 로 보고하면 → 로그에 `[ORCHESTRATOR] decision: no refactoring needed → done` 기록 후 6번으로 진행.
   - refactorer 가 변경을 수행하면 → 오케스트레이터가 **테스트를 다시 실행**한다.
     - 테스트 통과 → 로그에 `[ORCHESTRATOR] decision: post-refactor tests passed → done` 기록 후 6번으로 진행.
     - 테스트 실패 → refactorer 의 변경을 **`git checkout -- <변경파일>`로 되돌리고**, 로그에 `[ORCHESTRATOR] decision: post-refactor tests failed → reverted refactoring` 기록 후 6번으로 진행. (리팩토링 실패로 전체 워크플로우를 중단하지 않는다.)

6. **세션 종료 로그**

```
=====================================
[hn-execute] Session End
Result: PASS | FAIL
Total programmer attempts: N
Refactoring: applied | reverted | skipped
Time: <ISO 8601 타임스탬프>
=====================================
```

---

## 제약
- 직접 프로덕션 코드를 편집하지 마라. 반드시 programmer 또는 refactorer 를 통해야 한다.
- 직접 use case 를 검증하지 마라. 반드시 qa 를 통해야 한다.
- **3번(병렬 실행)에서만** programmer 와 qa 를 동시에 실행한다. 그 외에는 에이전트를 한 번에 하나만 실행한다.
- **qa 서브에이전트는 세션당 한 번만 호출한다.** QA 실패 시 programmer 만 재호출하고, qa 스크립트는 재작성하지 않는다.
- **로그 누락 금지.** 모든 에이전트 호출/반환, 테스트 실행, 흐름 분기에서 반드시 로그를 기록한다.

## 워크플로우 흐름 제한 (엄수)

허용되는 흐름은 **아래 다이어그램에 있는 화살표만** 이다. 다이어그램에 없는 전이는 절대 하지 마라.

```
[2. 컨텍스트 파악]
       ↓
[3. Programmer + QA 스크립트 작성] ← 병렬 실행
       ↓ 둘 다 완료
[4. QA 실행] ←──── FAIL → Programmer 재호출 → 4로 복귀 (최대 3회)
       ↓ PASS
[5. Refactorer]
       ├─ 변경 없음 → [6. 종료]
       ├─ 테스트 통과 → [6. 종료]
       ├─ 테스트 실패 → revert → [6. 종료]
       ↓
[6. 세션 종료]
```

### 금지되는 전이
- **QA 재호출**: qa 서브에이전트는 3b 에서 한 번만 호출한다. QA 실패 시 qa 를 다시 호출하지 마라.
- **Refactorer → Programmer**: refactorer 단계 이후 programmer 를 다시 호출하지 마라. refactorer 의 테스트 실패는 revert 로 처리하고 세션을 종료한다.
- **QA FAIL → Refactorer**: QA 가 FAIL 이면 반드시 Programmer 로 돌아간다. Refactorer 로 가지 마라.
- **Refactorer → QA**: refactorer 후 QA 를 다시 돌리지 마라. 테스트 통과만 확인하면 된다.
- **세션 종료 후 추가 호출**: 6번 이후 어떤 에이전트도 호출하지 마라.
