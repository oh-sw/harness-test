# Plan

## Overview
브라우저에서 동작하는 2D 로컬 2P 격투 게임을 만든다. 캐릭터 5종(현재/재현/중훈/한결/상우), 체력 10, 주먹/발차기 공격, 막기/점프 메커닉을 구현한다. 게임 로직(상태 전이, 충돌, 데미지)은 순수 JS 모듈로 분리하여 Node 기반 단위테스트가 가능하도록 한다. 렌더링과 입력은 HTML5 Canvas + DOM 이벤트로 처리한다.

## 디렉토리 가정
```
/index.html
/src/
  engine.js        # 순수 로직 (export, Node 테스트 가능)
  characters.js    # 캐릭터 정의
  input.js         # 키 매핑/입력 처리 (브라우저)
  render.js        # canvas 그리기
  main.js          # 부트스트랩
/test/
  *.test.js        # node --test 기반
package.json
```

---

## Commit 1: 프로젝트 부트스트랩과 캐릭터 정의
- **목표**: 저장소 골격, 캐릭터 데이터, Node 테스트 러너 구성.
- **변경 대상**:
  - `package.json` (`"test": "node --test test/"`, type: module)
  - `src/characters.js` — 5종 캐릭터(현재/재현/중훈/한결/상우) export
  - `index.html` — 빈 캔버스 + 모듈 로드
  - `test/characters.test.js`
- **구현 메모**:
  - `CHARACTERS = [{id, name, hp:10}]`
  - `getCharacter(id)` 헬퍼.
- **테스트**: 5종이 모두 존재, 이름 일치, 기본 hp 10.
- **완료 조건**: `npm test` 통과.
- **Use cases (QA용)**:
  1. `index.html` 을 브라우저에서 열면 캔버스가 보이고 콘솔 에러가 없다.
  2. `npm test` 실행 시 characters 테스트 통과.

---

## Commit 2: 게임 상태와 이동/점프/막기 로직
- **목표**: 순수 함수 게임 엔진 1차 — 두 플레이어 위치, 방향, 상태(idle/jump/block) 관리.
- **변경 대상**:
  - `src/engine.js` — `createGame(p1Char, p2Char)`, `step(state, inputs, dt)`
  - `test/engine.movement.test.js`
- **구현 메모**:
  - state: `{p1:{x,y,vy,facing,state,hp}, p2:{...}, stageWidth}`
  - 입력 객체: `{left,right,up,down,punch,kick}` 두개.
  - 위 입력 + 지면 → 점프(vy 부여), 중력으로 복귀.
  - 아래 입력 + 지면 → state='block'.
  - facing 은 상대 위치로 매 step 갱신.
- **테스트**:
  - 좌/우 이동 시 x 변화.
  - 위 입력 시 y 가 올라갔다 다시 지면으로.
  - 아래 입력 시 state==='block'.
  - 두 캐릭터 facing 이 서로를 향함.
- **완료 조건**: 단위테스트 통과.
- **Use cases (QA용)**:
  1. 브라우저에서 1P 가 ←/→ 로 좌우 이동, ↑ 로 점프, ↓ 로 막기 자세 확인.
  2. 2P 가 f/h/t/g 로 동일 동작 수행.

---

## Commit 3: 주먹 공격과 막기 판정
- **목표**: 주먹(즉발) 공격, 데미지 1, 막기 가능, 뒤에서 맞으면 막기 무효.
- **변경 대상**:
  - `src/engine.js` — punch 처리, 히트박스, 데미지 적용
  - `test/engine.punch.test.js`
- **구현 메모**:
  - `punch` 입력 시 `state='punch'`, 짧은 active 프레임.
  - 히트 판정: 공격자 facing 방향 일정 거리 내 상대 → hit.
  - 상대가 `block` 이고, 상대 facing 이 공격 들어오는 방향과 마주봄(앞) → 무효.
  - 그 외 → hp -1.
  - 같은 공격은 1회만 데미지.
