# 5. Hooks

Hooks fire automatically at lifecycle events. Use them for guardrails, audit logging, auto-formatting, and self-checks.

## Where hooks live

```
.github/hooks/hooks.json
```

> The file **must be on the repository's default branch** to apply for org-wide Copilot sessions. For local CLI use, it's loaded from your current working directory.

## File structure

```json
{
  "version": 1,
  "hooks": {
    "<eventName>": [
      {
        "type": "command",
        "bash": "...",            // executed on Linux/macOS
        "powershell": "...",      // executed on Windows
        "cwd": ".",               // optional — relative working dir
        "timeoutSec": 30,         // optional — default 30
        "env": { "K": "V" }       // optional — extra env vars
      }
    ]
  }
}
```

Important differences vs Claude Code hooks:

| Aspect | Claude Code | Copilot CLI |
|--------|-------------|-------------|
| Hook types | `command`, `prompt`, `agent`, `http` | **`command` only** |
| Events | `PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit`, `SessionStart`, … | 6 events (see below) |
| Cross-platform | one `command` field | **separate `bash` and `powershell` fields** |
| File location | `.claude/settings.json` | **`.github/hooks/hooks.json`** |

## The 6 events

| Event | Fires when… | Common use |
|-------|-------------|------------|
| `sessionStart` | Session begins | Print banner, load env, start sidecars |
| `sessionEnd` | Session ends | Cleanup, persist state, summarise |
| `userPromptSubmitted` | User sends a prompt | Log prompt, redact secrets, inject context |
| `preToolUse` | Before any tool runs | Block dangerous commands (e.g. `rm -rf /`) |
| `postToolUse` | After any tool runs | Auto-format, lint, audit log |
| `errorOccurred` | An error/exception during execution | Notify, capture diagnostics |

## Script I/O contract

Each hook script receives **JSON on stdin** describing the event (tool name, arguments, prompt, etc.) and is expected to return **JSON on stdout**. Non-zero exit codes signal failure.

A minimal blocking response from a `preToolUse` hook:

```json
{ "decision": "deny", "reason": "Dangerous git operation blocked" }
```

A minimal allow response:

```json
{ "decision": "allow" }
```

## What's in this folder

`hooks.json` wires up **all 6 events** to scripts in `.github/hooks/scripts/`:

| Event | Script | Behaviour |
|-------|--------|-----------|
| `sessionStart` | `session_start.sh` | Print a session banner, log to `~/.copilot/audit.log` |
| `sessionEnd` | `session_end.sh` | Append session-end marker to the audit log |
| `userPromptSubmitted` | `log_prompt.sh` | Save prompts (with secrets redacted) to `~/.copilot/prompts.log` |
| `preToolUse` | `git_guardian.sh` | Block dangerous git/shell commands |
| `postToolUse` | `format_python.sh` | Run `ruff format` on edited Python files |
| `errorOccurred` | `notify_error.sh` | Append error events to `~/.copilot/errors.log` |

## Try it

```bash
cd 5_hooks
copilot
```

Then try:

```
> Run `git push --force` on main
```

The `preToolUse` hook should block it before execution.

```
> Edit foo.py to add an is_palindrome function
```

The `postToolUse` hook should run `ruff format` after the edit.

## Debug

```bash
# Verify your hook script with a sample payload
echo '{"tool":"shell","args":{"command":"git push --force"}}' | bash .github/hooks/scripts/git_guardian.sh
```
