---
name: docs-check
description: Audit documentation health. Lists public interfaces, cross-references with existing docs, and produces a coverage report with stale and missing entries. Use when the user says "check docs", "audit documentation", "are the docs up to date?", or asks for documentation coverage.
allowed-tools: read, shell
---

# docs-check

Audit project documentation and produce a structured health report.

## Workflow

### 1. Detect the project

Same detection as `docs-generate`: language, source dirs, existing docs.

### 2. Inventory public interfaces

Scan each source file for public symbols:
- Python: `def` / `class` at module level, FastAPI/Flask routes
- TS/JS: `export` declarations, Express routes
- Go: capitalised symbols

For each, capture: name, signature, file, line, docstring presence.

### 3. Inventory existing documentation

Read every doc source:
- Inline docstrings (extract symbol → description)
- `docs/*.md` (parse headings, extract documented symbols)
- `README.md`

### 4. Cross-reference

Build the matrix:

| Symbol | Has docstring | Has docs/* entry | Last edit (code) | Last edit (docs) | Verdict |

Verdicts:
- **OK** — documented, signatures match
- **Stale** — documented but signature/params changed
- **Missing** — public symbol with no doc
- **Orphan** — doc entry for a symbol that no longer exists

### 5. Report

```markdown
## Documentation Health Report

### Coverage
- Public symbols: 47
- Documented: 28 (60%)
- Missing: 19 (40%)
- Stale: 4
- Orphan: 2

### Top Priorities
1. **MISSING** — `src/api.py:create_order()` (public POST endpoint)
2. **STALE** — `src/db.py:save()` — added `commit=True` param (line 22)
3. **ORPHAN** — `docs/api.md` documents `legacy_export()` which no longer exists

### Recommended Actions
1. Run /docs-plugin:docs-generate to fill the 19 missing entries
2. Review the 4 stale entries manually
3. Remove the 2 orphan entries
```

## Rules

- Read-only — never write or delete docs.
- Be precise about confidence: only flag MISSING when grep confirms zero docs.
- Match symbols by file + line, not name alone (handles renames).
