#!/bin/bash
# hn-execute 워크플로우 전용 로그 스크립트
# 사용법:
#   ./scripts/hn-log.sh init <커밋번호>
#   ./scripts/hn-log.sh append <로그파일경로> <태그> <본문>
#   ./scripts/hn-log.sh end <로그파일경로> <결과> <시도횟수> <리팩토링결과>

set -euo pipefail

MODE="${1:?Usage: hn-log.sh <init|append|end> ...}"
shift

case "$MODE" in
  init)
    COMMIT="${1:?Usage: hn-log.sh init <커밋번호>}"
    mkdir -p agent_logs
    LOGFILE="agent_logs/$(date +%Y%m%d-%H%M%S)-execute.log"
    echo "=====================================
[hn-execute] Session Start
Commit: ${COMMIT}
Time: $(date +%Y-%m-%dT%H:%M:%S%z)
=====================================" > "$LOGFILE"
    echo "$LOGFILE"
    ;;

  append)
    LOGFILE="${1:?Usage: hn-log.sh append <로그파일경로> <태그> <본문>}"
    TAG="${2:?Usage: hn-log.sh append <로그파일경로> <태그> <본문>}"
    BODY="${3:?Usage: hn-log.sh append <로그파일경로> <태그> <본문>}"
    echo "----- [$(date +%Y-%m-%dT%H:%M:%S%z)] [${TAG}] -----
${BODY}" >> "$LOGFILE"
    ;;

  end)
    LOGFILE="${1:?Usage: hn-log.sh end <로그파일경로> <결과> <시도횟수> <리팩토링결과>}"
    RESULT="${2:?Usage: hn-log.sh end <로그파일경로> <결과> <시도횟수> <리팩토링결과>}"
    ATTEMPTS="${3:?Usage: hn-log.sh end <로그파일경로> <결과> <시도횟수> <리팩토링결과>}"
    REFACTOR="${4:?Usage: hn-log.sh end <로그파일경로> <결과> <시도횟수> <리팩토링결과>}"
    echo "=====================================
[hn-execute] Session End
Result: ${RESULT}
Total programmer attempts: ${ATTEMPTS}
Refactoring: ${REFACTOR}
Time: $(date +%Y-%m-%dT%H:%M:%S%z)
=====================================" >> "$LOGFILE"
    ;;

  *)
    echo "Unknown mode: $MODE" >&2
    echo "Usage: hn-log.sh <init|append|end> ..." >&2
    exit 1
    ;;
esac
