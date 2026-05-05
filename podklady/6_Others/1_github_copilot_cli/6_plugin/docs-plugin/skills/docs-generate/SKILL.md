---
name: docs-generate
description: Generate or refresh project documentation. Scans the codebase with three parallel agents (code-scanner, staleness-checker, example-generator), synthesises results into a plan, and writes documentation files. Use when the user says "generate docs", "document this code", "write docs", "create documentation", or any variation.
allowed-tools: read, write, edit, shell
---

# docs-generate

Scan the codebase with three parallel agents, then generate or update documentation based on their findings.

## Workflow

### Step 1 — Detect the project

1. Identify language and structure:
   - Python: `pyproject.toml`, `setup.py`, `requirements.txt`
   - TypeScript / JavaScript: `package.json`, `tsconfig.json`
   - Go: `go.mod`
2. Locate existing documentation:
   - `docs/` or `doc/` directory
   - root `README.md`
   - inline docstrings (Python), JSDoc (TS), GoDoc (Go)
3. Identify source dirs (e.g. `src/`, `lib/`, `api/`).
4. Confirm with the user before proceeding.

### Step 2 — Launch 3 agents in parallel

Launch all three in a **single message** so they run concurrently. Pass the project discovery to each.

**Agent 1 — `docs-plugin:code-scanner`:**
> Project language: [detected]. Source dirs: [list]. Existing docs: [locations].
> Scan source files and list every public interface (classes, functions, methods, constants, API endpoints, exported modules). For each: name, signature, parameters with types, return type, file path, line number. Skip private/internal symbols (`_` prefix), test files, generated code.

**Agent 2 — `docs-plugin:staleness-checker`:**
> Project language: [detected]. Source dirs: [list]. Existing docs: [locations].
> For each documented symbol, compare documented signature/description against current code. Detect: parameter changes, type changes, renamed functions, deleted functions still documented, new functions without docs.

**Agent 3 — `docs-plugin:example-generator`:**
> Project language: [detected]. Source dirs: [list]. Test dirs: [list].
> For key public functions/classes (3+ params, API endpoints, complex logic), generate minimal usage examples. Read existing tests for realistic values. Provide typical and edge-case examples where applicable.

### Step 3 — Synthesise

Build a documentation plan:

```markdown
## Documentation Plan

### New Documentation Needed
| Symbol | File | Type | Priority |

### Stale Documentation to Update
| Symbol | Issue | Location |

### Examples to Add
| Symbol | Example Type |
```

### Step 4 — Generate

1. Update existing docs where stale (fix signatures, add missing params).
2. Add docstrings to undocumented public symbols.
3. Create / update `docs/` files for modules needing standalone docs.
4. Add usage examples to docstrings or `docs/`.
5. Summarise all changes.

## Rules

- Launch all 3 agents in a single message — parallelism is the point.
- Never delete existing documentation — only update or add.
- Priority: API endpoints > public classes > public functions > constants.
- Match the existing style/structure of `docs/` if present.
- Be honest — if code is well-documented, say so.
