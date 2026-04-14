---
name: docs-check
description: "Audit documentation health by scanning code for public interfaces and cross-referencing with existing docs. Reports coverage percentage, stale docs, and missing docs with a prioritized fix list. Use when the user says 'check docs', 'are docs up to date', 'docs audit', 'find missing docs', 'documentation health', or any variation of wanting to assess documentation quality."
---

# docs-check Skill

Audit documentation coverage and freshness. Produce a health report with actionable recommendations.

## Workflow

### Step 1: Detect Project Structure

1. Identify the project language (Python, TypeScript, Go)
2. Locate source directories
3. Locate documentation:
   - `docs/` or `doc/` directory
   - Root `README.md`
   - Inline docstrings / JSDoc / GoDoc

### Step 2: Scan Code for Public Interfaces

For each source file (skip test files, generated code, `__init__.py`):

**Python:**
```bash
grep -rn "^def \|^class \|^async def " src/ --include="*.py"
```

**TypeScript/JavaScript:**
```bash
grep -rn "^export " src/ --include="*.ts" --include="*.tsx" --include="*.js"
```

For each public symbol, record:
- Name, type (function/class/constant), file path, line number
- Whether it has a docstring/JSDoc comment
- If documented, the documented signature

### Step 3: Cross-Reference with Documentation

For each documented symbol:
1. Does the documented signature match the current code?
2. Are all parameters documented?
3. Is the return type documented?
4. Does the description match what the code actually does?

Classification:
- **Documented**: has a docstring AND it matches current code
- **Stale**: has a docstring BUT signature/params have changed
- **Missing**: no docstring at all

### Step 4: Check docs/ Directory

If a `docs/` directory exists:
1. List all doc files
2. For each doc file, check if the referenced code symbols still exist
3. Flag orphaned docs (documenting deleted code)
4. Flag undocumented modules (source files with no corresponding doc)

### Step 5: Produce Health Report

```markdown
## Documentation Health Report

### Per-File Summary

| File | Public Symbols | Documented | Stale | Missing |
|------|---------------|------------|-------|---------|
| src/api.py | 8 | 5 | 2 | 1 |
| src/models.py | 12 | 10 | 0 | 2 |
| src/utils.py | 6 | 0 | 0 | 6 |
| **Total** | **26** | **15** | **2** | **9** |

### Overall Score: 58% documented, 8% stale

### Stale Documentation
| Symbol | File | Issue |
|--------|------|-------|
| get_products() | src/api.py:45 | Parameter `limit: int = 100` added but not documented |
| update_order() | src/api.py:78 | Return type changed from `dict` to `Order` |

### Missing Documentation (Priority Order)
1. **src/utils.py** — completely undocumented (6 public functions) — HIGH
2. **src/api.py** — `create_order()` missing docstring — HIGH (API endpoint)
3. **src/models.py** — `OrderStatus` enum, `Address` class — MEDIUM

### Orphaned Documentation
| Doc File | Issue |
|----------|-------|
| docs/legacy.md | References `process_webhook()` which no longer exists |

### Recommendation
Run `/docs-plugin:docs-generate` to auto-fix the 9 missing and 2 stale items.
```

### Important

- Be precise about line numbers — the user needs to find these symbols
- Sort missing docs by priority: API endpoints > public classes > utility functions > constants
- Report orphaned docs — stale docs are worse than no docs
- The overall score should be: `(documented - stale) / total_public_symbols * 100`
- If the project is well-documented (>90%), acknowledge it — don't manufacture problems
