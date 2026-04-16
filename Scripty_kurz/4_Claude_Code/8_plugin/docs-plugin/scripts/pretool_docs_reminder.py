#!/usr/bin/env python3
"""PreToolUse hook: Documentation Reminder

When Claude writes or edits a source code file, checks if companion
documentation exists in the docs/ folder. If it does, reminds Claude
to consider updating it.

Does NOT block — only advises via additionalContext.

Receives JSON on stdin with: tool_name, tool_input, hook_event_name.
Outputs JSON to stdout with permissionDecision and additionalContext.
"""

import json
import os
import sys
from pathlib import Path

SOURCE_EXTENSIONS = {".py", ".ts", ".js", ".go", ".tsx", ".jsx"}
SKIP_PATTERNS = {"__pycache__", "node_modules", ".venv", "venv", ".git"}


def find_project_root(file_path: str) -> Path | None:
    """Walk up from file_path to find the project root (has docs/ or pyproject.toml)."""
    path = Path(file_path).resolve().parent
    for _ in range(20):
        if (path / "docs").is_dir() or (path / "pyproject.toml").exists():
            return path
        parent = path.parent
        if parent == path:
            break
        path = parent
    return None


def find_companion_docs(file_path: str, project_root: Path) -> list[str]:
    """Find documentation files that might correspond to the source file."""
    companions = []
    stem = Path(file_path).stem
    docs_dir = project_root / "docs"

    if not docs_dir.is_dir():
        return companions

    for doc_file in docs_dir.rglob("*"):
        if not doc_file.is_file():
            continue
        if doc_file.suffix not in (".md", ".rst", ".txt"):
            continue
        doc_name = doc_file.stem.lower()
        if stem.lower() in doc_name or doc_name in stem.lower():
            companions.append(str(doc_file.relative_to(project_root)))

    return companions


def check_module_docstring(file_path: str) -> bool:
    """Check if a Python file has a module-level docstring."""
    if not file_path.endswith(".py"):
        return True

    try:
        import ast

        with open(file_path) as f:
            tree = ast.parse(f.read())
        return ast.get_docstring(tree) is not None
    except (SyntaxError, FileNotFoundError, PermissionError):
        return True


def main():
    hook_input = json.load(sys.stdin)

    tool_name = hook_input.get("tool_name", "")
    tool_input = hook_input.get("tool_input", {})

    if tool_name not in ("Write", "Edit"):
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    if not file_path:
        sys.exit(0)

    suffix = Path(file_path).suffix
    if suffix not in SOURCE_EXTENSIONS:
        sys.exit(0)

    if any(skip in file_path for skip in SKIP_PATTERNS):
        sys.exit(0)

    messages = []

    project_root = find_project_root(file_path)
    if project_root:
        companions = find_companion_docs(file_path, project_root)
        if companions:
            doc_list = ", ".join(companions)
            messages.append(
                f"This file has companion documentation: {doc_list}. "
                f"Consider updating it if the public interface changed."
            )

    if not check_module_docstring(file_path):
        messages.append(
            f"{Path(file_path).name} has no module-level docstring."
        )

    if messages:
        result = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "additionalContext": " | ".join(messages),
            }
        }
        json.dump(result, sys.stdout)

    sys.exit(0)


if __name__ == "__main__":
    main()
