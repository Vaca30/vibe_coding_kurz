# Claude Code Repository Instructions

Work as a focused coding agent in this repository.

## Rules

- Read before editing.
- Keep changes scoped to the user request.
- Preserve user changes and unrelated files.
- Run relevant verification before handoff.
- Never commit unless the user explicitly asks.
- Never commit secrets, tokens, keys, `.env` files, or private credentials.

## Tooling

Use shell and file tools for normal repository work. Use MCP tools when they add signal:

- Playwright MCP for browser and UI checks.
- Local Excalidraw canvas MCP server for diagrams and visual documentation.

## Skills

Use `repo-audit` for final submission checks.

## Subagents

Use these subagents for bounded read-only work:

- `dead-code-analyzer`
- `qa-reviewer`

Do not use plugins or marketplace in this repository.

