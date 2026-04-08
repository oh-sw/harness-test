---
description: 주어진 스펙을 planner 서브에이전트에게 넘겨 plan.md 를 생성/수정한다.
argument-hint: <스펙 내용>
---

사용자가 제공한 스펙: $ARGUMENTS

위 스펙을 반드시 `planner` 서브에이전트에게 위임하여 처리하라.
`planner` 외의 다른 에이전트나 직접 편집을 사용하지 마라.

요구사항:
- planner는 `plan.md` 파일을 생성하거나 기존 파일을 수정해야 한다.
- plan.md 는 **커밋 단위**로 작업이 구분되어야 한다 (Commit 1, Commit 2, ...).
- 각 커밋에는 목표, 변경 대상, 완료 조건(테스트 포함), 검증용 use case 가 포함되어야 한다.

planner가 완료되면 생성/수정된 plan.md 의 요약만 사용자에게 보고하라.
