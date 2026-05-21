---
name: "safe-upgrade"
description: "Use when the user asks to upgrade dependencies without breaking anything, safely upgrade dependencies, try multiple dependency upgrade strategies, or test dependency upgrades before choosing one. This skill prepares separate git worktrees, spawns three upgrade subagents, and compares the results."
---

# Safe Upgrade

This skill is the Codex equivalent of the advanced Claude dependency-upgrade example.

The goal is not to guess the best upgrade path. The goal is to test three strategies in parallel and recommend the safest one with concrete evidence.

## Workflow

### 1. Detect the target repository and projects

- Confirm the target path is a git repository.
- Refuse to continue if the repository has uncommitted changes that would make worktree creation risky.
- Detect whether this is a single project or a monorepo.
- Identify the package manager or dependency tool per project.
- Identify the normal install, test, and build commands.

### 2. Prepare isolated git worktrees

Create three worktrees inside the target repository under:

```text
<repo>/worktrees/
```

Use distinct branches:

- `codex/upgrade-full`
- `codex/upgrade-safe`
- `codex/upgrade-security`

Use child folders such as:

```text
<repo>/worktrees/full
<repo>/worktrees/safe
<repo>/worktrees/security
```

Do not run the upgrade work inside the user's main checkout.

### 3. Spawn three subagents in parallel

Launch these agents in parallel:

- `upgrade_full`
- `upgrade_safe`
- `upgrade_security`

Pass each agent:

- the original repo path
- its assigned worktree path
- the detected project list
- the discovered test and build commands

Tell each worker to stay inside its own worktree.

### 4. Wait and compare

Synthesize the three reports into one comparison table with:

- strategy
- scope of changes
- tests
- build
- first failure or remaining risk
- recommendation

### 5. Leave the worktrees available for inspection

Do not delete the worktrees automatically unless the user asks.

## Trigger examples

Use this skill for prompts such as:

- "Let's upgrade dependencies in project without breaking anything."
- "Upgrade dependencies safely."
- "Try a few dependency upgrade strategies and recommend the safest one."
- "Test dependency upgrades before we touch the main branch."

## Output shape

Use this structure:

```markdown
## Dependency Upgrade Report

| Strategy | Scope | Tests | Build | Recommendation |
|---|---|---|---|---|
| Full | ... | ... | ... | ... |
| Safe | ... | ... | ... | ... |
| Security | ... | ... | ... | ... |

### Best Path
[one clear recommendation]

### Worktrees
- <repo>/worktrees/full
- <repo>/worktrees/safe
- <repo>/worktrees/security
```
