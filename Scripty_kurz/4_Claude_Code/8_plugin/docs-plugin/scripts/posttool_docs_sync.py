#!/usr/bin/env python3
"""PostToolUse hook: Documentation Sync Checker

After Claude writes or edits a Python source file, parses it with the
ast module to find public functions and classes that lack docstrings.

Reports missing docstrings via additionalContext so Claude can fix them.

Receives JSON on stdin with: tool_name, tool_input, tool_result, hook_event_name.
Outputs JSON to stdout with additionalContext.
"""

import ast
import json
import sys
from pathlib import Path


def find_undocumented_symbols(file_path: str) -> list[str]:
    """Parse a Python file and return names of public functions/classes without docstrings."""
    try:
        with open(file_path) as f:
            source = f.read()
        tree = ast.parse(source)
    except (SyntaxError, FileNotFoundError, PermissionError):
        return []

    undocumented = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.name.startswith("_"):
                continue
            if ast.get_docstring(node) is None:
                undocumented.append(f"`{node.name}()` (line {node.lineno})")

        elif isinstance(node, ast.ClassDef):
            if node.name.startswith("_"):
                continue
            if ast.get_docstring(node) is None:
                undocumented.append(f"class `{node.name}` (line {node.lineno})")

    return undocumented


def main():
    hook_input = json.load(sys.stdin)

    tool_name = hook_input.get("tool_name", "")
    tool_input = hook_input.get("tool_input", {})

    if tool_name not in ("Write", "Edit"):
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    if not file_path or not file_path.endswith(".py"):
        sys.exit(0)

    if not Path(file_path).exists():
        sys.exit(0)

    undocumented = find_undocumented_symbols(file_path)

    if undocumented:
        filename = Path(file_path).name
        symbol_list = ", ".join(undocumented)
        result = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": (
                    f"Missing docstrings in {filename}: {symbol_list}. "
                    f"Consider adding docstrings to these public symbols."
                ),
            }
        }
        json.dump(result, sys.stdout)

    sys.exit(0)


if __name__ == "__main__":
    main()
