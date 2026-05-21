#!/usr/bin/env python3

from __future__ import annotations

import json
import sys

from common import now_iso, read_json


def main() -> int:
    payload = read_json(sys.stdin.read())
    source = payload.get("source", "unknown")

    response = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": (
                "This workspace enables Codex hooks. Bash commands are screened for dangerous git usage, "
                "user prompts are scanned for obvious secrets, Bash activity is logged to a local audit file, "
                "and finishing the turn triggers a validation check for Bash-driven changes."
                f" Session source: {source}. Loaded at {now_iso()}."
            ),
        }
    }
    print(json.dumps(response))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
