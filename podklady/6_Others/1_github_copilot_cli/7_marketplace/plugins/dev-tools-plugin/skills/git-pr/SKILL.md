---
name: git-pr
description: Open a clean GitHub pull request with a structured title and body. Reviews uncommitted/staged changes and the branch's commit history, drafts a concise PR title and summary, and uses gh pr create. Use when the user says "open a PR", "create pull request", "ship it", or any variation.
allowed-tools: shell
---

# git-pr

Open a clean GitHub pull request from the current branch.

## Workflow

### 1. Survey the branch state (in parallel)

```bash
git status
git diff
git diff main...HEAD || git diff master...HEAD
git log main..HEAD --oneline || git log master..HEAD --oneline
gh pr view 2>/dev/null || true
```

If `gh pr view` returns an existing PR, ask the user whether to update it or open a new one.

### 2. Stage & commit anything left over

If there are uncommitted changes the user wants to include, commit them with a single new commit. **Never amend** unless the user explicitly asked.

### 3. Push the branch

```bash
# Push, with -u if no upstream is set
git push -u origin HEAD
```

### 4. Draft the PR

- **Title** ≤ 70 chars, imperative mood, no Conventional-Commits prefix unless the repo uses them.
- **Body** has two sections:

```markdown
## Summary
- bullet
- bullet

## Test plan
- [ ] step
- [ ] step
```

Pull bullets from the actual diff — do not hallucinate features.

### 5. Open the PR

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
...

## Test plan
...
EOF
)"
```

### 6. Return the URL

Print the PR URL when done.

## Rules

- Never force-push.
- Never `--amend` unless the user asks.
- Never run `gh pr merge`.
- If the branch is `main` / `master`, refuse and ask the user to create a feature branch.
