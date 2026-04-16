#!/usr/bin/env python3

from __future__ import annotations

import json
import sys

from common import load_session_state, read_json


def main() -> int:
    payload = read_json(sys.stdin.read())
    session_id = payload.get("session_id", "unknown-session")
    turn_id = payload.get("turn_id", "unknown-turn")
    stop_hook_active = bool(payload.get("stop_hook_active"))

    state = load_session_state(session_id)
    turn_state = state.get("turns", {}).get(turn_id, {})

    if stop_hook_active:
        print(
            json.dumps(
                {
                    "continue": True
                }
            )
        )
        return 0

    if turn_state.get("validation_failed"):
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": (
                        "A validation command failed during this turn. Inspect the failing output, "
                        "fix the issue, and rerun validation before finishing."
                    ),
                }
            )
        )
        return 0

    if turn_state.get("mutating_bash_commands") and not turn_state.get("validation_commands"):
        print(
            json.dumps(
                {
                    "decision": "block",
                    "reason": (
                        "This turn ran Bash commands that likely changed the workspace, but no test or validation "
                        "command was recorded. Run an appropriate check before stopping."
                    ),
                }
            )
        )
        return 0

    print(json.dumps({"continue": True}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
