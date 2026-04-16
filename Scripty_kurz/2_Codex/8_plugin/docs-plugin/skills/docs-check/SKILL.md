---
name: docs-check
description: "Audit documentation health by scanning code for public interfaces and cross-referencing them with existing docs. Reports coverage, stale docs, and missing docs with a prioritized fix list."
---

# docs-check Skill

Audit documentation coverage and freshness. Produce a health report with actionable recommendations.

## Workflow

### Step 1: Detect project structure

1. Identify the project language.
2. Locate the main source directories.
3. Locate documentation:
   - `docs/` or `doc/`
   - root `README.md`
   - inline docstrings, JSDoc, or GoDoc comments

### Step 2: Scan code for public interfaces

Use fast file search and skip tests, generated code, and private helpers when possible.

**Python**
```bash
rg -n "^(async )?def |^class " src/ --glob '*.py'
```

**TypeScript / JavaScript**
```bash
rg -n "^export " src/ --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.jsx'
```

**Go**
```bash
rg -n "^func |^type " . --glob '*.go'
```

For each public symbol, record:
- name
- type
- file path
- line number
- whether it has a docstring or comment
- the documented signature if one exists

### Step 3: Cross-reference with documentation

For each documented symbol:
1. Check whether the documented signature still matches the code.
2. Check whether parameters are still accurate.
3. Check whether return values or types changed.
4. Check whether the description still matches behavior.

Classification:
- **Documented**: has documentation and it matches current code
- **Stale**: has documentation but it no longer matches current code
- **Missing**: no documentation at all

### Step 4: Check the `docs/` directory

If a `docs/` directory exists:
1. List doc files.
2. Check whether referenced code symbols still exist.
3. Flag orphaned docs that describe removed code.
4. Flag source modules with no corresponding docs when the repo appears to expect module docs.

### Step 5: Produce a health report

Use a concise markdown report like:

```markdown
## Documentation Health Report

### Per-File Summary

| File | Public Symbols | Documented | Stale | Missing |
|------|---------------|------------|-------|---------|
| src/api.py | 8 | 5 | 2 | 1 |
| src/models.py | 12 | 10 | 0 | 2 |
| src/utils.py | 6 | 0 | 0 | 6 |
| **Total** | **26** | **15** | **2** | **9** |

### Overall Score: 50%

### Stale Documentation
| Symbol | File | Issue |
|--------|------|-------|
| get_products() | src/api.py:45 | Parameter `limit` was added but docs were not updated |

### Missing Documentation
1. `src/utils.py` is completely undocumented.
2. `src/api.py` has public endpoint handlers without docstrings.

### Orphaned Documentation
| Doc File | Issue |
|----------|-------|
| docs/legacy.md | References deleted code |
```

## Important

- Be precise about file paths and line numbers.
- Sort missing docs by priority: public APIs first, then public classes, then helper utilities.
- Report orphaned docs. Stale docs are usually worse than missing docs.
- Compute the overall score as `(documented - stale) / total_public_symbols * 100`.
- If the codebase is already well-documented, say so plainly instead of manufacturing issues.
