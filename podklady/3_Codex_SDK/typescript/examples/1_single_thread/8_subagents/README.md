# Subagents

## SDK Support

**Subagents are NOT directly supported by the Codex TypeScript SDK.**

The SDK has no `agents` parameter in `CodexOptions` or `ThreadOptions`. There is no `AgentDefinition` type.

## How Subagents Work in Codex

Subagents are configured in `.codex/config.toml` under the `[agents]` section. The Codex CLI has built-in tools for spawning and managing subagents.

### config.toml Format

```toml
[agents]
max_depth = 3                    # Maximum nesting depth for spawned agents
max_threads = 5                  # Max concurrent agent threads
job_max_runtime_seconds = 300    # Runtime limit per agent job

[agents.researcher]
description = "Researches topics and gathers information"
config_file = "./agents/researcher.toml"    # Role-specific config layer
nickname_candidates = ["Herodotus", "Marco Polo"]

[agents.developer]
description = "Writes and reviews code"
config_file = "./agents/developer.toml"
```

Each agent role can have its own `config_file` which is a separate `.toml` with role-specific settings (model, instructions, tool access, etc.).

### Built-in Agent Tools

When the Codex agent has subagent support enabled, it can use these tools:

| Tool | Purpose |
|------|---------|
| `spawn_agent` | Create a new subagent thread |
| `send_input` | Send a message to a running agent |
| `wait_agent` | Wait for an agent to complete |
| `close_agent` | Close an agent thread |
| `list_agents` | List all active agents |
| `resume_agent` | Resume a paused agent |
| `spawn_agents_on_csv` | Batch spawn agents from CSV data |

## Using with the SDK

### Option 1: Filesystem config (CLI-level agents)

```typescript
// Project has .codex/config.toml with [agents] section
const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: "/path/to/project-with-agents-config",
});
// The Codex agent can now use spawn_agent, wait_agent, etc.
```

### Option 2: Application-level orchestration (recommended for SDK)

Since the SDK doesn't have per-thread agent config, the practical approach for multi-agent patterns is to create multiple `Codex` instances:

```typescript
const analyst = new Codex({
  config: { developer_instructions: "You are a data analyst..." },
});
const writer = new Codex({
  config: { developer_instructions: "You are a technical writer..." },
});

// Run in parallel
const [analysis, report] = await Promise.all([
  analyst.startThread({ skipGitRepoCheck: true }).run("Analyze the data..."),
  writer.startThread({ skipGitRepoCheck: true }).run("Write a report..."),
]);
```

**Limitation**: All threads share the same `[agents]` config unless isolated via different `workingDirectory` paths.

## Comparison with Claude SDK

| Aspect | Claude SDK | Codex SDK |
|--------|-----------|-----------|
| Agent definition | `AgentDefinition` objects with tools, prompt, model | `[agents]` section in config.toml |
| Configuration | `options.agents` parameter in `query()` | Filesystem config only |
| Per-thread isolation | Yes (different agents per query) | No (shared via filesystem) |
| Agent spawning | SDK manages agent lifecycle | CLI manages via built-in tools |
| SDK API | Direct `agents: { name: AgentDefinition }` | None (filesystem + application-level orchestration) |
