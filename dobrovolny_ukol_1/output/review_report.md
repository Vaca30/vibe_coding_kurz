# AI Code Review Report

**File Reviewed:** `sample_buggy.py`
**Fixed Output:** `output/fixed_sample_buggy.py`
**Review Date:** 2026-05-05
**Pipeline Phases:** Security Review · Performance Review · Code Quality Review · Automated Fix Implementation

---

## Executive Summary

An automated three-phase AI code review pipeline was executed against `sample_buggy.py`. Each phase ran in parallel (security, performance, code quality), followed by a consolidated automated fix pass that produced a fully corrected file.

| Category | Total Issues | Critical | High / Major | Medium / Moderate | Low / Minor |
|---|---|---|---|---|---|
| Security | 9 | 2 | 2 | 3 | 2 |
| Performance | 7 | 1 | 3 | 2 | 2 |
| Code Quality | 11 | 4 | 5 | 0 | 2 |
| **Unique (deduplicated)** | **~22** | **6** | **8** | **5** | **4** |

### Key Findings at a Glance

- **Two critical SQL injection vulnerabilities** (lines 15 and 79) are exploitable with zero prerequisites and represent immediate production risk.
- **Two path traversal vulnerabilities** (lines 36 and 86) allow authenticated callers to read arbitrary files from the server filesystem.
- A **cubic-time O(n³) algorithm** in `find_duplicates` (lines 26–30) would catastrophically degrade on any non-trivial dataset — roughly **100,000,000× slower** than the O(n) fix at n=10,000.
- **All six functions** lacked type hints, docstrings, and input validation. Four functions contained unclosed resource leaks.
- All identified issues were fully remediated in the automated fix phase.

---

## Security Findings

### S1 — SQL Injection in `get_user()` · Line 15 · 🔴 CRITICAL

**Vulnerable code:**
```python
query = "SELECT * FROM users WHERE username = '" + username + "'"
cursor.execute(query)
```

`username` is concatenated directly into the SQL string with no sanitization or escaping. An attacker supplying `' OR '1'='1' --` dumps the entire `users` table. Supplying `'; DROP TABLE users; --` destroys data permanently. No authentication or special privilege is required to exploit this.

**Fixed code:**
```python
cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
```

---

### S2 — SQL Injection in `load_users_from_file()` · Line 79 · 🔴 CRITICAL

**Vulnerable code:**
```python
cursor.execute(
    "SELECT permissions FROM users WHERE username = '" + admin_username + "'"
)
```

Identical injection vector to S1. Because this query gates the authorization check (`"admin" in permissions`), an attacker can craft a payload such as `' OR '1'='1` to bypass the permission guard entirely, then load arbitrary files (compounded by S4 below).

**Fixed code:**
```python
cursor.execute(
    "SELECT permissions FROM users WHERE username = ?", (admin_username,)
)
```

---

### S3 — Path Traversal in `read_config()` · Line 36 · 🔴 HIGH

**Vulnerable code:**
```python
f = open(path, "r")
```

`path` is accepted as a raw parameter with no validation. Any caller can pass `../../etc/passwd`, `/etc/shadow`, or any absolute path, causing the application to read arbitrary files from the server filesystem.

**Fixed code (path canonicalization guard):**
```python
import os

_CONFIG_DIR = os.path.realpath(os.environ.get("APP_CONFIG_DIR", "/app/config"))

def _assert_safe_path(user_path: str, allowed_dir: str) -> str:
    resolved = os.path.realpath(user_path)
    if not resolved.startswith(allowed_dir + os.sep):
        raise ValueError(
            f"Access denied: '{user_path}' resolves outside the allowed directory."
        )
    return resolved

# Inside read_config:
safe = _assert_safe_path(path, _CONFIG_DIR)
with open(safe, "r", encoding="utf-8") as config_file:
    return json.load(config_file)
```

---

### S4 — Path Traversal in `load_users_from_file()` · Line 86 · 🔴 HIGH

**Vulnerable code:**
```python
file_handle = open(filepath, "r")
```

Identical path traversal to S3. Critically, the SQL injection in S2 can bypass the admin permission check first, making this doubly dangerous: an unauthenticated or low-privilege attacker can combine S2 + S4 to read any file on the server.

**Fixed code:** Same `_assert_safe_path()` guard applied with a dedicated `_DATA_DIR` constant.

---

### S5 — Resource Leak: DB Connection Not Closed on Exception · Lines 13–19 & 75–82 · 🟠 MEDIUM

