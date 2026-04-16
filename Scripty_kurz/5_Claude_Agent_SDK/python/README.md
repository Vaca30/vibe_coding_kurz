# Claude Agent SDK - Python Examples

Comprehensive examples demonstrating all patterns and capabilities of the Claude Agent SDK for Python.

## Overview

- **Single Agent Patterns** (17 examples covering basics through plugins)
- **Multi-Agent Systems** (3 coordination patterns)
- **Workflow Patterns** (4 execution patterns)

## Project Structure

```
python/
├── pyproject.toml
├── README.md
├── 1_single_agent/
│   ├── 0a_simplest_agent.py            # Simplest query()
│   ├── 0b_simplest_agent.py            # Simplest ClaudeSDKClient
│   ├── 1a_model.py                     # Anthropic cloud models
│   ├── 1b_local_model.py               # Local Ollama models
│   ├── 2a_agent_with_options.py        # query() capabilities & limitations
│   ├── 2b_agent_with_options.py        # ClaudeSDKClient full features
│   ├── 3a_agent_with_predefined_tools.py  # Built-in tools (Read, Write, Bash…)
│   ├── 3b_agent_with_custom_tools.py   # Custom MCP tools (@tool decorator)
│   ├── 3c_agent_with_mcp_tools.py      # External MCP servers (Playwright)
│   ├── 4_agent_with_memory.py          # Multi-turn conversations
│   ├── 5_agent_with_hooks.py           # PreToolUse, PostToolUse, UserPromptSubmit
│   ├── 6_agent_with_subagents.py       # Specialized subagents
│   ├── 7_agent_with_subagents_mcp.py   # Subagents with MCP tools
│   ├── 8_skills/
│   │   ├── 8_agent_with_skills.py      # Skills (auto-discovered)
│   │   └── .claude/skills/color-palette/SKILL.md
│   ├── 9_plugins/
│   │   ├── 9_agent_with_plugins.py     # Plugins (bundled extensions)
│   │   └── demo-plugin/
│   └── 10_marketplace/
│       └── 10_agent_with_marketplace.py # Marketplace plugins (git-hosted)
├── 2_multi_agent/
│   ├── 1_collaboration_pattern.py      # Sequential equal agents
│   ├── 2_supervisor_pattern.py         # Hierarchical delegation
│   └── 3_swarm_pattern.py             # Dynamic handoffs
└── 3_workflows/
    ├── 1_sequential_workflow.py         # Chain pattern (A → B → C)
    ├── 2_parallel_workflow.py           # Fan-out/fan-in pattern
    ├── 3_conditional_workflow.py        # IF/ELSE routing
    └── 4_loop_workflow.py              # Iterative refinement
```

## Setup

### Prerequisites

