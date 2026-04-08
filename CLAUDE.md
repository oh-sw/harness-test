# AI Agent Program

## 원칙
- 에이전트 동작을 바꾸고 싶을 땐 먼저 "어떤 하네스 레이어에서 처리할 것인가"를 결정한다.
  - 지속적 지시 → `CLAUDE.md`
  - 자동 실행 → `.claude/settings.json`의 hooks
  - 재사용 가능한 워크플로우 → `.claude/commands/` 또는 `.claude/skills/`
  - 격리된 컨텍스트 작업 → `.claude/agents/`
- 모든 변경은 작은 단위로 커밋한다.
- **에이전트는 한 번에 하나만 실행한다.** 병렬 실행 금지.

## 워크플로우

이 하네스는 두 개의 슬래시 커맨드로 동작한다.

### `/hn-plan <스펙>`
- `planner` 서브에이전트만 호출된다.
- planner 는 스펙을 읽고 `plan.md` 를 생성/수정한다.
- `plan.md` 는 **커밋 단위**로 작업이 구분되며, 각 커밋마다 목표·변경 대상·테스트·완료 조건·use cases 를 포함한다.
- planner 외의 경로로 `plan.md` 를 수정하지 않는다.

### `/hn-execute <커밋 번호>`
오케스트레이터가 아래 루프를 순차 실행한다.

1. `plan.md` 에서 해당 커밋을 읽는다.
2. **Programmer 루프 (최대 3회)**
   - `programmer` 서브에이전트가 프로덕션 코드를 작성한다.
   - programmer 는 **테스트 코드를 수정할 수 없다**.
   - 오케스트레이터가 테스트를 실행한다.
   - 실패 → 실패 로그와 함께 programmer 재호출 (카운트 +1).
   - 3회 실패 → 루프 종료 후 사용자에게 보고하고 중단.
3. **QA 단계**
   - `qa` 서브에이전트가 프로그램을 실제 실행하여 use case 를 블랙박스 검증한다.
   - qa 는 내부 코드 리뷰를 하지 않고 외부 동작만 본다.
   - FAIL → 실패 사유를 가지고 2번으로 복귀 (programmer 시도 카운트는 유지).
   - PASS → 커밋 메시지 초안을 출력하고 `/hn-execute` 종료.

## 디렉토리
- `.claude/agents/` — planner, programmer, qa
- `.claude/commands/` — hn-plan, hn-execute
- `plan.md` — planner 가 관리하는 작업 계획 (루트)
