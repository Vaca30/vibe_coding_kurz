# 7. Marketplace — Distributing plugins

A **plugin marketplace** is a Git repository (or local directory) that catalogues plugins so users can install them with one command.

## Manifest

Single required file:

```
.github/plugin/marketplace.json
```

> Copilot CLI also accepts `.claude-plugin/marketplace.json` for compatibility.

### Structure

```json
{
  "name": "marketplace-name",
  "owner": { "name": "...", "email": "..." },
  "metadata": {
    "description": "...",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "description": "...",
      "version": "1.0.0",
      "source": "./plugins/plugin-name"
    }
  ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | Marketplace id |
| `owner` | yes | `{ name, email }` |
| `metadata` | yes | `description` + `version` |
| `plugins` | yes | Array of plugin entries |
| `plugins[].source` | yes | Relative path to the plugin dir |

`source` can use `./plugins/foo` or `plugins/foo`. Symlinks are allowed — handy when you keep the plugin code in a separate folder during development.

## What's in this folder

```
7_marketplace/
├── .github/
│   └── plugin/
│       └── marketplace.json    # catalogue
└── plugins/
    ├── docs-plugin -> ../../6_plugin/docs-plugin   # symlink to lesson 6
    └── dev-tools-plugin/       # second plugin (skills + 1 agent)
```

## Add the marketplace

```bash
# Local marketplace (development)
copilot plugin marketplace add ./7_marketplace

# Remote marketplace (when published to GitHub)
copilot plugin marketplace add lukaskellerstein/vibe-coding-course
```

## Install plugins

```bash
copilot plugin install docs-plugin@vibe-coding-marketplace
copilot plugin install dev-tools-plugin@vibe-coding-marketplace

# List installed
copilot plugin list

# Update
copilot plugin install --force <name>@<marketplace>
```

## Plugins in this marketplace

### `docs-plugin` (from lesson 6)

Documentation automation — 3 skills, 3 agents, 3 hooks.

| Skills | Agents | Hooks |
|--------|--------|-------|
| `/docs-plugin:docs-generate` | `code-scanner` | `preToolUse` |
| `/docs-plugin:docs-check` | `staleness-checker` | `postToolUse` |
| `/docs-plugin:docs-api` | `example-generator` | `sessionEnd` |

### `dev-tools-plugin`

Cross-project dev tooling — git PR workflow, dead code detection, dependency updates.

| Skills | Agents |
|--------|--------|
| `/dev-tools-plugin:git-pr` | `dead-code-analyzer` |
| `/dev-tools-plugin:dead-code` | |
| `/dev-tools-plugin:update-dependencies` | |
