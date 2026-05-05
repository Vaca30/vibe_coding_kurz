# 0. Instructions — `AGENTS.md`

Project-wide guidance that Copilot CLI loads automatically at session start.

## Where instructions live

Copilot CLI looks for instruction files in the working directory. Use **one** of:

| File | Notes |
|------|-------|
| `AGENTS.md` | Cross-tool standard (also used by Codex, Cursor, Aider, Jules) |
| `.github/copilot-instructions.md` | GitHub-native location |
| `CLAUDE.md` | Recognised for Claude-compatibility |

This lesson uses **`AGENTS.md`** at the project root — it is portable across tools.

## How they're applied

The contents are injected into the session at startup. They are *guidance* (not enforcement) — the model treats them as a system message describing how to behave for this project. For enforcement, combine with `--deny-tool` (lesson 1) and hooks (lesson 5).

## Try it

```bash
cd 0_instructions
copilot
```

Then ask: `What language and package manager should I use for backend code?`

Copilot should answer with what's in `AGENTS.md` (Python + `uv`).

## Personal vs project instructions

- **Project**: `./AGENTS.md` (this lesson) — committed to the repo, applies to everyone working in it.
- **Personal**: `~/.copilot/AGENTS.md` (or `~/AGENTS.md`) — your private preferences, applied to every Copilot session you run.
