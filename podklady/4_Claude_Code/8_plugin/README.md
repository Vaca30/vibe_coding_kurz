# 8. Plugin — Documentation Plugin

A real Claude Code **plugin** (not standalone `.claude/` config) that combines **skills**, **agents**, and **hooks** into a cohesive documentation automation tool.

## Standalone vs Plugin

| Standalone (`.claude/` directory) | Plugin (`.claude-plugin/plugin.json`) |
|-----------------------------------|---------------------------------------|
| Skills: `/hello` | Skills: `/docs-plugin:hello` (namespaced) |
| Personal, project-specific | Shareable, distributable, versioned |
| Hooks in `settings.json` | Hooks in `hooks/hooks.json` |
| Files in `.claude/skills/` | Files in `plugin-root/skills/` |

This example uses the **plugin** format. See [docs](https://code.claude.com/docs/en/plugins).

## What This Demonstrates

| Component | Count | Purpose |
|-----------|-------|---------|
| **Plugin manifest** | 1 | `.claude-plugin/plugin.json` — identity, version, metadata |
| **Skills** | 3 | `/docs-plugin:docs-generate`, `/docs-plugin:docs-check`, `/docs-plugin:docs-api` |
| **Agents** | 3 | Specialized subagents launched in parallel by `/docs-plugin:docs-generate` |
| **Hooks** | 3 | `hooks/hooks.json` — PreToolUse, PostToolUse, Stop |
| **Scripts** | 2 | Python hook scripts referenced via `${CLAUDE_PLUGIN_ROOT}` |

## Plugin Structure

```
docs-plugin/                           # <-- The plugin directory
  .claude-plugin/
    plugin.json                        # Plugin manifest (name, version, description)
  skills/
    docs-generate/SKILL.md             # /docs-plugin:docs-generate — parallel agents
    docs-check/SKILL.md                # /docs-plugin:docs-check — health audit
    docs-api/SKILL.md                  # /docs-plugin:docs-api — API reference
  agents/
    code-scanner.md                    # Finds all public interfaces
    staleness-checker.md               # Detects stale/outdated docs
    example-generator.md               # Generates usage examples
  hooks/
    hooks.json                         # Hook configuration (PreToolUse, PostToolUse, Stop)
  scripts/
    pretool_docs_reminder.py           # Reminds about companion docs
    posttool_docs_sync.py              # Warns about missing docstrings (AST-based)

sample-project/                        # Demo FastAPI app to test the plugin against
  src/
    main.py, api.py, models.py, utils.py
  tests/
    test_api.py
  docs/
    README.md
```

**Key structural differences from standalone:**
- `plugin.json` goes inside `.claude-plugin/` (only file there)
- `skills/`, `agents/`, `hooks/` are at the **plugin root** (NOT inside `.claude-plugin/`)
- Hooks are in `hooks/hooks.json` (NOT in `settings.json`)
- Scripts use `${CLAUDE_PLUGIN_ROOT}` to reference paths

## How to Test

```bash
# Load the plugin locally for development
claude --plugin-dir ./docs-plugin

# Try the namespaced skills
/docs-plugin:docs-check
/docs-plugin:docs-generate
/docs-plugin:docs-api

# Check agents are registered
/agents

# Reload after changes
/reload-plugins
```

## Skills

### `/docs-plugin:docs-generate`
Launches 3 agents in parallel (`code-scanner`, `staleness-checker`, `example-generator`) to analyze the codebase. Synthesizes results into a documentation plan and generates/updates docs.

**Pattern demonstrated:** Skill orchestrating multiple parallel agents.

### `/docs-plugin:docs-check`
Audits documentation health. Scans code for public interfaces, cross-references with existing docs, produces a health report with coverage %, stale docs, and priority fixes.

**Pattern demonstrated:** Linear analytical skill with structured report output.

### `/docs-plugin:docs-api`
Auto-detects API framework (FastAPI, Flask, Express) and generates a structured API endpoint reference with methods, parameters, schemas, and curl examples.

**Pattern demonstrated:** Domain-specific skill with framework auto-detection.

## Agents

| Agent | Model | Launched By | Purpose |
|-------|-------|------------|---------|
| `docs-plugin:code-scanner` | sonnet | `/docs-plugin:docs-generate` | Scans source files, lists public symbols with signatures |
| `docs-plugin:staleness-checker` | sonnet | `/docs-plugin:docs-generate` | Compares existing docs against current code |
| `docs-plugin:example-generator` | sonnet | `/docs-plugin:docs-generate` | Generates usage examples from code and tests |

## Hooks (in `hooks/hooks.json`)

| Hook | Event | Matcher | Behavior |
|------|-------|---------|----------|
| **Docs Reminder** | PreToolUse | `Write\|Edit` | Checks for companion docs, advises (does NOT block) |
| **Docs Sync** | PostToolUse | `Write\|Edit` | AST-based docstring check, warns about missing docstrings |
| **Doc Check** | Stop | — | Checks if changed code has updated documentation |

Hook scripts:
- Use `${CLAUDE_PLUGIN_ROOT}/scripts/...` for paths (plugin-portable)
- Python stdlib only (`json`, `sys`, `ast`, `pathlib`) — zero external dependencies

## Sample Project

The `sample-project/` contains a FastAPI bookstore API with **intentional documentation gaps**:

- `src/utils.py` — 6 public functions, zero docstrings
- `src/api.py` — 11 endpoints, only 1 has a docstring
- `src/models.py` — 3 models missing docstrings
- `docs/README.md` — missing endpoints, incomplete fields

Test the plugin:
1. `claude --plugin-dir ./docs-plugin` (in the `8_plugin` directory)
2. Run `/docs-plugin:docs-check` to see the health report
3. Run `/docs-plugin:docs-generate` to auto-generate missing docs
4. Run `/docs-plugin:docs-api` to generate the API reference

## How Components Interact

```
/docs-plugin:docs-generate ──> code-scanner      (parallel) ──┐
                           ──> staleness-checker  (parallel) ──┼──> doc plan ──> generate docs
                           ──> example-generator  (parallel) ──┘

Any code edit ──> [PreToolUse hook: reminds about companion docs]
              ──> [PostToolUse hook: warns about missing docstrings]

Session ends ──> [Stop hook: checks if changed code has updated docs]
```
