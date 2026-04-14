#!/usr/bin/env python3

from __future__ import annotations

import json
import sys

from common import prompt_secret_matches, read_json


def main() -> int:
    payload = read_json(sys.stdin.read())
    prompt = payload.get("prompt", "")
    matches = prompt_secret_matches(prompt)

    if matches:
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": (
                        "Prompt blocked because it appears to include sensitive credentials: "
                        + ", ".join(matches)
                        + ". Remove the secret and retry."
                    ),
                }
            )
        )
        return 0

    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "UserPromptSubmit",
                    "additionalContext": (
                        "If you edit code through Bash instead of native tools, run validation before you finish."
                    ),
                }
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