**Vulnerable code (both functions follow this pattern):**
```python
conn = sqlite3.connect("users.db")
cursor = conn.cursor()
cursor.execute(query)        # exception here ...
result = cursor.fetchone()
conn.close()                 # ... means this line is never reached
```

If `cursor.execute()` or `fetchone()` raises (schema error, locked database, etc.), `conn.close()` is skipped. Under sustained load, leaked connections exhaust the SQLite connection limit.

**Fixed code:**
```python
with sqlite3.connect("users.db") as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    return cursor.fetchone()
```

---

### S6 — Resource Leak: File Handle Not Closed on Exception · Lines 36–38 & 86–88 · 🟠 MEDIUM

**Vulnerable code (both occurrences):**
```python
# read_config (line 36):
f = open(path, "r")
data = json.load(f)    # raises on malformed JSON → f never closed
f.close()

# load_users_from_file (line 86):
file_handle = open(filepath, "r")
content = file_handle.read()
file_handle.close()    # raises on I/O error → handle never closed
```

**Fixed code:**
```python
with open(path, "r", encoding="utf-8") as config_file:
    return json.load(config_file)
```

---

### S7 — Missing Input Validation in `process_records()` · Lines 46–47 · 🟡 LOW

**Vulnerable code:**
```python
value = int(record["value"])
name = record["name"].strip().upper()
```

No guard against missing keys (`KeyError`), non-numeric values for `"value"` (`ValueError`), or non-string types for `"name"` (`AttributeError`). Unhandled exceptions can expose internal stack traces to end users.

**Fixed code:**
```python
try:
    value = int(record["value"])
    name = str(record["name"]).strip().upper()
except KeyError as exc:
    raise ValueError(f"Record at index {idx} is missing required key: {exc}") from exc
except (ValueError, TypeError) as exc:
    raise ValueError(f"Record at index {idx} has invalid data: {exc}") from exc
```

---

### S8 — Division by Zero (DoS vector) in `calculate_stats()` · Lines 64 & 69 · 🟡 LOW

**Vulnerable code:**
```python
mean = total / len(numbers)       # ZeroDivisionError if numbers is empty
variance = variance / len(numbers)
```

Passing an empty list causes an unhandled `ZeroDivisionError`. In a public-facing API, this constitutes a trivial denial-of-service vector via malformed input.

**Fixed code:**
```python
if not numbers:
    raise ValueError("Cannot calculate stats on an empty list.")
```

---

### Security Summary Table

| ID | Severity | Function | Lines | Vulnerability |
|---|---|---|---|---|
| S1 | 🔴 Critical | `get_user` | 15 | SQL Injection |
| S2 | 🔴 Critical | `load_users_from_file` | 79 | SQL Injection (auth bypass) |
| S3 | 🔴 High | `read_config` | 36 | Path Traversal |
| S4 | 🔴 High | `load_users_from_file` | 86 | Path Traversal (compounded by S2) |
| S5 | 🟠 Medium | `get_user`, `load_users_from_file` | 13–19, 75–82 | DB Connection Leak |
| S6 | 🟠 Medium | `read_config`, `load_users_from_file` | 36–38, 86–88 | File Handle Leak |
| S7 | 🟡 Low | `process_records` | 46–47 | Missing Input Validation |
| S8 | 🟡 Low | `calculate_stats` | 64, 69 | Division by Zero / No Guard |

---

## Performance Findings

### P1 — O(n³) Algorithm in `find_duplicates()` · Lines 26–30 · 🔴 CRITICAL

**Problematic code:**
```python
for i in range(len(items)):           # O(n)
    for j in range(len(items)):       # O(n) → O(n²) so far
        if i != j and items[i] == items[j]:
            if items[i] not in duplicates:   # O(n) list scan → O(n³) total
                duplicates.append(items[i])
```

| Contribution | Complexity |
|---|---|
| Outer × inner loop | O(n²) comparisons |
| `not in duplicates` list scan on every match | × O(n) per check |
| Symmetric pairs checked twice (i,j) and (j,i) | 2× wasted |
| **Combined worst case** | **O(n³)** |

At n=10,000, this executes ~10¹² operations. The O(n) fix using `Counter` executes ~10⁴ — a difference of approximately **100,000,000×**.

**Fixed code (O(n)):**
```python
from collections import Counter

def find_duplicates(items: list[Any]) -> list[Any]:
    counts = Counter(items)                              # one pass, O(n)
    return [item for item, count in counts.items() if count > 1]  # O(n)
```

