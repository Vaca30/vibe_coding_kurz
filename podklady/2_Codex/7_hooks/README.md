# 7_hooks - Codex Hooks Demo

Practical demonstration of [Codex hooks](https://developers.openai.com/codex/hooks) using the hook types Codex supports today.

This folder intentionally mirrors the Claude demo in `4_Claude_Code/7_hooks`, but only where Codex can actually do the same thing. The current Codex hooks runtime is more limited:

- Only `command` hooks are supported today.
- `PreToolUse` and `PostToolUse` currently only match the `Bash` tool.
- `prompt`, `agent`, and `http` hook types from Claude do not exist in Codex today.
- `Write|Edit` style matchers shown in some examples are valid regexes, but they do not match anything in current Codex because the runtime only emits `Bash` for tool hooks.

## What This Demo Implements

### 1. SessionStart - Workspace Primer (`command`)

**Event:** `SessionStart`

Loads extra context into Codex at session startup or resume, explaining which hooks are active in this workspace.

Why this is practical:
- It gives Codex consistent repo-specific operating context without hard-coding everything into `AGENTS.md`.
- It is a good replacement for "custom prompting per directory", which the hooks docs explicitly call out as a use case.

### 2. UserPromptSubmit - Secret Guard (`command`)

**Event:** `UserPromptSubmit`

Scans the user prompt for obvious secret patterns and blocks submission if it looks like someone pasted credentials into the chat.

Examples caught:
- OpenAI keys
- GitHub personal tokens
- AWS access keys
- PEM private key blocks

Why this is practical:
- It is a real safety control for teams using Codex in shared environments.
- It demonstrates prompt-time policy enforcement, which is one of the best supported Codex hook patterns today.

### 3. PreToolUse - Git Guardian (`command`)

**Event:** `PreToolUse` with matcher `Bash`

Blocks dangerous git commands before Codex runs them:
- `git push --force`
- `git reset --hard`
- `git checkout .`
- `git restore .`
- `git clean -f`
- `git branch -D`

Why this is practical:
- This is the closest 1:1 replication of the Claude demo.
- Codex can currently intercept Bash commands deterministically, so command-based policy checks are a strong fit here.

### 4. PostToolUse - Audit Logger (`command`)

**Event:** `PostToolUse` with matcher `Bash`

Appends each Bash command plus a short output excerpt to a local JSONL audit log:

- `.codex-hook-state/audit-log.jsonl`

Why this is practical:
- It is the closest supported Codex equivalent to Claude's `http` audit hook.
- Codex cannot POST directly to a webhook through a native `http` hook today, so this demo logs locally instead.
- In a real team setup, this script could forward events to Datadog, Splunk, or an internal API.

### 5. PostToolUse - Validation Tracker (`command`)

**Event:** `PostToolUse` with matcher `Bash`

Tracks whether this turn executed:
- likely mutating Bash commands
- test or validation commands
- failing validation commands

The tracker persists per-session turn state in:

- `.codex-hook-state/sessions/<session-id>.json`

Why this is practical:
- Codex `Stop` hooks do not automatically know what happened earlier in the turn, so stateful tracking is the cleanest way to build higher-level guardrails.

### 6. Stop - Validation Guardian (`command`)

**Event:** `Stop`

When Codex tries to finish a turn, this hook checks the tracked Bash activity:

- If a validation command failed, the hook continues the turn and tells Codex to fix it.
- If the turn ran mutating Bash commands but no validation command, the hook continues the turn and asks Codex to run an appropriate check.

Why this is practical:
- This is the closest supported approximation of Claude's "test guardian" stop hook.
- The limitation is important: current Codex hooks only see Bash events, so this guardian only reasons over Bash-driven changes, not native non-Bash tool calls.

## What Could Not Be Replicated

From the Claude example, these parts are not currently possible in Codex hooks:

1. `prompt` hook type
Codex has no prompt hook type that injects free-form reasoning prompts into the model. The closest supported mechanism is a `command` hook returning `additionalContext`.

2. `agent` hook type
Codex hooks cannot spawn a separate review agent from the hook runtime.

3. `http` hook type
Codex has no first-class webhook hook. This demo uses a local file logger as the closest practical substitute.

4. `Write|Edit` tool matchers
Current Codex `PreToolUse` and `PostToolUse` only receive `Bash`, so file-write-specific hooks are not available the way they are in Claude.

## Files

```text
7_hooks/
├── .codex/
│   ├── config.toml
│   ├── hooks.json
│   └── hooks/
│       ├── common.py
│       ├── post_tool_audit_logger.py
│       ├── post_tool_validation_tracker.py
│       ├── pre_tool_git_guardian.py
│       ├── session_start_context.py
│       ├── stop_validation_guardian.py
│       └── user_prompt_secret_guard.py
└── README.md
```

## How To Try It

This demo is self-contained inside `7_hooks`, so start Codex from this directory:

```bash
cd /home/lukas/Projects/Github/lukaskellerstein/vibe-coding-course/2_Codex/7_hooks
codex
```

The hook commands in `.codex/hooks.json` use `$PWD`, which keeps the demo local to this folder. If you move the hooks to the git repo root, switch those paths to `$(git rev-parse --show-toplevel)/.codex/hooks/...` instead.

### Suggested test scenarios

1. Prompt secret blocking

Paste a fake-looking credential pattern into your prompt, for example:

```text
Please save this token for later: <EXAMPLE_SECRET>
```

Expected result:
- `UserPromptSubmit` blocks the prompt.

2. Dangerous git blocking

Ask Codex to run:

```bash
git reset --hard
```

Expected result:
- `PreToolUse` denies the Bash command before it runs.

3. Audit logging

Ask Codex to run a harmless Bash command such as:

```bash
git status --short
```

Expected result:
- `PostToolUse` appends a record to `.codex-hook-state/audit-log.jsonl`.

4. Stop-time validation reminder

Ask Codex to run a mutating Bash command like:

```bash
touch tmp_demo_file.txt
```

Then let Codex finish the turn without running tests.

Expected result:
- `Stop` continues the turn and asks for a validation command.

5. Stop-time failed test reminder

Ask Codex to run:

```bash
pytest
```

if the workspace has failing tests, or any validation command that exits non-zero.

Expected result:
- `PostToolUse` records the failure.
- `Stop` continues the turn and tells Codex to address the failing validation.

## Key Takeaways

1. Codex hooks are already useful for deterministic workflow controls, especially around Bash usage.
2. The practical pattern in Codex today is `command` hooks plus small stateful scripts.
3. The biggest current limitation versus Claude is the lack of hook coverage for non-Bash write/edit tools.
4. If you need deeper semantic review, you currently need to build that into your normal Codex workflow, not the hook runtime itself.
