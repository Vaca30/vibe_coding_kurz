# 2_subagent_uses_skill

Claude Code example for `subagent → skill`.

A **subagent** carries its own **skill** via the `skills:` field in the agent's
YAML frontmatter. The skill content is injected into the subagent's context
at startup, giving it specialized formatting knowledge.

## How It Works

```
┌──────────────────────────────────────────────┐
│  User describes the TASK (not the agent)     │
│  ────────────────────────────────────        │
│  "Draft release notes for                    │
│   ./my-ecommerce covering the latest         │
│   search and catalog changes."               │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  Claude Code matches task → agent            │
│  ────────────────────────────────            │
│  Reads agent description:                    │
│    "Analyzes git history and code changes,   │
│     then drafts structured release notes"    │
│  Decision: delegate to release-notes-writer  │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  Claude Code spawns subagent                 │
│  ───────────────────────────                 │
│  agents/release-notes-writer.md              │
│                                              │
│  Frontmatter:                                │
│    skills:                                   │
│      - release-notes-format    ◄─── injected │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  Subagent works with skill context           │
│  ─────────────────────────────               │
│  1. Reads git log / diff                     │
│  2. Classifies changes                       │
│  3. Applies formatting rules from skill      │
│  4. Writes RELEASE_NOTES.md                  │
└──────────────────────────────────────────────┘
```

The user never mentions the agent by name. Claude Code reads the `description`
field of each available agent and decides which one fits the task.

## Key Concept

Subagents do **not** inherit skills from the parent conversation. You must
list them explicitly in the agent's YAML frontmatter:

```yaml
---
name: release-notes-writer
description: Analyzes git history and drafts release notes
model: sonnet
skills:
  - release-notes-format       # ← loaded from .claude/skills/release-notes-format/SKILL.md
---
```

The skill content is loaded **at startup** into the subagent's context window,
not lazily discovered during execution.

## Files

| Component                              | Role                                          |
| -------------------------------------- | --------------------------------------------- |
| `agents/release-notes-writer.md`       | Subagent with `skills: [release-notes-format]` |
| `skills/release-notes-format/SKILL.md` | Formatting rules injected into the agent       |

## Setup

Clone the target project:

```bash
git clone https://github.com/lukaskellerstein/my-ecommerce.git
```

## Prompt

```text
Draft release notes for ./my-ecommerce covering the latest search and catalog changes.
```

The prompt describes **what** to do, not **which agent** to use. Claude Code
reads the `description` field of available agents and decides to delegate to
`release-notes-writer` on its own.

## Comparison with Codex

| Aspect              | Codex                                        | Claude Code                                  |
| ------------------- | -------------------------------------------- | -------------------------------------------- |
| Agent definition    | `.codex/agents/release-notes-writer.toml`    | `.claude/agents/release-notes-writer.md`     |
| Skill wiring        | `[[skills.config]]` in TOML                  | `skills:` list in YAML frontmatter           |
| Skill definition    | `.agents/skills/*/SKILL.md`                  | `.claude/skills/*/SKILL.md`                  |
| Skill loading       | At agent startup                             | At agent startup                             |
| Skill inheritance   | Not inherited from parent                    | Not inherited from parent                    |
