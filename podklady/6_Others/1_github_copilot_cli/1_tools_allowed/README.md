# 1. Tools Allowed

Copilot CLI access control has **two layers**:

1. **Per-session tool grants** — CLI flags at launch (`--allow-tool`, `--deny-tool`)
2. **Persistent directory trust** — `~/.copilot/settings.json` (`trusted_folders`)

There is **no per-project `settings.json`** like Claude Code — tool permissions don't persist across sessions, and the only persistent file (`settings.json`) is global, in your home directory.

## Layer 1 — CLI flags (per session)

| Flag | Purpose |
|------|---------|
| `--available-tools` | What the model *knows exists* |
| `--excluded-tools` | Hide tools from the model |
| `--allow-tool` | What the model can *execute without prompting* |
| `--deny-tool` | Refuse a tool even if generally allowed |
| `--allow-all-tools` | (sandbox only) bypass prompts entirely |

## Flag syntax cheatsheet

```bash
# Allow ALL shell commands (dangerous — sandbox only)
copilot --allow-tool=shell

# Allow specific git commands
copilot --allow-tool='shell(git commit)' --allow-tool='shell(git push)'

# Wildcard — allow any git subcommand
copilot --allow-tool='shell(git:*)'

# Allow MCP tool
copilot --allow-tool='MyMCP(create_issue)'

# Allow read tool, restrict write to specific file
copilot --allow-tool='read, write(.github/copilot-instructions.md)'

# Deny dangerous shell forms
copilot --deny-tool='shell(rm -rf:*)' --deny-tool='shell(sudo:*)'

# Nuclear option (only for sandboxes / disposable VMs)
copilot --allow-all-tools
```

## Slash command at runtime

Inside an interactive session:

```
/reset-allowed-tools     # revoke runtime grants, fall back to launch flags
```

## Examples

The two scripts in this folder show common patterns. They print the command they'd run — execute them yourself once you're happy with the flags.

| Script | What it does |
|--------|--------------|
| [`safe-launch.sh`](./safe-launch.sh) | Read-only research session — read/grep/glob allowed, all writes denied |
| [`dev-launch.sh`](./dev-launch.sh) | Normal dev session — read+write+selected git, dangerous shell denied |

## Layer 2 — `~/.copilot/settings.json`

The persistent settings file. Global only — Copilot CLI does **not** read a project-level `settings.json` the way Claude Code does.

```
~/.copilot/settings.json     # macOS/Linux
$HOME\.copilot\settings.json # Windows
```

Override the location via the `COPILOT_HOME` environment variable.

### Documented field: `trusted_folders`

When you start Copilot in a directory it hasn't seen before, it asks whether to trust it. If you pick "this and future sessions", the path is added to `trusted_folders`.

Trusting a folder means Copilot can read, modify, and execute files inside it without re-confirming on each session start. **Untrusted folders run in a more restricted mode.**

See [`settings.json`](./settings.json) in this folder for an annotated sample. Copy it to `~/.copilot/settings.json` after editing the paths.

### Editing

There is no `/config` or `copilot config` command — edit the JSON file directly with any editor:

```bash
$EDITOR ~/.copilot/settings.json
```

## Why CLI flags for tools (not JSON)?

Copilot CLI deliberately keeps tool permissions on the launch command:

- The security boundary is **visible at session start** — the user sees exactly what they granted.
- Prevents in-repo files from silently widening permissions.
- Forces a conscious choice each session (different tasks need different scopes).

For repeatable profiles, wrap them in shell scripts (like the two here) and commit those.