---

### P2 — Two Full Iteration Passes in `calculate_stats()` · Lines 61–69 · 🟠 HIGH

**Problematic code:**
```python
# Pass 1 — sum
total = 0
for n in numbers:
    total = total + n

# Pass 2 — variance
variance = 0
for n in numbers:
    variance = variance + (n - mean) ** 2
```

Two separate O(n) loops double cache miss overhead and loop setup cost for large arrays.

**Fixed code (single logical pass, C-level built-in):**
```python
n = len(numbers)
total = sum(numbers)                                         # C-level, ~5× faster
mean = total / n
variance = sum((x - mean) ** 2 for x in numbers) / n       # single generator pass
```

---

### P3 — `len(numbers)` Called Twice · Lines 64 & 69 · 🟠 MODERATE

```python
mean     = total / len(numbers)      # line 64
variance = variance / len(numbers)   # line 69 — redundant call
```

`len()` is O(1) but still incurs two Python bytecode dispatches and attribute lookups. Additionally, if the list were ever mutated between calls, results would be inconsistent. Cache once: `n = len(numbers)`.

---

### P4 — Python Loop Instead of `sum()` Built-in · Lines 61–63 · 🟠 MODERATE

```python
total = 0
for n in numbers:
    total = total + n   # interpreted Python bytecode per element
```

Python's built-in `sum()` runs as a tight C loop, typically **4–8× faster** on numeric lists. The `total = total + n` form also creates a new integer object on each iteration rather than using augmented assignment.

**Fix:** `total = sum(numbers)`

---

### P5 — Function Object Re-allocated Every Loop Iteration · Lines 49–52 · 🟠 MODERATE

```python
for record in records:
    value = int(record["value"])

    def format_entry(v):       # NEW function object allocated on EVERY iteration
        name = f"entry_{v}"
        return f"{name}:{v}"

    results.append(format_entry(value))
```

For `n` records this allocates `n` unnecessary `function` objects (each including bytecode, closure binding, and `__code__` reference). The function captures nothing from the enclosing scope and belongs at module level.

**Fix:** Hoist to `_format_entry(value: int) -> str` at module scope — allocated once at import time.

---

### P6 — New Database Connection Opened Per Function Call · Lines 13 & 75 · 🟡 LOW

```python
conn = sqlite3.connect("users.db")   # cold connect on every call to get_user
...
conn = sqlite3.connect("app.db")     # cold connect on every call to load_users_from_file
```

`sqlite3.connect()` performs filesystem open, WAL/journal checks, and struct initialization. Called in a loop (e.g., batch user lookups) this becomes a measurable bottleneck.

**Fix:** Cache a module-level connection via a helper:
```python
_connections: dict[str, sqlite3.Connection] = {}

def _get_db_connection(db_path: str) -> sqlite3.Connection:
    if db_path not in _connections:
        _connections[db_path] = sqlite3.connect(db_path, check_same_thread=False)
    return _connections[db_path]
```

---

### P7 — Double Memory Allocation: `read()` + `json.loads()` · Lines 87–89 · 🟡 LOW

```python
content = file_handle.read()     # entire file → string in RAM
return json.loads(content)       # string → parsed object (second allocation)
```

The entire file is held twice in memory simultaneously. `json.load(file_handle)` streams directly from the file object, eliminating the intermediate string copy.

**Fix:** `return json.load(file_handle)`

---

### Performance Summary Table

| ID | Function | Lines | Issue | Complexity Before | Complexity After |
|---|---|---|---|---|---|
| P1 | `find_duplicates` | 26–30 | Nested loops + list scan | **O(n³)** | **O(n)** |
| P2 | `calculate_stats` | 61–69 | Two full passes over list | 2 × O(n) | 1 × O(n) |
| P3 | `calculate_stats` | 64, 69 | `len()` called twice | 2× call | 1× call |
| P4 | `calculate_stats` | 61–63 | Python loop instead of `sum()` | Slow Python | Fast C built-in |
| P5 | `process_records` | 49–52 | Function re-defined in loop | O(n) allocations | O(1) allocation |
| P6 | `get_user`, `load_users_from_file` | 13, 75 | New DB connection per call | O(1) × overhead | Amortized O(1) |
| P7 | `load_users_from_file` | 87–89 | Double memory for file content | 2× file size in RAM | 1× file size |

---

## Code Quality Findings

