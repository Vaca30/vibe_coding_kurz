# Skills

## SDK Support

**Skills are NOT directly supported by the Codex TypeScript SDK.**

The SDK has no `skills` parameter. Skills are discovered automatically from the filesystem by the Codex CLI.

## How Skills Work in Codex

Skills are `SKILL.md` files that the agent auto-discovers and applies when relevant. They are the Codex equivalent of Claude's `.claude/skills/` system.

### Discovery Locations (precedence order)

1. `.codex/skills/` (project-level, in working directory)
2. `~/.agents/skills/` (user-level, always available)
3. Plugin-provided skill roots

Skills are scanned recursively up to 6 levels deep.

### Directory Structure

```
.codex/
  skills/
    color-palette/
      SKILL.md
    api-conventions/
      SKILL.md
    testing-standards/
      SKILL.md
```

### SKILL.md Format

```markdown
---
name: Brand Color Palette
description: Enforces the official brand color palette for all design output
---

# Brand Color Palette

When generating any output involving colors (HTML, CSS, design specs),
use this official brand palette:

## Primary Colors
- **Midnight Blue**: #1a1a2e (backgrounds, headers)
- **Royal Blue**: #0f3460 (interactive elements, links)

## Rules
1. Never use colors outside this palette
2. Ensure WCAG AA contrast minimum
```

The YAML frontmatter (`name`, `description`) helps the agent decide when to apply the skill. The markdown body contains the actual instructions.

## Using with the SDK

Place skills in the project's `.codex/skills/` directory and set `workingDirectory`:

```typescript
const codex = new Codex();
const thread = codex.startThread({
  workingDirectory: "/path/to/project-with-skills",
});
// Skills from /path/to/project-with-skills/.codex/skills/ are auto-discovered
```

**Limitation**: All threads using the same `workingDirectory` share the same skills. User-level skills (`~/.agents/skills/`) always apply to all threads.

## Comparison with Claude SDK

| Aspect | Claude SDK | Codex SDK |
|--------|-----------|-----------|
| Skill location | `.claude/skills/<name>/SKILL.md` | `.codex/skills/<name>/SKILL.md` |
| File format | Markdown with YAML frontmatter | Markdown with YAML frontmatter |
| Discovery | Auto-discovered from working dir | Auto-discovered from working dir |
| User-level | `~/.claude/skills/` | `~/.agents/skills/` |
| SDK API | None (filesystem, same as Codex) | None (filesystem) |
| Per-thread isolation | No (same limitation) | No (shared via filesystem) |

Skills work essentially the same way in both SDKs - filesystem-based auto-discovery with no direct SDK API.
