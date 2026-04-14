# 9. Marketplace - Plugin Distribution

A Codex plugin marketplace that mirrors the Claude marketplace lesson, but uses Codex's repo-local marketplace metadata format.

> Important: Seeing a plugin in the marketplace does not install it. You still need to install marketplace plugins manually in the Codex UI.

## What This Demonstrates

| Concept | Implementation |
|---------|----------------|
| Marketplace manifest | `.agents/plugins/marketplace.json` |
| Relative plugin sources | `./plugins/docs-plugin` and `./plugins/dev-tools-plugin` |
| Manual installation requirement | Marketplace plugins must still be installed manually in Codex |
| Required plugin entry metadata | `policy.installation`, `policy.authentication`, `category` |
| Install policy metadata | `policy.installation` affects catalog policy, not automatic installation |
| Repo-scoped marketplace | Codex reads the catalog from this repo after restart |

## Marketplace Structure

```text
9_marketplace/
  .agents/
    plugins/
      marketplace.json                 # Codex marketplace catalog
  plugins/
    docs-plugin -> ../../8_plugin/docs-plugin
    dev-tools-plugin/
      .codex-plugin/plugin.json
      skills/
      agents/
```

`source.path` is resolved relative to the marketplace root, not relative to `.agents/plugins/`.

## Marketplace Metadata

Codex expects repo marketplaces at:

```text
$REPO_ROOT/.agents/plugins/marketplace.json
```

This lesson's catalog contains two local plugin entries. Each entry must include:

- `source.path` with a `./`-prefixed path inside the marketplace root
- `policy.installation`
- `policy.authentication`
- `category`

`policy.installation` controls how Codex labels the plugin in the marketplace:

- `"AVAILABLE"`: optional install
- `"INSTALLED_BY_DEFAULT"`: marked as available by default
- `"NOT_AVAILABLE"`: visible but not installable

That policy does not automatically install the plugin into the local Codex environment.

Manual installation is still required in Codex:

1. Open the plugin directory.
2. Choose `Vibe Coding Marketplace`.
3. Install `docs-plugin`.
4. Install `dev-tools-plugin`.

## Plugins in This Marketplace

### 1. `docs-plugin`

Source: `./plugins/docs-plugin` via symlink to `../../8_plugin/docs-plugin`

Documentation workflow plugin with three Codex skills and a lightweight Stop hook reminder.

| Skills | Hooks |
|--------|-------|
| `docs-generate` | `Stop`: docs completion reminder |
| `docs-check` | |
| `docs-api` | |

### 2. `dev-tools-plugin`

Source: `./plugins/dev-tools-plugin`

Developer workflow plugin for git, dead-code analysis, dependency updates, and spec synchronization.

| Skills | Supporting prompts |
|--------|--------------------|
| `git-pr` | `agents/dead-code-analyzer.md` |
| `dead-code` | `agents/sync-spec-kit-agent.md` |
| `update-dependencies` | |
| `sync-spec-kit` | |

## How to Use

Start or restart Codex from this folder:

```bash
cd /home/lukas/Projects/Github/lukaskellerstein/vibe-coding-course/2_Codex/9_marketplace
codex
```

Then open the plugin directory. Codex should show the marketplace title `Vibe Coding Marketplace` with:

- `docs-plugin`
- `dev-tools-plugin`

Install both plugins manually from the marketplace inside Codex.

This lesson currently uses `AVAILABLE` to demonstrate the policy flag, but the actual install step still has to be done by the user in Codex.

## Reference

Codex plugin build docs: <https://developers.openai.com/codex/plugins/build#marketplace-metadata>
