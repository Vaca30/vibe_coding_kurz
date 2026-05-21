#!/usr/bin/env python3
"""Best-effort Stop hook to prompt one final documentation pass.

Codex hook discovery is repo- or user-config based, so this script is only
active if the hook config is installed into a discovered hooks.json file.
"""

from __future__ import annotations

import json
import sys


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    if hook_input.get("stop_hook_active"):
        return 0

    result = {
        "decision": "block",
        "reason": (
            "Before finishing, verify whether any public-facing code changes in this turn "
            "also require docstring, README, or docs/ updates. If documentation is still "
            "missing, update it now or explain why it is not needed."
        ),
    }
    json.dump(result, sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
