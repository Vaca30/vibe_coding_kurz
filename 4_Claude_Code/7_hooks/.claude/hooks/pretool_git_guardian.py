#!/usr/bin/env python3
"""PreToolUse hook: Git Guardian

Blocks dangerous git operations before they execute:
- git push --force / -f
- git reset --hard
- git checkout . / git restore .
- git clean -f
- git branch -D (force delete)

Receives JSON on stdin with: tool_name, tool_input, hook_event_name.
Outputs JSON to stdout with permissionDecision: deny when blocking.
"""

import json
import re
import sys

DANGEROUS_PATTERNS = [
    (r"git\s+push\s+.*--force", "Force push can overwrite remote history"),
    (r"git\s+push\s+.*-f\b", "Force push can overwrite remote history"),
    (r"git\s+reset\s+--hard", "Hard reset discards all uncommitted changes"),
    (r"git\s+checkout\s+\.\s*$", "Checkout . discards all working directory changes"),
    (r"git\s+restore\s+\.\s*$", "Restore . discards all working directory changes"),
    (r"git\s+clean\s+-[a-zA-Z]*f", "Clean -f permanently deletes untracked files"),
    (r"git\s+branch\s+-D\s+", "Force branch deletion cannot be easily undone"),
]


def main():
    hook_input = json.load(sys.stdin)

    tool_name = hook_input.get("tool_name", "")
    tool_input = hook_input.get("tool_input", {})

    if tool_name != "Bash":
        sys.exit(0)

    command = tool_input.get("command", "")

    for pattern, reason in DANGEROUS_PATTERNS:
        if re.search(pattern, command):
            result = {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": (
                        f"BLOCKED by Git Guardian: {reason}. "
                        f"Command: {command}"
                    ),
                }
            }
            json.dump(result, sys.stdout)
            sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
