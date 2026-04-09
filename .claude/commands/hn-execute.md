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

1. `agent_logs/` 디렉토리가 없으면 Bash 로 `mkdir -p agent_logs` 실행.
2. 로그 파일명: `agent_logs/YYYYMMDD-HHmmss-execute.log` (현재 시각 기준).
3. 이 파일에 아래 헤더를 기록한다:

```
=====================================
[hn-execute] Session Start
Commit: <커밋 번호>
Time: <ISO 8601 타임스탬프>
=====================================
```

이후 모든 단계에서 이 로그 파일에 **append** 한다.
로그 기록은 Write/Edit 가 아닌 **Bash 의 `echo >> <로그파일>`** 로 수행한다.

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

3. **Programmer 루프 (최대 3회 시도)**
   - `programmer` 서브에이전트를 호출해 해당 커밋의 코드를 작성/수정하게 한다.
     - programmer 에게는 아래를 전달한다:
       - plan.md 의 해당 커밋 섹션
       - **실행 모드**: `new` (신규) 또는 `patch` (재실행)
       - `patch` 인 경우: 이미 존재하는 파일 목록과 현재 상태 요약
       - (있다면) 직전 실패 원인
     - programmer 는 **테스트 코드를 절대 수정할 수 없다**. 프로덕션 코드만 수정한다.
     - 로그: 호출 전 `[ORCHESTRATOR → programmer]` 입력, 반환 후 `[programmer → ORCHESTRATOR]` 출력.
   - programmer 가 끝나면 오케스트레이터가 직접 테스트를 실행한다 (Bash).
     - 로그: `[ORCHESTRATOR] test execution` — 명령, 결과, 실패 시 핵심 로그.
   - 테스트 통과 시 → 로그에 `[ORCHESTRATOR] decision: tests passed → proceed to QA` 기록 후 4번으로 진행.
   - 테스트 실패 시 → 로그에 `[ORCHESTRATOR] decision: tests failed → retry programmer (N/3)` 기록 후 programmer 재호출.
   - 3회 시도해도 실패하면 로그에 `[ORCHESTRATOR] decision: max retries reached → abort` 기록 후 사용자에게 실패 원인을 보고하고 중단한다.

4. **QA 단계**
   - `qa` 서브에이전트를 호출한다.
   - qa 에게는 아래를 전달한다:
     - plan.md 의 해당 커밋 use case 목록
     - **`qa-mode`**: 이 프로젝트의 스택에 따라 `browser` 또는 `api` 를 지정한다 (HTML/CSS/JS 프로젝트 → `browser`, 서버 프로젝트 → `api`)
   - qa 는 프로그램을 실제 실행하여 외부에서 관찰 가능한 use case 동작만 검증한다 (내부 코드 리뷰 금지).
   - 로그: 호출 전 `[ORCHESTRATOR → qa]` 입력, 반환 후 `[qa → ORCHESTRATOR]` 출력.
   - qa 가 실패를 리포트하면 → 로그에 `[ORCHESTRATOR] decision: QA failed → retry programmer` 기록 후 3번의 programmer 루프로 돌아간다 (시도 카운트는 유지 / 3회 초과 시 중단).
   - qa 가 통과를 리포트하면 → 로그에 `[ORCHESTRATOR] decision: QA passed → proceed to refactoring` 기록 후 5번으로 진행.

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
- 에이전트는 한 번에 하나만 실행한다.
- **로그 누락 금지.** 모든 에이전트 호출/반환, 테스트 실행, 흐름 분기에서 반드시 로그를 기록한다.
