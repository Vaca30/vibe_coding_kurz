---
name: update-dependencies
description: Bring project dependencies up to date safely. Detects the package manager, lists outdated packages with severity, applies updates in batches (patch first, then minor, then major), and verifies tests pass after each batch. Use when the user says "update deps", "bump packages", "upgrade dependencies", "are we using outdated libs?".
allowed-tools: read, write, edit, shell
---

# update-dependencies

Update project dependencies safely, in tested batches.

## Workflow

### 1. Detect the package manager

| Lockfile / Manifest | Package manager |
|---------------------|-----------------|
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `pnpm-lock.yaml` | pnpm |
| `bun.lockb` | bun |
| `uv.lock` + `pyproject.toml` | uv |
| `poetry.lock` | poetry |
| `requirements.txt` | pip |
| `go.sum` | go modules |
| `Cargo.lock` | cargo |

Confirm with the user before running anything.

### 2. List outdated packages

| Manager | Command |
|---------|---------|
| npm     | `npm outdated --json` |
| yarn    | `yarn outdated --json` |
| pnpm    | `pnpm outdated --format json` |
| uv      | `uv pip list --outdated` |
| poetry  | `poetry show --outdated` |
| pip     | `pip list --outdated --format=json` |
| go      | `go list -m -u all` |
| cargo   | `cargo outdated` |

Bucket the results:
- **Patch** (x.y.Z) — safe, batch all
- **Minor** (x.Y.z) — usually safe, batch by package
- **Major** (X.y.z) — review CHANGELOG before bumping

### 3. Apply patch batch

Run the manager's update command for patch versions only. Then:

```bash
# Verify the test suite passes
pytest -q             # or npm test, go test ./..., etc.
```

If tests pass, commit. If not, bisect by reverting half the patches and re-testing.

### 4. Apply minor batch

Same as patch, but one package at a time when feasible. Read CHANGELOG / release notes for any package with > 50 commits since last bump.

### 5. Apply major batch

Major bumps are user-driven:
1. List each major bump separately.
2. For each: open the upstream CHANGELOG, summarise breaking changes.
3. Ask the user whether to attempt the migration now or skip.
4. If yes — run codemods if upstream provides them, run tests, commit.

### 6. Audit security advisories

| Manager | Command |
|---------|---------|
| npm     | `npm audit --json` |
| pnpm    | `pnpm audit --json` |
| uv      | `uv pip check` |
| pip     | `pip-audit` |
| cargo   | `cargo audit` |
| go      | `govulncheck ./...` |

Treat **HIGH/CRITICAL** advisories as forced minor/major bumps regardless of release schedule.

### 7. Summarise

```markdown
## Dependency Update Summary

### Updated (patch)
- 7 packages — tests passed ✓

### Updated (minor)
- 3 packages — tests passed ✓

### Major bumps deferred
- `react 17 → 19` — breaking changes in event delegation, JSX transform
- `pydantic 1 → 2` — model API rewrite

### Security
- 0 advisories remaining
```

## Rules

- Never bump majors automatically — always ask.
- Always commit after each successful batch (one revertable unit per bucket).
- Never disable / skip tests to "make the upgrade work".
- If lockfile is out of sync after the bump, regenerate it cleanly.