- Python 3.10+
- [uv](https://github.com/astral-sh/uv) package manager

### Installation

```bash
uv venv
source .venv/bin/activate
uv sync
```

## Single Agent Examples

### 0a) Simplest Agent — `query()`

The most basic usage: a single stateless query.

```bash
python 1_single_agent/0a_simplest_agent.py
```

**Demonstrates:** `query()` function, `AssistantMessage`/`ResultMessage` handling, cost tracking.

### 0b) Simplest Agent — `ClaudeSDKClient`

Same simple query using the stateful `ClaudeSDKClient` context manager.

```bash
python 1_single_agent/0b_simplest_agent.py
```

**Demonstrates:** `ClaudeSDKClient`, `async with` lifecycle, `client.query()` + `client.receive_response()`.

### 1a) Anthropic Cloud Model

Using a specific Anthropic cloud model with both APIs.

```bash
python 1_single_agent/1a_model.py
```

**Demonstrates:** Model selection (`claude-sonnet-4-5-20250929`), system prompts, one-shot vs multi-turn.

### 1b) Local Model (Ollama)

Using a local Ollama model instead of the Anthropic API.

```bash
python 1_single_agent/1b_local_model.py
```

**Demonstrates:** `ANTHROPIC_BASE_URL` override, local `gpt-oss` model, identical API patterns.

### 2a) Agent Options — `query()` Capabilities & Limitations

Shows what `query()` can and cannot do.

```bash
python 1_single_agent/2a_agent_with_options.py
```

**Demonstrates:** Single-turn queries work, but NO multi-turn memory, NO hooks, NO custom tools, NO `interrupt()`.

### 2b) Agent Options — `ClaudeSDKClient` Full Features

Full feature demo of the stateful client.

```bash
python 1_single_agent/2b_agent_with_options.py
```

**Demonstrates:** Multi-turn memory, append system prompt, custom tools (`@tool`), hooks, `interrupt()`, session lifecycle.

### 3a) Predefined Tools

Using built-in Claude Code tools with both `query()` and `ClaudeSDKClient`.

```bash
python 1_single_agent/3a_agent_with_predefined_tools.py
```

**Demonstrates:** Read, Write, Bash, Glob, Grep, Edit tools.

### 3b) Custom Tools (MCP)

Creating custom tools using `@tool` decorator and `create_sdk_mcp_server()`.

```bash
python 1_single_agent/3b_agent_with_custom_tools.py
```

**Demonstrates:** Stock market tools (`get_stock_price`, `get_dividend_date`) powered by yfinance.

### 3c) External MCP Tools (Playwright)

Connecting to external MCP servers running as separate processes.

```bash
python 1_single_agent/3c_agent_with_mcp_tools.py
```

**Demonstrates:** `McpStdioServerConfig`, Playwright browser automation, multiple external MCP servers.

### 4) Agent with Memory

Multi-turn conversations with context retention.

```bash
python 1_single_agent/4_agent_with_memory.py
```

**Demonstrates:** `query()` has NO memory (baseline), `ClaudeSDKClient` retains context, session continuation via `resume`.

### 5) Agent with Hooks

Intercepting and modifying agent behavior.

```bash
python 1_single_agent/5_agent_with_hooks.py
```

**Demonstrates:** `PreToolUse` (safety validation), `PostToolUse` (logging), `UserPromptSubmit` (context injection), `HookMatcher`.

### 6) Agent with Subagents

Specialized subagents with custom roles and tools.

```bash
python 1_single_agent/6_agent_with_subagents.py
```

**Demonstrates:** `AgentDefinition`, code reviewer, documentation writer, test writer, hierarchical agents.

### 7) Agent with Subagents + MCP Tools

Subagents with access to custom and external MCP tools.

```bash
python 1_single_agent/7_agent_with_subagents_mcp.py
```

**Demonstrates:** Financial subagents with custom tools, web research subagent with Playwright, tool access control per subagent, main agent with NO/LIMITED tools.

### 8) Agent with Skills

Using skills for domain-specific knowledge (auto-discovered).

```bash
python 1_single_agent/8_skills/8_agent_with_skills.py
```

**Demonstrates:** `setting_sources=["project"]`, `.claude/skills/` directory, `color-palette` skill with brand colors. Prompts do NOT mention skills — the agent discovers them automatically.

### 9) Agent with Plugins

Loading self-contained plugin packages.

```bash
python 1_single_agent/9_plugins/9_agent_with_plugins.py
```

**Demonstrates:** `plugins` option, `demo-plugin` with GeoCities HTML skill + haiku-footer agent. Prompts do NOT name any plugin component — auto-selection.

### 10) Agent with Marketplace

Pulling plugins from an external git-hosted marketplace.

```bash
python 1_single_agent/10_marketplace/10_agent_with_marketplace.py
```

**Demonstrates:** Git-based marketplace, `marketplace.json` index, automatic plugin discovery, multiple plugins working together.

## Multi-Agent Examples

### 1) Collaboration Pattern

Sequential execution where all agents are equal.

```bash
python 2_multi_agent/1_collaboration_pattern.py
```

**Pattern:** Agent A → Agent B → Agent C. Output flows between agents. Software dev workflow (requirements → architecture → implementation).

### 2) Supervisor Pattern

Hierarchical delegation with a supervisor coordinator.

```bash
python 2_multi_agent/2_supervisor_pattern.py
```

**Pattern:** Supervisor delegates to team members via built-in "Agent" tool. Research team (data-collector, analyst, report-writer).

### 3) Swarm Pattern

Autonomous agents with dynamic handoffs.

```bash
python 2_multi_agent/3_swarm_pattern.py
```

**Pattern:** No hierarchy, no predefined order. Each agent has a handoff list and decides the next agent autonomously. Customer support system (triage → technical/billing/account).

## Workflow Examples

### 1) Sequential Workflow

Chain pattern: multi-step sequential processing.

```bash
python 3_workflows/1_sequential_workflow.py
```

**Pattern:** Research → Analyze → Summarize. Each step depends on the previous.

### 2) Parallel Workflow

Fan-out/fan-in pattern with concurrent execution.

```bash
python 3_workflows/2_parallel_workflow.py
```

**Pattern:** Multiple specialists analyze in parallel (`anyio.create_task_group()`), then a synthesizer aggregates results.

### 3) Conditional Workflow

IF/ELSE routing based on classification.

```bash
python 3_workflows/3_conditional_workflow.py
```

**Pattern:** Classifier → route to Technical/Creative/Analytical/General handler.

### 4) Loop Workflow

Iterative refinement until a condition is met.

```bash
python 3_workflows/4_loop_workflow.py
```

**Pattern:** Generate → Evaluate → Refine → loop until quality threshold met.

## Key Concepts

### Two Main APIs

| | `query()` | `ClaudeSDKClient` |
|---|---|---|
| Session | Fresh every call | Persistent within `async with` |
| Memory | None | Full context retention |
| Hooks | Not supported | Supported |
| Custom tools | Not supported | Supported (`@tool`) |
| `interrupt()` | Not available | Available |
| Best for | One-shot requests | Complex interactions |

### ClaudeAgentOptions

```python
options = ClaudeAgentOptions(
    model="claude-sonnet-4-5-20250929",
    system_prompt="You are...",
    allowed_tools=["Read", "Write", "Bash"],
    max_turns=10,
    permission_mode="acceptEdits",
    mcp_servers={"name": server},
    agents={"name": AgentDefinition(...)},
    hooks={"PreToolUse": [HookMatcher(...)]},
    plugins=[{"type": "local", "path": "..."}],
    resume="session_id",
    setting_sources=["project"],
    cwd="/path/to/workdir",
)
```

### Custom Tools

```python
@tool("add", "Add two numbers", {"a": float, "b": float})
async def add_numbers(args):
    return {"content": [{"type": "text", "text": f"Result: {args['a'] + args['b']}"}]}

server = create_sdk_mcp_server(name="calc", version="1.0.0", tools=[add_numbers])
```

### Message Types

- `AssistantMessage` — Claude's response (contains `TextBlock`, `ToolUseBlock`)
- `ResultMessage` — Final result with `total_cost_usd`, `num_turns`, `duration_ms`, `session_id`
- `UserMessage` — User input
- `SystemMessage` — System notifications

## Dependencies

```
claude-agent-sdk >= 0.1.53
anyio >= 4.0.0
yfinance >= 0.2.66    # For stock market examples
```

## Troubleshooting

| Issue | Solution |
|---|---|
| "Not connected" error | Use `async with ClaudeSDKClient()` |
| Tools not working | Add to `allowed_tools` list |
| High costs | Set `max_turns` to limit turns |
| Permission denied | Set `permission_mode="bypassPermissions"` |
| Local model not working | Ensure Ollama is running: `ollama serve` |
