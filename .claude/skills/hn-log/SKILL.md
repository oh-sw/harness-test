---
name: hn-log
description: hn-execute 워크플로우 전용 로그 기록 스킬. 로그 파일 초기화와 엔트리 append 를 수행한다.
---

# hn-log skill

hn-execute 오케스트레이터가 로그를 기록할 때 사용하는 스킬이다.

**모든 로그 기록은 `scripts/hn-log.sh` 스크립트를 실행**하는 것이 전부다. 직접 echo/printf 를 쓰지 마라.

## 사용법

### 1. 초기화: `/hn-log init <커밋번호>`

```bash
bash scripts/hn-log.sh init <커밋번호>
```

stdout 으로 생성된 로그 파일 경로가 출력된다. 이 경로를 호출자에게 반환한다.

### 2. 추가: `/hn-log append <로그파일경로> <태그> <본문>`

```bash
bash scripts/hn-log.sh append "<로그파일경로>" "<태그>" "<본문>"
```

### 3. 종료: `/hn-log end <로그파일경로> <결과> <시도횟수> <리팩토링결과>`

```bash
bash scripts/hn-log.sh end "<로그파일경로>" "<결과>" "<시도횟수>" "<리팩토링결과>"
```

## 규칙

- **`bash scripts/hn-log.sh ...` 이외의 명령을 실행하지 마라.** echo, printf, 변수 할당 등 금지.
- 인자에 공백이나 줄바꿈이 포함될 수 있으므로 반드시 **따옴표로 감싸라**.
