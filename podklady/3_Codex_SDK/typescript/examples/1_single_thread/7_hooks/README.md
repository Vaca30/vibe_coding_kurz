# Hooks

## SDK Support

**Hooks are NOT directly supported by the Codex TypeScript SDK.**

The SDK has no `hooks` parameter in `CodexOptions` or `ThreadOptions`. There are no in-process hook callbacks.

## How Hooks Work in Codex

Hooks are external shell commands configured via `hooks.json` files. The Codex CLI discovers them from config folders in the config layer stack:

1. `~/.codex/hooks.json` (user-level, always applies)
2. `.codex/hooks.json` (project-level, in working directory)
3. `$(git root)/.codex/hooks.json` (repo-level)

### hooks.json Format

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^Bash$",
        "hooks": [
          {
            "type": "command",
            "command": "python3 /path/to/safety_check.py",
            "timeout": 600,
            "statusMessage": "running safety check"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/audit_logger.sh"
          }
        ]
      }
    ],
    "SessionStart": [],
    "UserPromptSubmit": [],
    "Stop": []
  }
}
```

### Hook Types

| Hook | When it fires | Can block? |
|------|---------------|------------|
| `SessionStart` | New session begins | No |
| `PreToolUse` | Before a tool executes | Yes (return `{"decision": "block"}`) |
| `PostToolUse` | After a tool completes | No |
| `UserPromptSubmit` | When a prompt is submitted | No |
| `Stop` | Session ends | No |

### Hook Script Protocol

Hook scripts receive JSON context on **stdin** containing session_id, tool info, etc. For `PreToolUse`, the script must return JSON on stdout:
- `{"decision": "allow"}` - let the tool proceed
- `{"decision": "block", "reason": "..."}` - block the tool

## Using with the SDK

The only way to use hooks with the SDK is via the `workingDirectory` option:

```typescript
// Prepare a directory with .codex/hooks.json
const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: "/path/to/project-with-hooks",
});
```

**Limitation**: All threads using the same `workingDirectory` share the same hooks. User-level hooks (`~/.codex/hooks.json`) always apply to all threads.

## Comparison with Claude SDK

| Aspect | Claude SDK | Codex SDK |
|--------|-----------|-----------|
| Hook type | In-process TypeScript callbacks | External shell commands |
| Configuration | `options.hooks` parameter in `query()` | `hooks.json` file in config folders |
| Per-thread isolation | Yes (different callbacks per query) | No (shared via filesystem) |
| Can block tools | Yes (PreToolUse returns block/allow) | Yes (stdout JSON response) |
| SDK API | Direct `hooks: { PreToolUse: fn }` | None (filesystem only) |
