---
name: repo-audit
description: Use when the user asks to check a repository before handoff, submission, commit, or review. Produces a concise verification checklist and recommended fixes.
---

# Repo Audit

Run a final repository audit before handoff.

## Workflow

1. Check `git status --short`.
2. Inspect changed files.
3. Verify that no secrets were introduced.
4. Run the smallest relevant syntax, lint, test, or render checks.
5. Confirm the task folder contains a README with usage and verification notes.
6. Report blockers first, then non-blocking risks.

## Output

```markdown
## Repo Audit

### Blocking Issues
- None

### Checks Run
- command - result

### Remaining Risk
- ...
```