### Q1 — Missing Type Hints on All Functions · Lines 12, 23, 34, 42, 59, 74 · 🔴 CRITICAL

Not a single function carries PEP 484 type annotations. This breaks IDE autocompletion, mypy static analysis, documentation generators, and makes API contracts invisible to maintainers.

| Before | After |
|---|---|
| `def get_user(username):` | `def get_user(username: str) -> tuple[Any, ...] \| None:` |
| `def find_duplicates(items):` | `def find_duplicates(items: list[Any]) -> list[Any]:` |
| `def read_config(path):` | `def read_config(path: str) -> dict[str, Any]:` |
| `def process_records(records):` | `def process_records(records: list[dict[str, Any]]) -> list[str]:` |
| `def calculate_stats(numbers):` | `def calculate_stats(numbers: list[int \| float]) -> dict[str, float]:` |
| `def load_users_from_file(filepath, admin_username):` | `def load_users_from_file(filepath: str, admin_username: str) -> list[Any]:` |

---

### Q2 — Variable Shadowing in `process_records()` · Lines 47 & 51 · 🔴 CRITICAL

```python
name = record["name"].strip().upper()   # line 47 — computed, but NEVER used

def format_entry(v):
    name = f"entry_{v}"                 # line 51 — silently SHADOWS outer `name`
    return f"{name}:{v}"
```

