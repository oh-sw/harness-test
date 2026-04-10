# Claude Code 하네스 엔지니어링에서 배운 것들

> 멀티 에이전트 오케스트레이션 하네스를 직접 만들어보며 얻은 실전 교훈들.
> "LLM에게 자율성을 줄수록 예측 불가능해진다"는 전제에서 출발한다.

---

## 핵심 원칙: 컨텍스트 최소화 + 자율성 제한 = 예측가능성

LLM은 컨텍스트가 커지고 할 수 있는 일이 많아질수록 이상한 짓을 한다.
하네스 엔지니어링의 본질은 **"얼마나 적게 보여주고, 얼마나 좁은 범위에서 행동하게 할 것인가"**를 설계하는 일이다.

---

## 1. 프롬프트로 금지하는 건 한계가 있다. 물리적으로 못 하게 만들어라.

### 사례: QA 에이전트의 반복적 지시 위반

QA 에이전트에게 "npm test 실행 금지", "curl 금지", "직접 서버 띄우지 마라"고 명시했다.
금지 목록을 늘려보고, 화이트리스트 방식으로 바꿔보고, 프롬프트 템플릿까지 넣어봤다.
**전부 무시당했다.** 5번 이상의 시도 끝에 나온 결론:

> **Bash 도구 자체를 제거했다.** QA는 Read, Write, Glob만 가진다.

```yaml
# Before: 프롬프트로 금지 (실패)
tools: Read, Write, Edit, Glob, Grep, Bash
# 프롬프트에 "Bash로 npm test 실행 금지" 추가 → 무시됨

# After: 도구 자체 제거 (성공)
tools: Read, Write, Glob
# 실행할 수단이 없으므로 물리적으로 불가능
```

### 교훈

| 접근 | 효과 |
|---|---|
| 프롬프트에 "하지 마라" 추가 | 무시될 확률 높음 |
| 금지 목록 구체화 | 목록에 없는 우회 경로를 찾음 |
| 화이트리스트 방식 | 약간 나아지지만 여전히 위반 |
| **도구 자체 제거** | **100% 차단** |

**결론: 행동을 통제하고 싶으면 프롬프트가 아니라 도구 권한으로 통제하라.**

---

## 2. 에이전트마다 컨텍스트를 분리하라

하나의 거대한 시스템 프롬프트 대신, 에이전트별로 필요한 문서만 선택적으로 주입한다.

### 우리 구조

```
docs/
├── shared/              ← programmer + refactorer 공유
│   ├── conventions.md   ← 코딩 컨벤션
│   └── architecture.md  ← 아키텍처 규칙
├── programmer/
│   └── stack.md          ← 허용 언어/프레임워크 (programmer 전용)
└── qa/
    ├── browser-testing.md ← 브라우저 QA 가이드
    └── api-testing.md     ← API QA 가이드
```

- **Programmer**: conventions + architecture + stack 로딩
- **QA**: qa/ 하위 문서만 로딩
- **Refactorer**: conventions + architecture 로딩
- **Planner**: 아무 docs도 로딩하지 않음 (What/Why만 다루므로)

### 왜 이게 중요한가

Plan.md에 코딩 컨벤션을 적었더니 planner가 구현 디테일을 계획에 섞기 시작했다.
planner에게 "conventions.md는 읽지 마라"고 하는 대신, **plan.md 자체에서 구현 정보를 빼고 docs를 분리**했다.

> 보여주지 않으면 신경 쓸 수 없다.

---

## 3. 반복되는 행동은 스크립트로 감싸라

### 사례: 로그 기록 방식의 일관성 문제

오케스트레이터에게 "리터럴 경로를 써라, 셸 변수를 쓰지 마라"고 명시했다.
**매번 다른 방식으로 로그를 기록했다.** 변수를 쓰기도 하고, 포맷이 달라지기도 했다.

스킬(프롬프트 기반)로 만들어봤지만 여전히 LLM이 bash 명령을 구성하는 단계에서 변형이 발생했다.

> **셸 스크립트(`hn-log.sh`)로 구현을 감쌌다.** LLM은 인자만 전달한다.

```bash
# LLM이 할 수 있는 것: 인자를 넘기는 것뿐
bash scripts/hn-log.sh init 3
bash scripts/hn-log.sh append "agent_logs/20260410-143000-execute.log" "ORCHESTRATOR" "내용"
bash scripts/hn-log.sh end "agent_logs/20260410-143000-execute.log" "PASS" "2" "applied"
```

echo 명령을 구성하는 것 자체를 LLM에게 맡기지 않으므로 포맷이 100% 일관된다.

### 패턴

```
LLM이 구현을 구성 → 변형 발생
LLM이 인터페이스만 호출 → 일관성 보장
```

