# 7_hooks - Claude Code Hooks Demo

Practical demonstration of [Claude Code hooks](https://code.claude.com/docs/en/hooks) — automated behaviors that trigger at specific lifecycle events during a Claude Code session.

This demo showcases **all 4 hook types** (`prompt`, `command`, `agent`, `http`) across **5 real-world hooks**.

## What Are Hooks?

Hooks are configured in `.claude/settings.json` and fire automatically at lifecycle events. Four types are available:

| Type | How it works | Best for |
|------|-------------|----------|
| `prompt` | Injects a prompt into Claude's context — Claude evaluates using its own conversation knowledge | Judgment calls, self-checks, nuanced decisions |
| `command` | Runs an external script (receives JSON on stdin, returns JSON on stdout) | Deterministic rules, blocking/allowing, side effects |
| `agent` | Spawns a Claude sub-agent with full tool access (Read, Grep, Glob, etc.) | Complex validation requiring code inspection |
| `http` | POSTs event JSON to a URL endpoint | External integrations, logging, webhooks |

## Hooks in This Demo

### 1. Stop — Test Guardian (`prompt` type)

**Event:** `Stop` — fires when Claude finishes responding.

**What it does:** Injects a self-check prompt asking Claude to evaluate whether it modified code and, if so, whether it ran tests. If tests are missing or weren't run, Claude continues working instead of stopping.

**Why `prompt`?** Claude already has full context of everything it did. Parsing the transcript externally would be fragile and redundant. Letting Claude reason about "should I test?" captures nuance a script cannot (e.g., "I only changed a comment" vs "I refactored core logic").

### 2. PreToolUse — Git Guardian (`command` type)

**Event:** `PreToolUse` (matcher: `Bash`) — fires before any Bash command executes.

**What it does:** Regex-matches the command against dangerous git operations and denies them:
- `git push --force` / `-f`
- `git reset --hard`
- `git checkout .` / `git restore .`
- `git clean -f`
- `git branch -D`

**Why `command`?** Deterministic pattern matching — no judgment needed, just regex against a known list. Fast (< 5ms), no API cost.

**Script:** `.claude/hooks/pretool_git_guardian.py`

### 3. PreToolUse — Security Reviewer (`agent` type)

**Event:** `PreToolUse` (matcher: `Write|Edit`) — fires before code is written or edited.

**What it does:** Spawns a Claude sub-agent that inspects the code about to be written for:
- Hardcoded secrets, API keys, passwords
- SQL injection (string concatenation in queries)
- Command injection (unsanitized input in shell commands)
- Insecure `eval()` / `exec()` usage

Blocks the write if a security issue is found.

**Why `agent`?** Security review requires understanding code semantics — a regex can't tell if `password = "changeme"` is a real credential or a test fixture. A sub-agent can reason about context, read surrounding files, and make nuanced decisions.

**Trade-offs:** Slower (~5-15s) and costs API tokens. Worth it for security-critical projects. Use `matcher` to limit scope (e.g., only `.py` files, or only `src/` paths).

### 4. PostToolUse — Python Auto-Formatter (`command` type)

**Event:** `PostToolUse` (matcher: `Write|Edit`) — fires after a file is written or edited.

**What it does:** If the modified file is `.py`, runs `ruff format` (falls back to `black`). Reports the formatting result back as additional context.

**Why `command`?** Formatting is a concrete side effect — needs to shell out to an external tool.

**Script:** `.claude/hooks/posttool_format_python.py`

### 5. PostToolUse — Audit Logger (`http` type)

**Event:** `PostToolUse` (matcher: `Write|Edit`) — fires after a file is written or edited.

**What it does:** POSTs the full event payload (tool name, input, session ID, working directory) to `http://localhost:9111/audit`. A logging server on the other end could persist this for compliance, observability, or team dashboards.

**Why `http`?** Decouples the logging concern from Claude Code entirely. The receiver can be any HTTP service — a sidecar container, a Slack webhook, a Datadog endpoint, etc. Zero Python scripts to maintain in the repo.

**Note:** This hook will silently fail if nothing listens on port 9111 — HTTP hooks are non-blocking by default. To test it, run any HTTP server on that port (e.g., `python3 -m http.server 9111`).

## Hook Architecture

```
.claude/
├── settings.json                # All 5 hooks configured here
└── hooks/
    ├── pretool_git_guardian.py   # command hook: blocks dangerous git ops
    └── posttool_format_python.py # command hook: auto-formats Python files

# prompt hook  → no script, just a prompt string in settings.json
# agent hook   → no script, just a prompt string in settings.json (spawns sub-agent)
# http hook    → no script, just a URL in settings.json (POSTs to external service)
```

## How to Try It

1. `cd` into this directory
2. Start a Claude Code session
3. Ask Claude to modify some code — e.g.:

```
Add an is_palindrome function to the string_utils module
```

You should observe:
- **Agent hook** fires before Write — security review of the new code
- **Command hook** fires after Write — auto-formats the `.py` file
- **HTTP hook** fires after Write — attempts to POST audit log (silent fail if no server)
- **Stop hook** fires when Claude tries to finish — self-checks if tests were run
- **Git Guardian** fires if Claude tries any dangerous git command (blocked)

## Key Takeaways

1. **`prompt`** — leverage Claude's own context for judgment calls (cheapest, fastest for self-checks)
2. **`command`** — deterministic rules via external scripts (fast, no API cost, full control)
3. **`agent`** — complex validation requiring code understanding (powerful but slower, costs tokens)
4. **`http`** — fire-and-forget to external services (decoupled, zero in-repo code)
5. **`matcher`** filters which tools trigger the hook — keeps irrelevant events from wasting time
6. **Multiple hooks compose** — same event can have multiple hooks of different types running in sequence
