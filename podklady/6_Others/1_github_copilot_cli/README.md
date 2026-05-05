# GitHub Copilot CLI — Examples

A hands-on tour of GitHub Copilot CLI customization, mirroring the structure of the Claude Code course (`4_Claude_Code/`). Each lesson covers one principle: instructions, tools, MCP, skills, subagents, hooks, plugins, and marketplaces.

## Prerequisites

```bash
# Install the Copilot CLI
npm install -g @githubnext/github-copilot-cli   # check the latest install instructions
copilot --version
copilot login
```

## Lesson Map (Claude Code → Copilot CLI)

| Claude Code lesson | Copilot CLI equivalent | Key file(s) |
|---|---|---|
| `0_instructions` (CLAUDE.md) | `0_instructions` | `AGENTS.md` (or `.github/copilot-instructions.md`) |
| `1_tools_allowed` (settings.json) | `1_tools_allowed` | `~/.copilot/settings.json` + CLI flags `--allow-tool` / `--deny-tool` |
| `2_mcp` (.mcp.json) | `2_mcp` | `~/.copilot/mcp-config.json` |
| `3_skills` (.claude/skills/) | `3_skills` | `.github/skills/<name>/SKILL.md` |
| `4_subagent` (.claude/agents/) | `4_subagent` | `.github/agents/<name>.agent.md` |
| `7_hooks` (.claude/settings.json hooks) | `5_hooks` | `.github/hooks/hooks.json` |
| `8_plugin` (docs-plugin) | `6_plugin` | `plugin.json` + skills/agents/hooks |
| `9_marketplace` (marketplace.json) | `7_marketplace` | `.github/plugin/marketplace.json` |

## Differences vs Claude Code

- **Instructions**: Copilot CLI reads `AGENTS.md` (or `.github/copilot-instructions.md`). Claude reads `CLAUDE.md`.
- **Settings**: Copilot CLI's `~/.copilot/settings.json` is **global only** and primarily handles directory-trust (`trusted_folders`). Tool permissions live on the launch command (`--allow-tool` / `--deny-tool`), not in settings.json. Claude Code uses `permissions.allow` / `permissions.deny` in per-project `.claude/settings.json`.
- **MCP**: Copilot CLI's MCP config lives globally at `~/.copilot/mcp-config.json` (not per-project `.mcp.json`).
- **Skills**: Copilot CLI accepts `.github/skills/`, `.claude/skills/`, or `.agents/skills/` (and the same in `~`). Same `SKILL.md` shape.
- **Subagents**: Copilot CLI uses `<name>.agent.md` (suffix `.agent.md` is required). Claude uses plain `.md` files in `.claude/agents/`.
- **Hooks**: Copilot CLI hooks live in `.github/hooks/hooks.json` and have **6 events** (`sessionStart`, `sessionEnd`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `errorOccurred`). Hooks are command-only (bash/powershell), no `prompt` / `agent` / `http` types like Claude.
- **Plugins**: Copilot CLI plugin manifest is `plugin.json` at the **root** (Claude has it inside `.claude-plugin/`). Same general layout otherwise.
- **Marketplace**: Manifest is `marketplace.json` in `.github/plugin/` (or `.claude-plugin/`).

## Lessons

| # | Title | What you learn |
|---|-------|----------------|
| 0 | [Instructions](./0_instructions) | Project-wide guidance via `AGENTS.md` |
| 1 | [Tools Allowed](./1_tools_allowed) | Restricting and allowing tools via CLI flags |
| 2 | [MCP](./2_mcp) | Adding MCP servers (stdio + HTTP) |
| 3 | [Skills](./3_skills) | Authoring a project-level skill |
| 4 | [Subagent](./4_subagent) | Defining a custom subagent |
| 5 | [Hooks](./5_hooks) | All 6 hook events, blocking and observability |
| 6 | [Plugin](./6_plugin) | Bundling skills + agents + hooks into a plugin |
| 7 | [Marketplace](./7_marketplace) | Distributing plugins via a marketplace |

## Reference Docs

- Tools: <https://docs.github.com/en/copilot/how-tos/copilot-cli/allowing-tools>
- Hooks: <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks>
- Skills: <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills>
- MCP: <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers>
- Custom agents: <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli>
- Plugins: <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating>
- Marketplace: <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace>
