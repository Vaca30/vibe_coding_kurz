# 9. Marketplace — Plugin Distribution

A Claude Code **plugin marketplace** that distributes plugins to users. Both plugins use relative-path sources within the marketplace.

## What This Demonstrates

| Concept | Implementation |
|---------|---------------|
| **Marketplace manifest** | `.claude-plugin/marketplace.json` |
| **Plugin source (relative path)** | `docs-plugin` and `dev-tools-plugin` in `plugins/` |
| **Plugin installation** | `/plugin install docs-plugin@vibe-coding-marketplace` |

## Marketplace Structure

```
9_marketplace/
  .claude-plugin/
    marketplace.json                   # Marketplace catalog
  plugins/
    docs-plugin -> ../../8_plugin/docs-plugin   # Symlink to lesson 8 plugin
    dev-tools-plugin/                  # Copied from claude-my-marketplace
      .claude-plugin/plugin.json
      skills/
      agents/
```

## Plugins in This Marketplace

### 1. `docs-plugin`

Source: `./plugins/docs-plugin` (symlink to `8_plugin/docs-plugin`)

Documentation automation plugin with 3 skills, 3 agents, and 3 hooks. See `8_plugin/README.md` for details.

| Skills | Agents | Hooks |
|--------|--------|-------|
| `/docs-plugin:docs-generate` | `code-scanner` | PreToolUse: docs reminder |
| `/docs-plugin:docs-check` | `staleness-checker` | PostToolUse: docstring sync |
| `/docs-plugin:docs-api` | `example-generator` | Stop: doc check |

### 2. `dev-tools-plugin`

Source: `./plugins/dev-tools-plugin` (copied from `lukaskellerstein/claude-my-marketplace`)

General developer tooling with git workflows, code hygiene, and dependency management.

| Skills | Agents |
|--------|--------|
| `/dev-tools-plugin:git-pr` | `dead-code-analyzer` |
| `/dev-tools-plugin:dead-code` | `sync-spec-kit-agent` |
| `/dev-tools-plugin:update-dependencies` | |
| `/dev-tools-plugin:sync-spec-kit` | |

## How to Use

### Add the marketplace (local testing)

```bash
# From within Claude Code
/plugin marketplace add ./9_marketplace
```

### Install plugins

```bash
/plugin install docs-plugin@vibe-coding-marketplace
/plugin install dev-tools-plugin@vibe-coding-marketplace
```

### If hosted on GitHub

```bash
# Users add with the GitHub repo
/plugin marketplace add lukaskellerstein/vibe-coding-course

# Then install
/plugin install docs-plugin@vibe-coding-marketplace
```
