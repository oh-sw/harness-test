# hooks

`settings.json`의 `hooks`에서 참조할 셸 스크립트를 보관하는 곳.

예시: PostToolUse 훅으로 파일 저장 후 포매터 실행

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/format.sh" }
        ]
      }
    ]
  }
}
```
