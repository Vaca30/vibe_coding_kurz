# 6. Plugin — Bundling skills, agents & hooks

A **plugin** packages skills, agents, hooks, and MCP servers into one shareable, versioned unit. Same idea as Claude Code plugins — different manifest location and shape.

## Standalone vs Plugin

| Standalone (`.github/`) | Plugin (`plugin.json`) |
|--|--|
| Skills: `/screenshot` | Skills: `/docs-plugin:docs-check` (namespaced) |
| Project-only | Shareable, versioned, distributable |
| Each component lives at its conventional path | All components inside the plugin dir |

## Manifest

`plugin.json` lives at the **plugin root** (Claude Code puts it inside `.claude-plugin/` — Copilot does not).

```json
{
  "name": "docs-plugin",
  "version": "1.0.0",
  "description": "...",
  "author": { "name": "...", "email": "..." },
  "license": "MIT",
  "keywords": ["docs", "..."],
  "agents": "agents",
  "skills": "skills",
  "hooks": "hooks.json",
  "mcpServers": "mcp.json"
}
```

| Field | Purpose |
|-------|---------|
| `name` | Plugin id — used for namespacing (`/<name>:<skill>`) |
| `version` | Semver — bump on changes; cache invalidates on reinstall |
| `agents` | Directory containing `*.agent.md` files |
| `skills` | Directory (or array of dirs) containing `<skill>/SKILL.md` |
| `hooks` | Path to a `hooks.json` (same shape as lesson 5) |
| `mcpServers` | Path to an MCP config file |

## What this plugin does

`docs-plugin` automates documentation: scans code, detects stale docs, generates examples, and warns when docstrings are missing.

## Layout

```
docs-plugin/
├── plugin.json
├── skills/
│   ├── docs-generate/SKILL.md     # /docs-plugin:docs-generate — orchestrates 3 agents
│   ├── docs-check/SKILL.md        # /docs-plugin:docs-check — health audit
│   └── docs-api/SKILL.md          # /docs-plugin:docs-api — API reference generator
├── agents/
│   ├── code-scanner.agent.md
│   ├── staleness-checker.agent.md
│   └── example-generator.agent.md
├── hooks.json                     # PreToolUse + PostToolUse + sessionEnd
└── scripts/
    └── docs_sync_check.sh         # Used by the postToolUse hook
```

## Component breakdown

| Component | Type | Trigger |
|-----------|------|---------|
| `/docs-plugin:docs-generate` | skill | "generate docs", "document this code" |
| `/docs-plugin:docs-check` | skill | "audit docs", "are docs in sync?" |
| `/docs-plugin:docs-api` | skill | "API reference", "list endpoints" |
| `code-scanner` | agent | invoked by docs-generate |
| `staleness-checker` | agent | invoked by docs-generate |
| `example-generator` | agent | invoked by docs-generate |
| Hook: PreToolUse | command | reminds about companion docs |
| Hook: PostToolUse | command | warns about missing docstrings |
| Hook: sessionEnd | command | summarises which files lacked docstring updates |

## How to install

```bash
# From the plugin directory
copilot plugin install ./docs-plugin

# Verify
copilot plugin list

# Reinstall after changes (components are cached)
copilot plugin install --force ./docs-plugin
```

## Use it

```bash
copilot
```

```
/docs-plugin:docs-check
/docs-plugin:docs-generate
/docs-plugin:docs-api
```

Or by intent — e.g. *"Audit the documentation in this repo"* should match `docs-check` automatically.

## How components interact

```
/docs-plugin:docs-generate
   ├──▶ code-scanner       (parallel) ──┐
   ├──▶ staleness-checker  (parallel) ──┼──▶ doc plan ──▶ generate docs
   └──▶ example-generator  (parallel) ──┘

Edit *.py
   ├──▶ [PreToolUse]  reminds about companion docs in docs/
   └──▶ [PostToolUse] warns if public symbols added without docstrings

Session end
   └──▶ [sessionEnd]  reports which files still lack docstrings
```