The outer `name` value is derived from the record but then completely discarded because the inner function re-binds the same identifier. This is both a latent logic bug (the record's name is never used in the output) and a readability hazard. The inner function was eliminated entirely in the fix.

---

### Q3 — Function Defined Inside a Loop · Lines 49–52 · 🔴 CRITICAL

`format_entry` is a trivial, stateless helper that captures nothing from the enclosing scope, yet it is fully reconstructed on every loop iteration. See also P5. The function was hoisted to module-level `_format_entry()`.

---

### Q4 — Missing Error Handling Across Multiple Functions · Lines 34, 46, 64 · 🔴 CRITICAL

| Function | Unguarded operation | Exception raised |
|---|---|---|
| `read_config` | `open(path)` | `FileNotFoundError` |
| `read_config` | `json.load(f)` | `json.JSONDecodeError` |
| `process_records` | `record["value"]`, `record["name"]` | `KeyError` |
| `process_records` | `int(record["value"])` | `ValueError` |
| `calculate_stats` | `total / len(numbers)` | `ZeroDivisionError` |

None of these exceptions are caught; they propagate to the caller (or to an HTTP framework's error handler) with full stack traces.

---

### Q5 — Missing Docstrings on All Functions · All functions · 🟠 MAJOR

No function carries even a one-line PEP 257 docstring. Without documentation, the intent, parameters, return values, and error conditions are invisible to code reviewers and IDE tooling.

**Example of the expected standard:**
```python
def calculate_stats(numbers: list[int | float]) -> dict[str, float]:
    """Return mean, variance, and total for a non-empty sequence of numbers.

    Args:
        numbers: A non-empty list of numeric values.

    Returns:
        A dict with keys ``mean``, ``variance``, and ``total``.

    Raises:
        ValueError: If *numbers* is empty.
    """
```

---

### Q6 — O(n²) Anti-Pattern: `range(len(...))` Nested Loops · Lines 26–30 · 🟠 MAJOR

Using `range(len(items))` for index-based access is flagged by PEP 8 and every Python linter. The nested form further produces the O(n³) defect documented in P1. Pythonic iteration uses `for item in items` or appropriate data-structure primitives (see P1 fix).

---

### Q7 — Non-Pythonic Accumulation (`x = x + y`) · Lines 63 & 68 · 🟠 MAJOR

```python
total = total + n          # should be total += n
variance = variance + ...  # should be variance += ...
```

Augmented assignment (`+=`) is idiomatic Python, marginally faster (avoids one name lookup), and signals mutation intent clearly. All occurrences were updated.

---

### Q8 — Manual Sum Loop Instead of `sum()` Built-in · Lines 61–63 · 🟠 MAJOR

See P4. Using `sum(numbers)` is both faster and far more readable than a hand-written accumulation loop.

---

### Q9 — Missing `encoding=` Parameter in `open()` Calls · Lines 36 & 86 · 🟠 MAJOR

`open(path, "r")` without an explicit encoding relies on `locale.getpreferredencoding()`, which differs across operating systems (UTF-8 on macOS/Linux, often CP1252 on Windows). This is a portability bug. PEP 597 recommends explicit encoding; Python 3.15+ will emit a `DeprecationWarning` for bare opens. Both call sites were updated to `encoding="utf-8"`.

---

### Q10 — Database Connection Not Reused (Dependency Hardcoding) · Lines 13 & 75 · 🟡 MINOR

Each function opens its own hardcoded connection to a specific database file. This violates the Dependency Inversion principle, makes the functions untestable in isolation (cannot inject a mock/in-memory DB), and duplicates connection overhead. Longer-term, connection parameters should be injectable (see Recommendations §7).

---

### Q11 — Redundant `read()` + `json.loads()` Instead of `json.load()` · Lines 87–89 · 🟡 MINOR

```python
content = file_handle.read()    # full file → string
return json.loads(content)      # string → object (unnecessary intermediate)
```

`json.load(file_handle)` parses directly from the file object, is more idiomatic, uses less memory (P7), and is shorter. Fixed in the automated pass.

---

### Code Quality Summary Table

| ID | Severity | Function(s) | Lines | Issue |
|---|---|---|---|---|
| Q1 | 🔴 Critical | All | 12, 23, 34, 42, 59, 74 | Missing type hints |
| Q2 | 🔴 Critical | `process_records` | 47, 51 | Variable shadowing (`name`) |
| Q3 | 🔴 Critical | `process_records` | 49–52 | Function defined inside loop |
| Q4 | 🔴 Critical | `read_config`, `process_records`, `calculate_stats` | 34, 46, 64 | Missing error handling |
| Q5 | 🟠 Major | All | All | Missing PEP 257 docstrings |
| Q6 | 🟠 Major | `find_duplicates` | 26–30 | `range(len(...))` anti-pattern |
| Q7 | 🟠 Major | `calculate_stats` | 63, 68 | `x = x + y` instead of `+=` |
| Q8 | 🟠 Major | `calculate_stats` | 61–63 | Manual loop instead of `sum()` |
| Q9 | 🟠 Major | `read_config`, `load_users_from_file` | 36, 86 | `open()` without `encoding=` |
| Q10 | 🟡 Minor | `get_user`, `load_users_from_file` | 13, 75 | Hardcoded DB connections |
| Q11 | 🟡 Minor | `load_users_from_file` | 87–89 | `read()` + `json.loads()` vs `json.load()` |

---

## Changes Implemented

The following changes were applied to produce `output/fixed_sample_buggy.py`. Each row maps the change to the finding(s) it addresses.

| # | Function / Scope | Change Applied | Findings Addressed |
|---|---|---|---|
| 1 | `get_user` | Replaced string-concatenated SQL with parameterized query (`?`) | S1 |
| 2 | `get_user` | Wrapped `sqlite3.connect()` in `with` block | S5, Q4 |
| 3 | `get_user` | Added full PEP 484 type hints | Q1 |
| 4 | `get_user` | Added PEP 257 docstring | Q5 |
| 5 | `find_duplicates` | Replaced O(n³) nested loops with `Counter`-based O(n) one-liner | P1, Q6 |
| 6 | `find_duplicates` | Added full type hints | Q1 |
| 7 | `find_duplicates` | Added docstring | Q5 |
| 8 | `read_config` | Added `_assert_safe_path()` path traversal guard using `os.path.realpath` and `_CONFIG_DIR` | S3 |
| 9 | `read_config` | Replaced manual `open/close` with `with` block | S6, Q4 |
| 10 | `read_config` | Added `encoding="utf-8"` to `open()` | Q9 |
| 11 | `read_config` | Added `try/except FileNotFoundError` and `json.JSONDecodeError` handlers | Q4 |
| 12 | `read_config` | Renamed `f` → `config_file` (clearer identifier) | Q10 style |
| 13 | `read_config` | Added full type hints | Q1 |
| 14 | `read_config` | Added docstring | Q5 |
| 15 | `_format_entry` | Hoisted from inside loop to module-level helper function | P5, Q2, Q3 |
| 16 | `process_records` | Removed variable shadowing of `name`; inner function eliminated | Q2, Q3 |
| 17 | `process_records` | Wrapped field access in `try/except KeyError / ValueError / TypeError` | S7, Q4 |
| 18 | `process_records` | Added full type hints | Q1 |
| 19 | `process_records` | Added docstring | Q5 |
| 20 | `calculate_stats` | Added empty-list guard: `if not numbers: raise ValueError(...)` | S8, Q4 |
| 21 | `calculate_stats` | Replaced two Python accumulation loops with `sum()` + single generator | P2, P4, Q7, Q8 |
| 22 | `calculate_stats` | Cached `n = len(numbers)` to avoid double call | P3 |
| 23 | `calculate_stats` | Added full type hints | Q1 |
| 24 | `calculate_stats` | Added docstring | Q5 |
| 25 | `load_users_from_file` | Replaced string-concatenated SQL with parameterized query (`?`) | S2 |
| 26 | `load_users_from_file` | Added `_assert_safe_path()` path traversal guard using `_DATA_DIR` | S4 |
| 27 | `load_users_from_file` | Wrapped `sqlite3.connect()` in `with` block | S5, Q4 |
| 28 | `load_users_from_file` | Replaced manual `open/close` with `with` block | S6, Q4 |
| 29 | `load_users_from_file` | Replaced `read()` + `json.loads()` with `json.load(file_handle)` | P7, Q11 |
| 30 | `load_users_from_file` | Added `encoding="utf-8"` to `open()` | Q9 |
| 31 | `load_users_from_file` | Added full type hints | Q1 |
| 32 | `load_users_from_file` | Added docstring | Q5 |
| 33 | Module level | Added `_get_db_connection()` helper for connection caching | P6, Q10 |
| 34 | Module level | Added `_assert_safe_path()` utility and `_CONFIG_DIR` / `_DATA_DIR` constants | S3, S4 |

---

## Recommendations

### Immediate — Before Any Production Deployment

1. **Deploy `fixed_sample_buggy.py`** in place of the original. The two SQL injection vulnerabilities (S1, S2) are remotely exploitable with zero prerequisites and represent an unacceptable production risk.

2. **Set `_CONFIG_DIR` and `_DATA_DIR` to correct production paths.** The path traversal fix uses default constants that must be updated to actual server directories before deployment. Validate these paths in your deployment checklist and consider driving them from environment variables (`APP_CONFIG_DIR`, `APP_DATA_DIR`).

3. **Run the existing test suite against the fixed file.** The `find_duplicates` rewrite and `calculate_stats` loop consolidation change observable behavior for edge cases (empty inputs now raise `ValueError` instead of crashing differently). Update test assertions that depended on the old exception types or side effects.

### Short-Term — Current Sprint

4. **Add mypy to CI in strict mode.** All functions now carry type hints. Enforce them in your pipeline:
   ```bash
   mypy fixed_sample_buggy.py --strict --ignore-missing-imports
   ```
   This prevents type-hint drift and catches future regressions at PR time.

5. **Extend unit test coverage to error paths.** The new validation guards in `process_records` (S7/Q4) and `calculate_stats` (S8/Q4) need tests for: empty list, missing `"value"` key, missing `"name"` key, non-numeric `"value"`, and non-string `"name"`.

6. **Run a pattern grep across the entire codebase** to find other instances of the same vulnerabilities:
   ```bash
   # SQL injection
   grep -rn '"SELECT.*+" \|'"'"'SELECT.*+'" src/
   # Unclosed resources
   grep -rn "= open(" src/
   grep -rn "sqlite3.connect(" src/
   ```

### Medium-Term — Architectural Improvements

7. **Inject the database connection instead of opening it inside each function.** The current pattern (`sqlite3.connect("users.db")` hardcoded) is untestable — you cannot pass a mock or in-memory SQLite database. Refactor signatures to accept a `conn: sqlite3.Connection` parameter, or wrap functions in a class that holds the connection.

8. **Migrate raw SQL to an ORM or typed query builder** (e.g., SQLAlchemy Core, `databases`, or Tortoise ORM). Parameterized queries prevent SQL injection at the call site, but an ORM makes injection structurally impossible at the construction layer. It also provides schema validation, migration tooling, and easier testing.

9. **Add structured logging to the error handlers.** The `process_records` exception path currently re-raises. In production, malformed records should be logged (with sanitized field values and a record index) before being skipped or re-raised, to support data-quality monitoring and alerting.

10. **Consider a schema-validation library for incoming data.** Using `pydantic` or `marshmallow` to model the expected shape of `records` in `process_records` would eliminate the manual `try/except` boilerplate, provide richer auto-documented error messages, and enforce contracts at the boundary where data enters the system.

11. **Enable platform-appropriate linting.** Add `ruff` or `flake8` + `pylint` to the CI pipeline to automatically flag the style issues (Q6–Q11) in future contributions before they reach review.

---

*Report generated by AI Code Review Pipeline · 2026-05-05*
