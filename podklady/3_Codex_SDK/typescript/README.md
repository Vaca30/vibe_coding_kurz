# OpenAI Codex SDK - TypeScript Examples

Examples demonstrating the OpenAI Codex TypeScript SDK (`@openai/codex-sdk`), structured to mirror the [Claude Agent SDK examples](https://github.com/lukaskellerstein/my-claude-code/tree/main/claude_agent_sdk/typescript).

## Prerequisites

- Node.js 18+
- `codex` CLI (built from source or installed via npm)
- `OPENAI_API_KEY` environment variable set

## Setup

```bash
npm install
```

## Project Structure

```
examples/
  helpers.ts                          # Codex path resolution helper
  1_single_thread/                    # Single agent examples
    1a_simplest_thread.ts             # Basic thread.run()
    1b_simplest_streaming.ts          # Streaming with runStreamed()
    2_thread_with_options.ts          # Model, sandbox, reasoning effort
    2b_thread_with_instructions.ts    # Developer instructions (system prompt)
    3_structured_output.ts            # JSON schema + Zod via outputSchema
    4_thread_with_memory.ts           # Multi-turn conversations
    5_image_input.ts                  # Image analysis via local_image
    6_mcp_tools.ts                    # MCP tool calls + command execution
    7_hooks/README.md                 # Hooks (config-file only, not SDK API)
    8_subagents/README.md             # Subagents (config-file only, not SDK API)
    9_skills/README.md                # Skills (config-file only, not SDK API)
    10_plugins/README.md              # Plugins (config-file only, not SDK API)
  2_multi_thread/                     # Multi-agent patterns
    1_collaboration_pattern.ts        # Sequential equal peers
    2_supervisor_pattern.ts           # Hierarchical delegation
    3_swarm_pattern.ts                # Autonomous handoff routing
  3_workflows/                        # Orchestration patterns
    1_sequential_workflow.ts          # Agent chain pipeline
    2_parallel_workflow.ts            # Fan-out / fan-in
    3_conditional_workflow.ts         # Classify and route
    4_loop_workflow.ts                # Iterative refinement
```

## Running Examples

```bash
# Single thread
npm run example:1a        # Simplest thread
npm run example:1b        # Streaming
npm run example:2a        # Thread options
npm run example:2b        # Developer instructions (system prompt)
npm run example:3         # Structured output (Zod)
npm run example:4         # Multi-turn memory
npm run example:5         # Image input
npm run example:6         # MCP tools & commands

# Multi-agent patterns
npm run example:collab    # Collaboration pattern
npm run example:super     # Supervisor pattern
npm run example:swarm     # Swarm pattern

# Workflows
npm run example:seq       # Sequential workflow
npm run example:par       # Parallel workflow
npm run example:cond      # Conditional workflow
npm run example:loop      # Loop workflow
```

## SDK API Surface

The Codex TypeScript SDK is a thin wrapper around the `codex exec` CLI. It exposes three levels of options:

| Level | Type | Key Options |
|-------|------|-------------|
| Client | `CodexOptions` | `codexPathOverride`, `baseUrl`, `apiKey`, `config`, `env` |
| Thread | `ThreadOptions` | `model`, `sandboxMode`, `workingDirectory`, `modelReasoningEffort`, `approvalPolicy` |
| Turn | `TurnOptions` | `outputSchema`, `signal` |

### Directly supported by SDK

- Model selection, sandbox modes, reasoning effort, approval policy
- Structured output via JSON schema / Zod
- Image input via `{ type: "local_image", path }`
- Multi-turn conversations (repeated `thread.run()` on same thread)
- Thread resumption (`codex.resumeThread(id)`)
- Developer instructions (`config.developer_instructions`)
- Streaming events (`thread.runStreamed()`)

### Config-file only (not SDK API)

These features work through the Codex CLI config layer system but have no direct SDK parameters:

| Feature | Config Location | Details |
|---------|-----------------|---------|
| Hooks | `.codex/hooks.json` | See [7_hooks/README.md](examples/1_single_thread/7_hooks/README.md) |
| Subagents | `.codex/config.toml` `[agents]` | See [8_subagents/README.md](examples/1_single_thread/8_subagents/README.md) |
| Skills | `.codex/skills/<name>/SKILL.md` | See [9_skills/README.md](examples/1_single_thread/9_skills/README.md) |
| Plugins | `.codex/config.toml` `[plugins]` | See [10_plugins/README.md](examples/1_single_thread/10_plugins/README.md) |

## Multi-Agent Pattern

Since the SDK has no built-in agent registry, independent agents are created as separate `Codex` instances with different `developer_instructions`:

```typescript
const analyst = new Codex({
  config: { developer_instructions: "You are a data analyst..." },
});
const writer = new Codex({
  config: { developer_instructions: "You are a technical writer..." },
});
```

Agent-to-agent communication is application-level: the output of one agent is passed as input to the next agent's prompt.
