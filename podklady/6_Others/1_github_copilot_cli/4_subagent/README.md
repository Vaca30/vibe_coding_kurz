# 4. Subagent — Custom Agents

A **custom agent** is a specialised assistant with its own instructions, optionally restricted to a subset of tools. The main agent can delegate work to it, isolating that work in a fresh context window.

Same idea as Claude Code subagents — different file shape.

## Where agents live

| Scope | Path |
|-------|------|
| **Project** | `.github/agents/` |
| **Personal** | `~/.copilot/agents/` |

If both define an agent with the same name, **personal overrides project**.

## Agent file shape

Each agent is a single Markdown file ending in **`.agent.md`**:

```
.github/agents/<name>.agent.md
```

- Filename must be lowercase + hyphens
- The `.agent.md` suffix is required (Copilot uses it to find agents)

### Frontmatter fields

```yaml
---
name: dead-code-analyzer            # required — invocation name
description: When to use this agent # required — Copilot uses for routing
tools:                              # optional — restrict tool access
  - read
  - shell(grep:*)
  - shell(rg:*)
model: gpt-5                        # optional — override model
---
```

If `tools` is omitted, the agent gets the same tools the main session has.

## How to invoke

Four ways:

1. **Slash command** (interactive): type `/agent` and pick from the list
2. **Mention by name** in a prompt: `Use the dead-code-analyzer to scan src/`
3. **Inferred**: Copilot routes automatically when the prompt matches the description
4. **Programmatic**: `copilot --agent dead-code-analyzer --prompt "Scan src/"`

## What's in this folder

A `dead-code-analyzer` agent — restricted to read-only tools, finds unused code and produces a report **without** deleting anything.

## Try it

```bash
cd 4_subagent
copilot --allow-tool='read' --allow-tool='shell(rg:*)' --allow-tool='shell(grep:*)' --allow-tool='shell(ls:*)'
```

Then prompt:

```
Use the dead-code-analyzer agent to find unused functions and imports in this repo
```

## When to reach for a subagent

| Situation | Subagent? |
|-----------|-----------|
| Work pollutes main context (large file scans, exhaustive greps) | ✅ |
| Strict tool restrictions for a sensitive task (security review, audit) | ✅ |
| Independent work units that can run in parallel | ✅ |
| One quick read+respond | ❌ — just do it inline |
