# Claude Agent SDK - TypeScript Examples

Comprehensive examples demonstrating all patterns and capabilities of the Claude Agent SDK for TypeScript.

## Overview

- **Single Agent Patterns** (17 examples covering basics through plugins)
- **Multi-Agent Systems** (3 coordination patterns)
- **Workflow Patterns** (4 execution patterns)

## Project Structure

```
typescript/
├── package.json
├── tsconfig.json
├── README.md
├── img/                                 # Images for vision examples
├── src/
│   ├── 1_single_agent/
│   │   ├── 0a_simplest_agent.ts            # Simplest query()
│   │   ├── 0b_simplest_agent.ts            # Streaming responses
│   │   ├── 1a_model.ts                     # Anthropic cloud models
│   │   ├── 1b_local_model.ts               # Local Ollama models
│   │   ├── 2a_agent_with_options.ts        # query() with options
│   │   ├── 2b_agent_with_options.ts        # Full features demo
│   │   ├── 3a_agent_with_predefined_tools.ts  # Built-in tools (Read, Write, Bash…)
│   │   ├── 3b_agent_with_custom_tools.ts   # Custom MCP tools (tool() + Zod)
│   │   ├── 3c_agent_with_mcp_tools.ts      # External MCP servers (Playwright)
│   │   ├── 4_agent_with_memory.ts          # Multi-turn conversations
│   │   ├── 5_agent_with_hooks.ts           # PreToolUse, PostToolUse, UserPromptSubmit
│   │   ├── 6_agent_with_subagents.ts       # Specialized subagents
│   │   ├── 6_agent_with_images.ts          # Vision / image analysis
│   │   ├── 7_agent_with_subagents_mcp.ts   # Subagents with MCP tools
│   │   ├── 8_skills/
│   │   │   ├── 8_agent_with_skills.ts      # Skills (auto-discovered)
│   │   │   └── .claude/skills/color-palette/SKILL.md
│   │   ├── 9_plugins/
│   │   │   ├── 9_agent_with_plugins.ts     # Plugins (bundled extensions)
│   │   │   └── demo-plugin/
│   │   └── 10_marketplace/
│   │       └── 10_agent_with_marketplace.ts # Marketplace plugins (git-hosted)
│   ├── 2_multi_agent/
│   │   ├── 1_collaboration_pattern.ts      # Sequential equal agents
│   │   ├── 2_supervisor_pattern.ts         # Hierarchical delegation
│   │   └── 3_swarm_pattern.ts             # Dynamic handoffs
│   └── 3_workflows/
│       ├── 1_sequential_workflow.ts         # Chain pattern (A → B → C)
│       ├── 2_parallel_workflow.ts           # Fan-out/fan-in pattern
│       ├── 3_conditional_workflow.ts        # IF/ELSE routing
│       └── 4_loop_workflow.ts              # Iterative refinement
```

## Setup

### Prerequisites

- Node.js 18.0.0+
- npm

### Installation

```bash
npm install
```

## Running Examples

All examples can be run via npm scripts:

```bash
npm run example:0a     # Simplest agent
npm run example:0b     # Streaming
npm run example:1a     # Cloud model
npm run example:1b     # Local model
npm run example:2a     # Options (query)
npm run example:2b     # Options (full features)
npm run example:3a     # Predefined tools
npm run example:3b     # Custom tools
npm run example:3c     # External MCP tools
npm run example:4      # Memory
npm run example:5      # Hooks
npm run example:6      # Subagents
npm run example:images # Image analysis
npm run example:7      # Subagents + MCP
npm run example:8      # Skills
npm run example:9      # Plugins
npm run example:10     # Marketplace
npm run example:collab # Collaboration pattern
npm run example:super  # Supervisor pattern
npm run example:swarm  # Swarm pattern
npm run example:seq    # Sequential workflow
npm run example:par    # Parallel workflow
npm run example:cond   # Conditional workflow
npm run example:loop   # Loop workflow
```

## Single Agent Examples

### 0a) Simplest Agent

The most basic usage: a single stateless query.

```bash
npm run example:0a
```

**Demonstrates:** `query()` function, `SDKAssistantMessage`/`SDKResultMessage` handling, cost tracking.

### 0b) Simplest Agent — Streaming

Real-time streaming responses.

```bash
npm run example:0b
```

