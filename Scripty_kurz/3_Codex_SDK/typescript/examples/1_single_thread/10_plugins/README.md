# Plugins & Marketplace

## SDK Support

**Plugins are NOT directly supported by the Codex TypeScript SDK.**

The SDK has no `plugins` parameter. Plugins are configured in `.codex/config.toml` and managed by the Codex CLI.

## How Plugins Work in Codex

Plugins are extensions that can bundle skills, MCP servers, and app connectors. They are loaded from local paths or discovered from a marketplace.

### config.toml Format

```toml
[plugins.my-local-plugin]
enabled = true

[plugins.another-plugin]
enabled = false
```

### Plugin Contents

A plugin can contain any combination of:
- **Skills** (`SKILL.md` files) - instruction sets auto-applied when relevant
- **MCP Servers** - tool providers exposing custom tools
- **App Connectors** - external service integrations

### Marketplace Support

Codex supports two types of plugin marketplaces:
- **Curated marketplace** - official, vetted plugins
- **Repository marketplace** - community plugins, repo-specific

Plugin management is handled by the CLI with APIs for:
- `plugin/list` - discover available plugins
- `plugin/install` - install a plugin
- `plugin/uninstall` - remove a plugin
- `plugin/read` - read plugin details

## Using with the SDK

Configure plugins in the project's `.codex/config.toml` and set `workingDirectory`:

```typescript
const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: "/path/to/project-with-plugins-config",
});
// Plugins from .codex/config.toml are loaded by the CLI
```

**Limitation**: All threads using the same `workingDirectory` share the same plugin config. Plugin installation/management must be done through the CLI, not the SDK.

## Comparison with Claude SDK

| Aspect | Claude SDK | Codex SDK |
|--------|-----------|-----------|
| Configuration | `options.plugins` parameter in `query()` | `.codex/config.toml` `[plugins]` section |
| Local loading | Plugin paths in options | config.toml entries |
| Marketplace | Git-based marketplace sync | Curated + repository marketplaces |
| SDK API | Direct `plugins: ["/path/to/plugin"]` | None (filesystem config only) |
| Per-thread isolation | Yes (different plugins per query) | No (shared via filesystem) |
| Plugin contents | Skills, agents | Skills, MCP servers, connectors |
