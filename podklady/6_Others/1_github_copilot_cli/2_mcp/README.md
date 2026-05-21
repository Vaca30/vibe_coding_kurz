# 2. MCP — Model Context Protocol Servers

Connect Copilot CLI to external tools via the [Model Context Protocol](https://modelcontextprotocol.io).

## Where the config lives

Copilot CLI's MCP config is **global** (per-user, not per-project):

```
~/.copilot/mcp-config.json
```

> Compare to Claude Code, where `.mcp.json` sits per-project at the repo root.

## File structure

```json
{
  "mcpServers": {
    "<server-name>": {
      "type": "local | http | sse",
      "command": "...",         // local only
      "args": [...],            // local only
      "env": { "KEY": "VAL" },  // local only — PATH inherited automatically
      "url": "https://...",     // http/sse only
      "headers": { ... },       // http/sse only
      "tools": ["*"]            // or comma-separated list of tool names
    }
  }
}
```

| Field | Required for | Notes |
|-------|--------------|-------|
| `type` | all | `local`/`stdio` for local processes, `http` or `sse` for remote |
| `command` + `args` | local | Executable + arguments |
| `env` | local | Inherits `PATH` automatically; everything else must be explicit |
| `url` | http/sse | Server endpoint |
| `headers` | http/sse | Auth and custom headers |
| `tools` | optional | `["*"]` exposes all server tools, or list specific ones |

## Sample config in this folder

[`mcp-config.json`](./mcp-config.json) demonstrates **three** servers:

| Server | Type | Purpose |
|--------|------|---------|
| `tavily` | stdio | Web search (Tavily MCP, runs via npx) |
| `playwright` | stdio | Browser automation (Playwright MCP) |
| `context7` | http | Library docs lookup (Context7 hosted MCP) |

## Install the sample

```bash
mkdir -p ~/.copilot
cp 2_mcp/mcp-config.json ~/.copilot/mcp-config.json

# Set the env vars referenced in the file
export TAVILY_API_KEY=tvly-...
```

## Manage servers from inside Copilot

```
/mcp add                  # interactive wizard
/mcp show                 # list configured servers
/mcp edit tavily          # edit one server
/mcp disable tavily       # turn off without deleting
/mcp delete tavily        # remove
```

## Allow MCP tools per session

Per lesson 1, MCP tools are still gated by tool permissions:

```bash
copilot --allow-tool='tavily(*)' --allow-tool='context7(get-library-docs)'
```

## Try it

After installing the config and exporting `TAVILY_API_KEY`:

```
Search the web for "FastAPI middleware best practices" and summarize the top 3 results.
```

If `tavily` is enabled and allowed, Copilot will call its `search` tool.