- **테스트**:
  - 주먹 맞으면 hp 9.
  - 앞에서 막으면 hp 10 유지.
  - 뒤에서 주먹 맞으면 막기여도 hp 9.
  - 같은 punch 가 중복 데미지 안 줌.
- **완료 조건**: 단위테스트 통과.
- **Use cases (QA용)**:
  1. 1P 가 . 키로 주먹, 2P hp 1 감소(화면 hp 바 갱신).
  2. 2P 가 ↓ 로 막은 상태에서 1P 의 정면 주먹은 hp 변동 없음.
  3. 2P 가 1P 뒤로 돌아 막아도 1P 등 뒤 주먹은 데미지 들어감.

---

## Commit 4: 발차기 공격 (선딜, 막기 불가)
- **목표**: kick 입력 시 N 프레임 startup 후 active, 막기로 막을 수 없음.
- **변경 대상**:
  - `src/engine.js` — kick state machine
  - `test/engine.kick.test.js`
- **구현 메모**:
  - `kick` 입력 → `state='kick_startup'` (예: 10 step) → `kick_active` (3 step) → `idle`.
  - startup 중에는 다른 입력 무시(혹은 취소 불가).
  - active 시 히트 판정, block 무시하고 데미지.
- **테스트**:
  - kick 입력 후 startup 동안 데미지 없음.
  - active step 에서 데미지 1.
  - 막고 있어도 발차기 데미지 적용.
- **완료 조건**: 단위테스트 통과.
- **Use cases (QA용)**:
  1. 1P 가 , 키 누른 직후 즉시 hp 변동 없음, 잠시 뒤 hp -1.
  2. 2P 가 ↓ 막기 중이어도 1P 발차기 맞으면 hp 감소.

---

## Commit 5: 승패 판정과 게임 종료
- **목표**: hp 0 → 승자 결정, 입력 잠금, 화면에 결과.
- **변경 대상**:
  - `src/engine.js` — `winner` 필드, hp clamp
  - `test/engine.win.test.js`
  - `src/render.js` — 결과 텍스트
- **구현 메모**:
  - hp <=0 시 hp=0, `state.winner = 'p1'|'p2'`, 이후 step 입력 무시.
- **테스트**:
  - 10회 데미지 후 winner 설정.
  - winner 설정 후 추가 입력으로 상태 변화 없음.
- **완료 조건**: 단위테스트 통과.
- **Use cases (QA용)**:
  1. 한쪽 체력이 0 이 되면 화면에 "P1 WIN" 또는 "P2 WIN" 표시.
  2. 결과 표시 후 키 입력해도 캐릭터가 움직이지 않음.

---

## Commit 6: 입력 매핑, 렌더링, 캐릭터 선택 화면
- **목표**: 브라우저에서 실제로 플레이 가능하게 통합.
- **변경 대상**:
  - `src/input.js` — 키 매핑(1P: ←↑→↓ , .  / 2P: f t h g z x)
  - `src/render.js` — 캐릭터/HP바/스테이지 그리기
  - `src/main.js` — 캐릭터 선택 UI → 게임 루프 시작
  - `index.html` — 선택 UI markup
  - `test/input.test.js` — 키→입력 객체 매핑 순수 함수 테스트
- **구현 메모**:
  - `mapKeysToInputs(keysDownSet)` 순수 함수로 분리하여 Node 테스트.
  - requestAnimationFrame 루프에서 step → render.
- **테스트**:
  - `,` 키 down → p1.kick true.
  - `x` 키 down → p2.punch true.
  - 양쪽 동시 입력 매핑 확인.
- **완료 조건**: `npm test` 전체 통과 + 브라우저 수동 플레이 가능.
- **Use cases (QA용)**:
  1. 게임 시작 시 5종 캐릭터 중 1P/2P 가 각각 선택 가능.
  2. 선택 후 스테이지 진입, 양 플레이어 캐릭터와 HP 바 표시.
  3. 명시된 키맵으로 양 플레이어가 이동/점프/막기/주먹/발차기 모두 수행.
  4. 한쪽 hp 0 → 승자 표시로 게임 종료.