---

## 4. 워크플로우 전이를 명시적으로 제한하라

### 사례: Refactorer가 코드를 직접 수정하지 않는 문제

Refactorer가 수정 사항을 "보고"만 하고, 오케스트레이터가 그걸 Programmer에게 전달해서 수정하게 했다.
이건 의도한 흐름이 아니었다 (Refactorer → Programmer 전이는 금지해야 함).

**해결: 허용 전이를 ASCII 다이어그램으로 명시하고, 금지 전이를 나열했다.**

```
[3. Programmer + QA 스크립트 작성] ← 병렬 실행
       ↓ 둘 다 완료
[4. QA 실행] ←─┬── 구현 버그 → Programmer 재호출 → 4로 복귀
       │       └── QA 스크립트 버그 → QA 재호출 → 4로 복귀
       ↓ PASS
[5. Refactorer]
       ↓
[6. 세션 종료]

금지:
- Refactorer → Programmer
- QA FAIL → Refactorer
- Refactorer → QA
- 세션 종료 후 추가 호출
```

### 교훈

- "알아서 판단해라"는 최악의 지시.
- 허용되는 상태 전이를 **그래프로 그려서** 보여주면 위반이 크게 줄어든다.
- 금지 전이도 "왜 금지인지"와 함께 명시하면 더 효과적이다.

---

## 5. 실패 원인을 분류하는 건 오케스트레이터의 책임이다

### 사례: QA 스크립트 버그를 구현 버그로 오인

QA 스크립트가 잘못된 좌표를 참조하고 있었다 (스크립트 버그).
오케스트레이터는 이걸 구분하지 못하고 Programmer에게 "테스트 통과시켜라"고 요청했다.
Programmer는 QA 스크립트의 잘못된 좌표에 맞추려고 프로덕션 코드를 뒤틀기 시작했다.

**해결: 오케스트레이터에게 실패 원인 분류 기준을 줬다.**

| 원인 | 판단 기준 | 행동 |
|---|---|---|
| 구현 버그 | 프로덕션 로직이 use case를 충족 못 함 | Programmer 재호출 |
| QA 스크립트 버그 | 테스트가 잘못된 가정을 하고 있음 | QA 재호출 + 프로덕션 코드 구조 전달 |

---

## 6. 역할별 도구·모델·문서 설계 요약

| 에이전트 | 모델 | 도구 | 참조 문서 | 수정 가능 범위 |
|---|---|---|---|---|
| Planner | opus | Read, Write, Edit, Glob, Grep | 없음 | plan.md만 |
| Programmer | sonnet | Read, Write, Edit, Glob, Grep, Bash | conventions, architecture, stack | 프로덕션 코드 + test/ |
| QA | sonnet | Read, Write, Glob | qa/browser-testing, qa/api-testing | qa_test_commit_{N}.mjs만 |
| Refactorer | sonnet | Read, Write, Edit, Glob, Grep, Bash | conventions, architecture | 프로덕션 코드 (동작 변경 금지) |
| 오케스트레이터 | - | 모두 | hn-execute.md | 직접 수정 금지 |

핵심 설계 판단:
- **Planner에 opus**: 계획 수립은 추론 능력이 중요. 비싸지만 호출 빈도 낮음.
- **나머지에 sonnet**: 코드 작성은 sonnet으로 충분. 호출 빈도 높으므로 비용 효율적.
- **QA에서 Bash 제거**: 가장 임팩트 있었던 결정. "실행은 오케스트레이터가 한다"로 역할 분리.

---

## 7. 하네스 레이어 선택 가이드

변경하고 싶은 행동이 있을 때, **어디에서 처리할지** 먼저 결정한다.

| 변경 목적 | 레이어 | 예시 |
|---|---|---|
| 항상 적용되는 규칙 | `CLAUDE.md` | "에이전트는 한 번에 하나만 실행" |
| 특정 도구 허용/차단 | `settings.json` | Bash 명령 패턴 허용, rm -rf 차단 |
| 반복 가능한 워크플로우 | `.claude/commands/` | hn-execute, hn-plan |
| 재사용 가능한 기능 | `.claude/skills/` | hn-log (로그 기록) |
| 격리된 역할 수행 | `.claude/agents/` | programmer, qa, refactorer |
| 에이전트가 참조할 지식 | `docs/` | conventions, architecture, stack |
| 에이전트가 호출할 도구 | `scripts/` | hn-log.sh, qa helpers |

---

## 한 줄 요약

> LLM을 잘 쓰는 방법은 LLM에게 적게 보여주고, 좁게 행동하게 하고, 구현은 숨기고 인터페이스만 노출하는 것이다.
> 프롬프트 엔지니어링의 한계를 인정하고, 시스템 설계로 보완하라.
