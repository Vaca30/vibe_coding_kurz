# Safe Upgrade Routing

When the user asks for any variation of these intents, immediately use the local `$safe-upgrade` skill:

- "upgrade dependencies without breaking anything"
- "let's upgrade dependencies in project without breaking anything"
- "safely upgrade dependencies"
- "test dependency upgrades"
- "try multiple upgrade strategies"
- "upgrade packages conservatively"

## Expected behavior

- Treat this folder as a skill-driven orchestration demo.
- Prefer `$safe-upgrade` over solving the request ad hoc.
- The skill should create git worktrees inside the target repository under `worktrees/`.
- Keep the user's main checkout untouched.
- Spawn the three upgrade agents in parallel after the worktrees are prepared.

## If auto-trigger still does not fire

- Use the skill explicitly with `$safe-upgrade`.
- Verify Codex is running from this folder so the local skill is in scope.
