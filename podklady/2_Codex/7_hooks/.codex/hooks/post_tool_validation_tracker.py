#!/usr/bin/env python3

from __future__ import annotations

import sys

from common import (
    command_fingerprint,
    load_session_state,
    mutating_command,
    now_iso,
    read_json,
    save_session_state,
    tool_response_text,
    validation_command,
    validation_failed,
)


def main() -> int:
    payload = read_json(sys.stdin.read())
    session_id = payload.get("session_id", "unknown-session")
    turn_id = payload.get("turn_id", "unknown-turn")
    command = payload.get("tool_input", {}).get("command", "")
    response = payload.get("tool_response")

    state = load_session_state(session_id)
    turn_state = state.setdefault("turns", {}).setdefault(
        turn_id,
        {
            "commands": [],
            "mutating_bash_commands": [],
            "validation_commands": [],
            "validation_failed": False,
            "last_updated_at": None,
        },
    )

    turn_state["commands"].append(command)
    turn_state["last_updated_at"] = now_iso()

    if mutating_command(command):
        turn_state["mutating_bash_commands"].append(command)

    if validation_command(command):
        turn_state["validation_commands"].append(
            {
                "command": command,
                "fingerprint": command_fingerprint(command),
                "failed": validation_failed(response),
                "response_excerpt": tool_response_text(response)[:500],
            }
        )
        if validation_failed(response):
            turn_state["validation_failed"] = True
            turn_state["last_failed_validation_command"] = command

    save_session_state(session_id, state)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
