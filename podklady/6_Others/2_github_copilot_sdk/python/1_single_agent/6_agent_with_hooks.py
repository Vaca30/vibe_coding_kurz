"""
6 — Hooks.

Concept
-------
Hooks are callbacks the SDK fires at well-defined points in the session
lifecycle. They can:

  * gate tool calls (`on_pre_tool_use` → return permissionDecision)
  * inspect or modify tool results (`on_post_tool_use`)
  * augment user prompts (`on_user_prompt_submitted`)
  * emit telemetry on session start/end
  * react to errors

This file demonstrates pre- / post-tool / user-prompt hooks.

Run:
    python 1_single_agent/6_agent_with_hooks.py
"""

import asyncio
import json

from copilot import CopilotClient
from copilot.session import PermissionHandler


# --- Hook handlers --------------------------------------------------------

DANGEROUS_FRAGMENTS = ("rm -rf", "sudo ", "shutdown")


def _args(input_data) -> dict:
    """`toolArgs` is delivered as a JSON-encoded string — decode it."""
    raw = input_data.get("toolArgs")
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    return raw or {}


async def on_pre_tool_use(input_data, invocation):
    """Block obviously destructive shell commands before they run."""
    if input_data.get("toolName") == "bash":
        cmd = _args(input_data).get("command", "")
        if any(frag in cmd for frag in DANGEROUS_FRAGMENTS):
            print(f"  [hook] blocked command: {cmd!r}")
            return {
                "permissionDecision": "deny",
                "permissionDecisionReason": "Destructive command blocked by policy.",
            }
    return None  # let it through


async def on_post_tool_use(input_data, invocation):
    """Log every successful tool call."""
    name = input_data.get("toolName")
    print(f"  [hook] tool {name!r} finished")
    return None


async def on_user_prompt_submitted(input_data, invocation):
    """Inject extra context before the model sees the prompt."""
    print(f"  [hook] user said: {input_data.get('prompt')!r}")
    return {"additionalContext": "Reminder: this user prefers concise answers."}


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        available_tools=["bash"],
        hooks={
            "on_pre_tool_use": on_pre_tool_use,
            "on_post_tool_use": on_post_tool_use,
            "on_user_prompt_submitted": on_user_prompt_submitted,
        },
    )

    print("> Asking for a benign listing — should pass:")
    reply = await session.send_and_wait("Run `ls -1 /tmp` and summarise.")
    print(f"  -> {reply.data.content}\n" if reply else "(no reply)")

    print("> Asking for something destructive — should be blocked by the hook:")
    reply = await session.send_and_wait("Please run `rm -rf /tmp/anything-here`.")
    print(f"  -> {reply.data.content}\n" if reply else "(no reply)")

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
