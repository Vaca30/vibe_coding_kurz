#!/usr/bin/env python3

from __future__ import annotations

import sys

from common import append_audit_log, now_iso, read_json, tool_response_text


def main() -> int:
    payload = read_json(sys.stdin.read())
    append_audit_log(
        {
            "timestamp": now_iso(),
            "hook_event_name": payload.get("hook_event_name"),
            "session_id": payload.get("session_id"),
            "turn_id": payload.get("turn_id"),
            "cwd": payload.get("cwd"),
            "tool_name": payload.get("tool_name"),
            "command": payload.get("tool_input", {}).get("command", ""),
            "tool_response_excerpt": tool_response_text(payload.get("tool_response"))[:500],
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