**Demonstrates:** `streaming: true` option, `partial_assistant_message` events, text deltas for real-time output.

### 1a) Anthropic Cloud Model

Using a specific Anthropic cloud model with one-shot and multi-turn patterns.

```bash
npm run example:1a
```

**Demonstrates:** Model selection (`claude-sonnet-4-5-20250929`), system prompts, async generator for multi-turn.

### 1b) Local Model (Ollama)

Using a local Ollama model instead of the Anthropic API.

```bash
npm run example:1b
```

**Demonstrates:** `ANTHROPIC_BASE_URL` override via `process.env`, local `gpt-oss` model, identical API patterns.

### 2a) Agent Options — `query()` with Configuration

Shows how to configure agents with system prompts, model selection, permissions, and max turns.

```bash
npm run example:2a
```

**Demonstrates:** `systemPrompt`, `model`, `maxTurns`, `permissionMode`, combined options.

### 2b) Agent Options — Full Features

Full feature demo: multi-turn, append system prompt, custom tools, hooks, session continuation.

```bash
npm run example:2b
```

**Demonstrates:** Async generators for multi-turn memory, `SystemPromptPreset` with append, `tool()` + `createSdkMcpServer()`, `PreToolUse`/`PostToolUse` hooks, `resume` for session continuation.

### 3a) Predefined Tools

Using built-in Claude Code tools.

```bash
npm run example:3a
```

**Demonstrates:** Read, Write, Bash, Glob, Grep tools, `permissionMode: 'bypassPermissions'`.

### 3b) Custom Tools (MCP)

Creating custom tools using `tool()` function and Zod schemas.

```bash
npm run example:3b
```

**Demonstrates:** Calculator tools (add, multiply, power), string tools (reverse, uppercase, word_count), multiple MCP servers.

### 3c) External MCP Tools (Playwright)

Connecting to external MCP servers running as separate processes.

```bash
npm run example:3c
```

**Demonstrates:** Playwright browser automation via `{ command, args }` config, navigation, snapshots, screenshots, multiple MCP servers.

### 4) Agent with Memory

Multi-turn conversations with context retention.

```bash
npm run example:4
```

**Demonstrates:** Async generators (`AsyncGenerator<SDKUserMessage>`) for multi-turn, session continuation via `resume`.

### 5) Agent with Hooks

Intercepting and modifying agent behavior.

```bash
npm run example:5
```

**Demonstrates:** `HookCallback` type, `PreToolUse` (safety validation), `PostToolUse` (logging), `UserPromptSubmit` (context injection), hook matchers.

### 6) Agent with Subagents

Specialized subagents with custom roles and tools.

```bash
npm run example:6
```

**Demonstrates:** `AgentDefinition`, code reviewer, documentation writer, test writer, hierarchical agents, per-agent model selection.

### 6) Agent with Images

Passing images to Claude for vision-based analysis.

```bash
npm run example:images
```

**Demonstrates:** Base64 image encoding, single/multiple image analysis, multi-turn conversation with images.

### 7) Agent with Subagents + MCP Tools

Subagents with access to custom MCP tools.

```bash
npm run example:7
```

**Demonstrates:** Data analysis tools (average, stddev, min/max), text analysis tools (word count, keywords), multiple subagents with different tool sets.

### 8) Agent with Skills

Using skills for domain-specific knowledge (auto-discovered).

```bash
npm run example:8
```

**Demonstrates:** `settingSources: ['project']`, `.claude/skills/` directory, `color-palette` skill. Prompts do NOT mention skills — the agent discovers them automatically.

### 9) Agent with Plugins

Loading self-contained plugin packages.

```bash
npm run example:9
```

**Demonstrates:** `plugins` option, `demo-plugin` with GeoCities HTML skill + haiku-footer agent. Auto-selection without naming.

### 10) Agent with Marketplace

Pulling plugins from an external git-hosted marketplace.

```bash
npm run example:10
```

**Demonstrates:** Git-based marketplace cloning, `marketplace.json` index, automatic plugin discovery, multiple plugins.

## Multi-Agent Examples

### 1) Collaboration Pattern

Sequential execution where all agents are equal.

```bash
npm run example:collab
```

**Pattern:** Agent A → Agent B → Agent C. Software dev workflow (requirements → architecture → implementation).

### 2) Supervisor Pattern

