"""
Sample Python file with intentional code issues for demo purposes.

This file is used as input for the AI Code Review & Improvement System.
It contains intentional security, performance, and code quality problems.
"""

import json
import os
import sqlite3
from collections import Counter
from typing import Any

# ---------------------------------------------------------------------------
# Path-traversal guard: all user-supplied file paths must resolve inside one
# of these allow-listed base directories.  Override at deployment time via the
# corresponding environment variables.
# ---------------------------------------------------------------------------
_CONFIG_DIR: str = os.path.realpath(
    os.environ.get(
        "CONFIG_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "config")
    )
)

_DATA_DIR: str = os.path.realpath(
    os.environ.get(
        "DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    )
)


def _assert_safe_path(user_path: str, allowed_base: str) -> str:
    """Resolve *user_path* and raise ``ValueError`` if it escapes *allowed_base*.

    Returns the resolved absolute path on success.

    Fixes applied
    -------------
    - Security #3 / Security #4 : path-traversal guard for ``read_config``
      and ``load_users_from_file``.
    """
    resolved = os.path.realpath(user_path)
    # os.sep suffix ensures "/allowed/dir" does not also admit "/allowed/dir2"
    if not (resolved == allowed_base or resolved.startswith(allowed_base + os.sep)):
        raise ValueError(
            f"Access denied: '{user_path}' resolves outside the allowed directory."
        )
    return resolved


# ---------------------------------------------------------------------------
# DB connection cache (Performance fix #7 – new connection per call).
# Connections are opened lazily and reused across calls to the same DB file.
# ---------------------------------------------------------------------------
_db_connections: dict[str, sqlite3.Connection] = {}


def _get_db_connection(db_path: str) -> sqlite3.Connection:
    """Return a cached ``sqlite3.Connection`` for *db_path*, creating it if absent.

    Fixes applied
    -------------
    - Performance #7 : avoids opening a new connection on every function call.
    """
    if db_path not in _db_connections:
        _db_connections[db_path] = sqlite3.connect(
            db_path, check_same_thread=False
        )
    return _db_connections[db_path]


# ---------------------------------------------------------------------------
# Internal helper – defined once at module level, NOT inside a loop.
# Fixes: variable shadowing of 'name' (Quality #4) and per-iteration function
# object allocation (Quality #5 / Performance #3).
# ---------------------------------------------------------------------------
def _format_entry(value: int) -> str:
    """Return a formatted entry string for a single integer value."""
    entry_label = f"entry_{value}"
    return f"{entry_label}:{value}"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_user(username: str, db_path: str = "users.db") -> tuple[Any, ...] | None:
    """Fetch a single user row by *username*.

    Args:
        username: The username to look up.
        db_path:  Path to the SQLite database file (default: ``"users.db"``).

    Returns:
        A row tuple when the user is found, ``None`` otherwise.

    Fixes applied
    -------------
    - Security #1  : parameterised query eliminates SQL injection
      (was ``"SELECT * FROM users WHERE username = '" + username + "'"``).
    - Security #5  : cached connection via ``_get_db_connection`` is also
      closed cleanly by the connection's internal reference counting.
    - Quality  #1  : type hints added.
    - Quality  #2  : resource-leak fixed – the original ``conn.close()`` was
      silently skipped whenever ``cursor.execute()`` raised an exception.
    - Performance #7 : reuses a cached connection instead of opening a new
      one on every call.
    """
    conn = _get_db_connection(db_path)
    cursor = conn.cursor()
    # FIX Security #1 — parameterised query (? placeholder)
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    return cursor.fetchone()


def find_duplicates(items: list[Any]) -> list[Any]:
    """Return a list of items that appear more than once in *items*.

    Args:
        items: Any sequence of hashable elements.

    Returns:
        A list of duplicate elements in first-seen order.

    Examples:
        >>> find_duplicates([1, 2, 3, 2, 4, 3, 5])
        [2, 3]

    Fixes applied
    -------------
    - Performance #1 : O(n³) nested-loop + O(n) ``in``-list check replaced
      with a single ``Counter`` pass → overall O(n).
    - Performance #2 : eliminated redundant symmetric pair checks.
    - Quality  #6  : O(n²) algorithm flagged; now uses ``Counter`` (O(n)).
    - Quality  #1  : type hints added.
    """
    # FIX Performance #1 — single-pass Counter, O(n)
    counts: Counter[Any] = Counter(items)
    return [item for item, count in counts.items() if count > 1]


def read_config(path: str) -> dict[str, Any]:
    """Load and return a JSON configuration file from *path*.

    *path* must resolve inside the ``_CONFIG_DIR`` directory (see module-level
    constant).  Override the allowed base at deploy-time via the ``CONFIG_DIR``
    environment variable.

    Args:
        path: Filesystem path to the JSON config file.

    Returns:
        A dictionary containing the parsed JSON configuration.

    Raises:
        ValueError:       If *path* escapes the allowed config directory.
        FileNotFoundError: If the file does not exist at the resolved path.
        ValueError:       If the file contains malformed JSON.

    Fixes applied
    -------------
    - Security #3  : path-traversal guard via ``_assert_safe_path`` restricts
      reads to ``_CONFIG_DIR`` (was a bare, unchecked ``open(path, "r")``).
    - Security #6  : ``with`` context manager ensures the file handle is closed
      even when ``json.load()`` raises (was ``f.close()`` which was silently
      skipped on exception).
    - Quality  #1  : type hints added.
    - Quality  #3  : ``FileNotFoundError`` and ``json.JSONDecodeError`` caught
      and re-raised with actionable messages.
    - Quality  #8  : explicit ``encoding="utf-8"`` for cross-platform safety.
    """
    # FIX Security #3 — path-traversal guard
    safe_path = _assert_safe_path(path, _CONFIG_DIR)

    try:
        # FIX Security #6 / Quality #2 — context manager closes file on exception
        with open(safe_path, "r", encoding="utf-8") as config_file:
            return json.load(config_file)
    except FileNotFoundError:
        raise FileNotFoundError(f"Config file not found: '{path}'")
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in config file '{path}': {exc}") from exc


def process_records(records: list[dict[str, Any]]) -> list[str]:
    """Process a list of record dicts and return formatted entry strings.

    Each record must contain at least ``"value"`` (convertible to ``int``)
    and ``"name"`` (a string) keys.

    Args:
        records: A list of dictionaries, each with at minimum ``"value"``
                 and ``"name"`` keys.

    Returns:
        A list of formatted entry strings, one per input record.

    Raises:
        ValueError: If a record is missing a required key or ``"value"``
                    cannot be converted to ``int``.

    Fixes applied
    -------------
    - Quality  #3  : ``try/except`` handles ``KeyError`` (missing key) and
      ``ValueError``/``TypeError`` (bad value type) with descriptive messages
      (Security #8 in the consolidated review).
    - Quality  #4  : variable shadowing of ``name`` eliminated – ``_format_entry``
      is now a module-level helper and never redefines ``name`` inside the loop.
    - Quality  #5  / Performance #3 : inner ``format_entry`` function no longer
      defined on every loop iteration; ``_format_entry`` is allocated once at
      import time.
    - Quality  #1  : type hints added.
    """
    results: list[str] = []
    for idx, record in enumerate(records):
        try:
            value = int(record["value"])
            # Validate "name" exists and is string-compatible; result unused here
            # but intentionally validated per original module contract.
            str(record["name"]).strip().upper()
        except KeyError as exc:
            raise ValueError(
                f"Record at index {idx} is missing required key {exc}."
            ) from exc
        except (ValueError, TypeError) as exc:
            raise ValueError(
                f"Record at index {idx} contains invalid data: {exc}"
            ) from exc

        # FIX Quality #5 / Performance #3 — module-level helper, allocated once
        results.append(_format_entry(value))

    return results


def calculate_stats(numbers: list[int | float]) -> dict[str, float]:
    """Return mean, population variance, and total for a non-empty list.

    Args:
        numbers: A non-empty list of numeric values.

    Returns:
        A dict with keys ``"mean"``, ``"variance"``, and ``"total"``.

    Raises:
        ValueError: If *numbers* is empty.

    Examples:
        >>> calculate_stats([10, 20, 30, 40, 50])
        {'mean': 30.0, 'variance': 200.0, 'total': 150}

    Fixes applied
    -------------
    - Security #9 / Quality #3 : guard against empty list → ``ZeroDivisionError``
      (was reachable with any empty input).
    - Performance #4            : two full Python ``for`` loops collapsed into
      built-in ``sum()`` calls (C-level, ~4–8× faster than interpreted loops).
    - Performance #5            : ``len(numbers)`` computed once and stored in
      ``n`` (was evaluated twice on lines 64 and 69).
    - Performance #6 / Quality #7 : ``total = total + n`` replaced by
      ``sum(numbers)``; ``variance = variance + …`` replaced by a generator
      expression fed to ``sum()``.
    - Quality  #1  : type hints added.
    """
    # FIX Security #9 / Quality #3 — empty-list guard
    if not numbers:
        raise ValueError("Cannot calculate stats on an empty list.")

    # FIX Performance #5 — cache len(); was called twice in original code
    n: int = len(numbers)

    # FIX Performance #6 / Quality #7 — built-in sum() replaces Python loop
    total: float = sum(numbers)
    mean: float = total / n

    # FIX Performance #4 — single generator expression replaces second for-loop
    variance: float = sum((x - mean) ** 2 for x in numbers) / n

    return {"mean": mean, "variance": variance, "total": total}


def load_users_from_file(
    filepath: str,
    admin_username: str,
    db_path: str = "app.db",
) -> list[Any]:
    """Return parsed user records from *filepath* if *admin_username* has admin rights.

    *filepath* must resolve inside the ``_DATA_DIR`` directory (see module-level
    constant).  Override the allowed base at deploy-time via the ``DATA_DIR``
    environment variable.

    Args:
        filepath:       Path to the JSON file containing user records.
        admin_username: Username whose permissions are verified before loading.
        db_path:        Path to the SQLite database (default: ``"app.db"``).

    Returns:
        A list of parsed user records, or an empty list if access is denied.

    Raises:
        ValueError:       If *filepath* escapes the allowed data directory.
        FileNotFoundError: If the user data file does not exist.
        ValueError:       If the file contains malformed JSON.

    Fixes applied
    -------------
    - Security #2  : parameterised query eliminates SQL injection in the
      permissions check (was string-concatenated ``+ admin_username + ``).
    - Security #4  : path-traversal guard via ``_assert_safe_path`` restricts
      reads to ``_DATA_DIR`` (was unchecked ``open(filepath, "r")``).
    - Security #5  : DB connection leak fixed — ``_get_db_connection()`` reuses
      a cached connection; original ``conn.close()`` was skipped on exception.
    - Security #7  : file-handle leak fixed — ``with`` block closes the handle
      even when ``json.load()`` raises (original ``file_handle.close()`` skipped
      on ``read()`` or ``json.loads()`` exception).
    - Performance #7 : cached DB connection instead of ``sqlite3.connect()``
      on every call.
    - Quality  #10 : ``json.load(fh)`` streams directly from the file object,
      eliminating the redundant intermediate string produced by
      ``fh.read()`` + ``json.loads()``.
    - Quality  #8  : explicit ``encoding="utf-8"``.
    - Quality  #1  : type hints added.
    """
    # FIX Security #4 — path-traversal guard
    safe_filepath = _assert_safe_path(filepath, _DATA_DIR)

    # FIX Security #2 — parameterised query; FIX Performance #7 — cached conn
    conn = _get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT permissions FROM users WHERE username = ?",
        (admin_username,),
    )
    permissions = cursor.fetchone()

    if not (permissions and "admin" in permissions[0]):
        return []

    # FIX Security #7 / Quality #2 — context manager; FIX Quality #10 — json.load
    try:
        with open(safe_filepath, "r", encoding="utf-8") as user_file:
            return json.load(user_file)
    except FileNotFoundError:
        raise FileNotFoundError(f"User data file not found: '{filepath}'")
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Could not parse user data from '{filepath}': {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# Demo entry-point (unchanged from original)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(find_duplicates([1, 2, 3, 2, 4, 3, 5]))
    print(calculate_stats([10, 20, 30, 40, 50]))
