---
name: dead-code
description: Find unused code (functions, imports, exports, variables, types, classes) and propose cleanup. Spawns parallel dead-code-analyzer agents for speed. Use when the user says "find dead code", "unused code", "what can I delete", "clean up unused imports".
allowed-tools: read, shell
---

# dead-code

Analyse the codebase for unused code and produce a cleanup report. Never auto-deletes — always shows the user what to remove and lets them decide.

This skill **parallelises** by spawning multiple `dev-tools-plugin:dead-code-analyzer` agents at once.

## Workflow

### 1. Detect language, structure, scope

```bash
ls -la
```

Indicators:
- `package.json` / `tsconfig.json` → JS / TS
- `pyproject.toml` / `requirements.txt` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust

Identify entry points and top-level source dirs (`src/`, `lib/`, `pkg/`, `cmd/`, `app/`, `internal/`).

Skip dirs: `node_modules`, `vendor`, `dist`, `build`, `.gen`, `__pycache__`, `.next`, `coverage`, `.git`, `.venv`.

### 2. Spawn agents in parallel

Pick a parallelisation strategy:

**A — by directory** (best for monorepos):
- One agent per top-level source dir (`src/services/`, `src/utils/`, `src/components/`).

**B — by analysis type** (best for small/single-dir projects):
- Agent 1: unused exports / functions
- Agent 2: unused imports
- Agent 3: unreachable code, commented-out blocks, removal-TODOs

**C — hybrid** (large multi-language):
- One per language/dir + one cross-cutting agent for hygiene.

Each agent prompt must include: language, entry points, dirs to skip, library-vs-app, expected output format (Step 3).

Launch all agents in a **single message** with multiple Agent tool calls.

### 3. Aggregate, dedupe, cross-validate

- Merge findings by file
- If two agents flagged the same symbol, keep the highest-confidence entry
- Cross-validate: a symbol flagged in one dir may have a reference in another. Quick grep to confirm.
- Re-classify confidence when cross-dir context warrants

### 4. Present the unified report

```markdown
## Dead Code Report

### src/utils/helpers.ts
- **HIGH** `formatCurrency()` (line 45) — defined but never imported
- **HIGH** `import { debounce } from 'lodash'` (line 3) — unused

### src/services/legacy-api.ts
- **HIGH** Entire file — never imported

### Summary
| Confidence | Items | Files | Lines |
|---|---|---|---|
| High | 12 | 5 | ~180 |
| Medium | 4 | 2 | ~45 |
| Low | 2 | 1 | ~30 |
```

### 5. Propose cleanup

Ask the user how to proceed:
- Remove all high-confidence items
- Walk through file by file
- Export the report
- Skip — informational only

Only delete what the user approves. Run the test suite after cleanup.

## Caveats

- **Public APIs / libraries**: exported symbols may be consumed externally → flag LOW.
- **Dynamic usage**: reflection, `eval()`, dynamic `import()` can hide references — flag LOW.
- **Test-only references**: flag MEDIUM, not HIGH.
- **Generated / vendor dirs**: skip entirely.