Hierarchical delegation with a supervisor coordinator.

```bash
npm run example:super
```

**Pattern:** Supervisor delegates to team members via built-in "Agent" tool. Research team (data-collector, analyst, report-writer).

### 3) Swarm Pattern

Autonomous agents with dynamic handoffs.

```bash
npm run example:swarm
```

**Pattern:** No hierarchy, no predefined order. Each agent decides the next agent. Customer support system (triage → technical/billing/account).

## Workflow Examples

### 1) Sequential Workflow

Chain pattern: multi-step sequential processing.

```bash
npm run example:seq
```

**Pattern:** Research → Analyze → Summarize. Each step depends on the previous.

### 2) Parallel Workflow

Fan-out/fan-in pattern with concurrent execution.

```bash
npm run example:par
```

**Pattern:** Multiple specialists analyze in parallel (`Promise.all()`), then a synthesizer aggregates results.

### 3) Conditional Workflow

IF/ELSE routing based on classification.

```bash
npm run example:cond
```

**Pattern:** Classifier → route to Technical/Creative/Analytical/General handler.

### 4) Loop Workflow

Iterative refinement until a condition is met.

```bash
npm run example:loop
```

**Pattern:** Generate → Evaluate → Refine → loop until quality threshold met.

## Key Concepts

### query() API

The primary function for interacting with Claude Code:

```typescript
// Simple one-shot
for await (const message of query({ prompt: 'Hello' })) { ... }

// With options
for await (const message of query({
  prompt: 'Hello',
  options: { model: 'claude-sonnet-4-5-20250929', maxTurns: 1 },
})) { ... }

// Multi-turn via async generator
async function* conversation(): AsyncGenerator<SDKUserMessage> {
  yield { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'First' }] } };
  yield { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'Follow-up' }] } };
}
for await (const message of query({ prompt: conversation() })) { ... }
```

### Options

```typescript
{
  model: 'claude-sonnet-4-5-20250929',
  systemPrompt: 'You are...',
  allowedTools: ['Read', 'Write', 'Bash'],
  maxTurns: 10,
  permissionMode: 'acceptEdits',
  mcpServers: { name: server },
  agents: { name: agentDefinition },
  hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [callback] }] },
  plugins: [{ type: 'local', path: '...' }],
  resume: 'session_id',
  settingSources: ['project'],
  cwd: '/path/to/workdir',
  streaming: true,
}
```

### Custom Tools

```typescript
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const addTool = tool('add', 'Add two numbers', {
  a: z.number().describe('First number'),
  b: z.number().describe('Second number'),
}, async (args) => ({
  content: [{ type: 'text' as const, text: `Result: ${args.a + args.b}` }],
}));

const server = createSdkMcpServer({ name: 'calc', version: '1.0.0', tools: [addTool] });
```

### Message Types

- `SDKAssistantMessage` (type: `'assistant'`) — Claude's response (contains `TextBlock`, `ToolUseBlock`)
- `SDKResultMessage` (type: `'result'`) — Final result with `total_cost_usd`, `num_turns`, `duration_ms`, `session_id`
- `SDKUserMessage` (type: `'user'`) — User input
- `SDKPartialAssistantMessage` (type: `'partial_assistant_message'`) — Streaming deltas

## Python ↔ TypeScript Comparison

| Feature | Python | TypeScript |
|---|---|---|
| Basic query | `query()` | `query()` |
| Stateful client | `ClaudeSDKClient` | Async generators |
| Tool definition | `@tool` decorator | `tool()` function |
| Parameter validation | Dict types | Zod schemas |
| Options | `ClaudeAgentOptions` | Options object |
| Async | `anyio` | Native async/await |
| Parallel execution | `anyio.create_task_group()` | `Promise.all()` |

## Dependencies

```json
{
  "@anthropic-ai/claude-agent-sdk": "^0.2.92",
  "yahoo-finance2": "^3.10.1",
  "zod": "^3.24.1"
}
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Module not found | Run `npm install` |
| TypeScript errors | Ensure `"module": "ES2022"` in tsconfig and `"type": "module"` in package.json |
| Tools not working | Add to `allowedTools` list |
| High costs | Set `maxTurns` to limit turns |
| Permission denied | Set `permissionMode: 'bypassPermissions'` |
| Local model not working | Ensure Ollama is running: `ollama serve` |
