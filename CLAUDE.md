# AI Agent Program

## 원칙
- 에이전트 동작을 바꾸고 싶을 땐 먼저 "어떤 하네스 레이어에서 처리할 것인가"를 결정한다.
  - 지속적 지시 → `CLAUDE.md`
  - 자동 실행 → `.claude/settings.json`의 hooks
  - 재사용 가능한 워크플로우 → `.claude/commands/` 또는 `.claude/skills/`
  - 격리된 컨텍스트 작업 → `.claude/agents/`
- 모든 변경은 작은 단위로 커밋한다.
- **초기 실행(Step 3)에서만** programmer 와 qa 를 병렬 실행한다. 그 외에는 에이전트를 한 번에 하나만 실행한다.

## 워크플로우

이 하네스는 두 개의 슬래시 커맨드로 동작한다.

### `/hn-plan <스펙>`
- `planner` 서브에이전트만 호출된다.
- planner 는 스펙을 읽고 `plan.md` 를 생성/수정한다.
- `plan.md` 는 **커밋 단위**로 작업이 구분되며, 각 커밋마다 목표·변경 대상·테스트·완료 조건·use cases 를 포함한다.
- planner 외의 경로로 `plan.md` 를 수정하지 않는다.

### `/hn-execute <커밋 번호>`
오케스트레이터가 아래 흐름을 실행한다.

1. `plan.md` 에서 해당 커밋을 읽는다.
2. **Programmer + QA 스크립트 작성 (병렬)**
   - `programmer` 가 프로덕션 코드를 작성하고, `qa` 가 테스트 스크립트(`qa_test_commit_{N}.mjs`)를 작성한다.
   - qa 는 plan.md 만 보고 스크립트를 작성하므로 programmer 와 의존성 없음.
   - qa 는 **세션당 한 번만** 호출된다.
3. **QA 실행 루프 (최대 3회)**
   - 오케스트레이터가 `node qa_test_commit_{N}.mjs` 를 실행한다.
   - PASS → Refactorer 단계로 진행.
   - FAIL → programmer 만 재호출 후 다시 QA 실행 (카운트 +1).
   - 3회 실패 → 사용자에게 보고하고 중단.
4. **Refactorer** → 세션 종료.

## 디렉토리
- `.claude/agents/` — planner, programmer, qa, refactorer
- `.claude/commands/` — hn-plan, hn-execute
- `plan.md` — planner 가 관리하는 작업 계획 (루트)
