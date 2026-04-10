---
name: hn-log
description: hn-execute 워크플로우 전용 로그 기록 스킬. 로그 파일 초기화와 엔트리 append 를 수행한다.
---

# hn-log skill

hn-execute 오케스트레이터가 로그를 기록할 때 사용하는 스킬이다.

## 사용법

두 가지 모드가 있다. 첫 번째 인자로 구분한다.

### 1. 초기화: `/hn-log init <커밋번호>`

로그 파일을 생성하고 헤더를 기록한다.

1. `mkdir -p agent_logs` (단독 Bash 명령)
2. 파일명을 결정한다: `agent_logs/YYYYMMDD-HHmmss-execute.log` (로컬 타임존 기준, `date +%Y%m%d-%H%M%S`)
3. 아래 헤더를 기록한다:
```bash
echo "=====================================
[hn-execute] Session Start
Commit: <커밋번호>
Time: $(date +%Y-%m-%dT%H:%M:%S%z)
=====================================" > agent_logs/<파일명>
```
4. 생성된 로그 파일의 **전체 경로** (예: `agent_logs/20260410-143000-execute.log`) 를 반환한다.

> 호출자는 이 반환값을 이후 모든 `/hn-log append` 호출에서 사용해야 한다.

### 2. 추가: `/hn-log append <로그파일경로> <태그> <본문>`

기존 로그 파일에 엔트리를 append 한다.

```bash
echo "----- [$(date +%Y-%m-%dT%H:%M:%S%z)] [<태그>] -----
<본문>" >> <로그파일경로>
```

인자 설명:
- `<로그파일경로>`: init 에서 반환받은 경로 (예: `agent_logs/20260410-143000-execute.log`)
- `<태그>`: 로그 태그 (예: `ORCHESTRATOR → programmer`, `programmer → ORCHESTRATOR`, `ORCHESTRATOR`, `hn-execute`)
- `<본문>`: 기록할 내용 (여러 줄 가능)

### 3. 종료: `/hn-log end <로그파일경로> <결과> <시도횟수> <리팩토링결과>`

세션 종료 로그를 기록한다.

```bash
echo "=====================================
[hn-execute] Session End
Result: <결과>
Total programmer attempts: <시도횟수>
Refactoring: <리팩토링결과>
Time: $(date +%Y-%m-%dT%H:%M:%S%z)
=====================================" >> <로그파일경로>
```

인자 설명:
- `<결과>`: `PASS` 또는 `FAIL`
- `<시도횟수>`: programmer 호출 횟수 (1~3)
- `<리팩토링결과>`: `applied`, `reverted`, `skipped` 중 하나

## 규칙

- **리터럴 경로만 사용한다.** 셸 변수(`$LOG`, `$(cat ...)`)로 경로를 저장하지 마라.
- **`echo ... >>` 형태의 단순 append 만 사용한다.**
- 모든 타임스탬프는 **로컬 타임존**이다 (`date +%Y-%m-%dT%H:%M:%S%z`).
- `/tmp` 에 경로를 저장하지 마라.
