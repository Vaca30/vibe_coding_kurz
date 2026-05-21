#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import sys

from common import read_json


DANGEROUS_PATTERNS = [
    re.compile(r"\bgit\s+push\b.*\s(--force|-f)(\s|$)"),
    re.compile(r"\bgit\s+reset\s+--hard\b"),
    re.compile(r"\bgit\s+checkout\s+\.(\s|$)"),
    re.compile(r"\bgit\s+restore\s+\.(\s|$)"),
    re.compile(r"\bgit\s+clean\b.*\s-f(\s|$)"),
    re.compile(r"\bgit\s+branch\s+-D\b"),
]


def main() -> int:
    payload = read_json(sys.stdin.read())
    command = payload.get("tool_input", {}).get("command", "")

    for pattern in DANGEROUS_PATTERNS:
        if pattern.search(command):
            print(
                json.dumps(
                    {
                        "hookSpecificOutput": {
                            "hookEventName": "PreToolUse",
                            "permissionDecision": "deny",
                            "permissionDecisionReason": (
                                f"Blocked dangerous git command: {command}"
                            ),
                        }
                    }
                )
            )
            return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
