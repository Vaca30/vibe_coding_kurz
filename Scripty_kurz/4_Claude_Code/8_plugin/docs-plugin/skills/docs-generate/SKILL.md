---
name: docs-generate
description: "Generate documentation for the project by scanning code, detecting stale docs, and creating usage examples. Launches 3 parallel agents to analyze the codebase, then synthesizes results into documentation files. Use when the user says 'generate docs', 'document this code', 'create documentation', 'write docs', or any variation of wanting to auto-generate project documentation."
---

# docs-generate Skill

Scan the codebase with 3 parallel agents, then generate or update documentation based on their findings.

## Workflow

### Step 1: Detect the Project

1. Identify the project language and structure:
   - Python: look for `pyproject.toml`, `setup.py`, `requirements.txt`
   - TypeScript/JavaScript: look for `package.json`, `tsconfig.json`
   - Go: look for `go.mod`
2. Locate existing documentation:
   - `docs/` or `doc/` directory
   - Root `README.md`
   - Inline docstrings (Python), JSDoc comments (TypeScript), GoDoc comments (Go)
3. Identify the source directories (e.g., `src/`, `lib/`, `api/`, project root)
4. Confirm findings with the user

### Step 2: Launch 3 Agents in Parallel

Launch all 3 agents in a **single message** using the Agent tool.

**Pass the project discovery to each agent.** Include the detected language, source directories, and existing docs locations.

**Agent 1 — `docs-plugin:code-scanner` agent:**
> Project language: [detected]. Source directories: [list with paths]. Existing docs: [locations].
> Scan all source files and list every public interface: classes, functions, methods, constants, API endpoints, exported modules. For each symbol: name, signature, parameters with types, return type, file path, and line number. Skip private/internal symbols (prefixed `_`), test files, and generated code.

**Agent 2 — `docs-plugin:staleness-checker` agent:**
> Project language: [detected]. Source directories: [list with paths]. Existing docs: [locations].
> Find all existing documentation (README, docstrings, docs/ folder). For each documented symbol, compare the documented signature/description against current code. Detect: parameter changes, type changes, renamed functions, deleted functions still documented, new functions without docs.

**Agent 3 — `docs-plugin:example-generator` agent:**
> Project language: [detected]. Source directories: [list with paths]. Test directories: [list].
> For key public functions/classes (3+ parameters, API endpoints, complex logic), generate minimal usage examples. Read existing tests to derive realistic values. Generate both typical and edge-case examples where applicable.

### Step 3: Synthesize Results

Once all 3 agents return, create a documentation plan:

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
|--------|-------------|
| create_order() | typical usage, error case |
```

### Step 4: Generate Documentation

Based on the plan:

1. **Update existing docs** where they are stale (fix signatures, add missing params)
2. **Add docstrings** to undocumented public symbols in source files
3. **Create/update docs/ files** for modules that need standalone documentation
4. **Add usage examples** to docstrings or docs/ files
5. Present a summary of all changes made

### Important

- **Launch all 3 agents in a single message** — they run in parallel for speed
- **Never delete existing documentation** — only update or add
- Prioritize: API endpoints > public classes > public functions > constants
- If the project has a docs/ directory, maintain its existing structure and style
- Include code examples in fenced blocks with the correct language tag
- Present honest results — if code is well-documented, say so
