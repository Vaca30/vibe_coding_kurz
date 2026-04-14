# 1_skill_spawns_subagents

Codex example for `skill -> subagents`.

This is the Codex equivalent of the Claude `5_complex` dependency upgrade example.

## Setup

Run Codex from this folder so the local skill is in scope:

```bash
cd /home/lukas/Projects/Github/lukaskellerstein/vibe-coding-course/2_Codex/5_complex/1_skill_spawns_subagents
```

Run this against a git repository such as:

```bash
git clone https://github.com/lukaskellerstein/my-test-repo-codex.git
```

The skill prepares three git worktrees inside the target repository under `worktrees/` and assigns one to each upgrade agent.

## Prompt

```text
Let's upgrade dependencies in project without breaking anything.
```

## Why it looks slightly different from Claude

Current Codex custom-agent docs show skills, subagent nesting, and skill inheritance, but not a dedicated per-agent `worktree` isolation setting. This example implements the same safety pattern by having the skill explicitly create separate `git worktree`s under `worktrees/` and then dispatch one worker per worktree.

If the generic prompt still does not trigger the skill automatically, use:

```text
Use $safe-upgrade to upgrade dependencies without breaking anything.
```
