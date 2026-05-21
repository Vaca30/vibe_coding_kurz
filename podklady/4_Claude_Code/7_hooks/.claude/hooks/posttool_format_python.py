#!/usr/bin/env python3
"""PostToolUse hook: Python Auto-Formatter

After a Write or Edit tool modifies a .py file, automatically runs
ruff format on it. Falls back to black if ruff is unavailable.

Receives JSON on stdin with: tool_name, tool_input, hook_event_name.
Outputs JSON to stdout with additionalContext reporting what happened.
"""

import json
import subprocess
import sys


def main():
    hook_input = json.load(sys.stdin)

    tool_name = hook_input.get("tool_name", "")
    tool_input = hook_input.get("tool_input", {})

    if tool_name not in ("Write", "Edit"):
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    if not file_path.endswith(".py"):
        sys.exit(0)

    for formatter, args in [
        ("ruff", ["ruff", "format", file_path]),
        ("black", ["black", "--quiet", file_path]),
    ]:
        try:
            result = subprocess.run(
                args, capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                output = {
                    "hookSpecificOutput": {
                        "hookEventName": "PostToolUse",
                        "additionalContext": (
                            f"Auto-formatted {file_path} with {formatter}."
                        ),
                    }
                }
                json.dump(output, sys.stdout)
                sys.exit(0)
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue

    sys.exit(0)


if __name__ == "__main__":
    main()
