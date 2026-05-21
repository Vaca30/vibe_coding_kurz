---
name: docs-generate
description: "Generate documentation by scanning code, detecting stale docs, and creating usage examples. Uses three parallel subagents, then synthesizes the results into doc updates."
---

# docs-generate Skill

Scan the codebase with three parallel subagents, then generate or update documentation based on their findings.

## Workflow

### Step 1: Detect the project

1. Identify the main language and structure.
2. Locate existing documentation:
   - `docs/` or `doc/`
   - root `README.md`
   - inline docstrings or comments
3. Identify the main source directories.
4. Confirm the findings in the working notes before writing docs.

### Step 2: Launch 3 subagents in parallel

Run all three in parallel once the project structure is clear.

**Subagent 1: code scanner**

Ask it to:
- scan source files
- list public interfaces
- capture names, signatures, parameters, return types, file paths, and line numbers
- skip private symbols, tests, and generated code

**Subagent 2: staleness checker**

Ask it to:
- inspect existing docs, docstrings, and README files
- compare documented signatures and descriptions with current code
- flag stale or missing documentation

**Subagent 3: example generator**

Ask it to:
- generate minimal usage examples for important public APIs
- use tests as evidence when examples need realistic values
- include both normal and edge-case examples when useful

### Step 3: Synthesize results

Create a documentation plan like:

```markdown
## Documentation Plan

### New Documentation Needed
| Symbol | File | Type | Priority |
|--------|------|------|----------|
| create_order() | src/api.py | function | high |
| UserModel | src/models.py | class | medium |

### Stale Documentation to Update
| Symbol | Issue | Location |
|--------|-------|----------|
| get_products() | Parameter `limit` added | src/api.py:45 |

### Examples to Add
| Symbol | Example Type |
|--------|--------------|
| create_order() | typical usage, error case |
```

### Step 4: Generate documentation

Based on the plan:
1. Update stale docs first.
2. Add missing docstrings to public symbols.
3. Create or update `docs/` pages when standalone documentation is warranted.
4. Add usage examples where they materially improve understanding.
5. Summarize what changed.

## Important

- Launch all three subagents in a single round so they run in parallel.
- Never delete documentation only because it looks old. Update it or mark it as orphaned.
- Prioritize public APIs, public classes, and externally consumed modules.
- Preserve the repo’s existing documentation style and structure.
- Use fenced code blocks with the correct language tag for examples.
- If the project is already well-documented, report that honestly.
