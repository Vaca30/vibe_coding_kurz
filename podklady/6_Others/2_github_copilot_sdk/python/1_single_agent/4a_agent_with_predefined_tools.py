"""
4a — Predefined tools.

Concept
-------
The Copilot CLI ships with a generous set of built-in tools (file ops, shell,
search, etc.). By default the SDK runs in "approve-all" mode, but you usually
want to scope what the agent can touch via `available_tools` (allowlist) or
`excluded_tools` (blocklist).

This example also shows how to *observe* tool calls in real time by
subscribing to `tool.execution_start` events.

Run:
    python 1_single_agent/4a_agent_with_predefined_tools.py
"""

import asyncio

from copilot import CopilotClient
from copilot.generated.session_events import (
    AssistantMessageData,
    ToolExecutionStartData,
)
from copilot.session import PermissionHandler


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        # Allowlist — the agent will refuse anything outside this list.
        available_tools=["bash", "view", "edit", "write", "grep", "glob"],
    )

    def on_event(event):
        if isinstance(event.data, ToolExecutionStartData):
            args = event.data.arguments or {}
            print(f"  [tool] {event.data.tool_name}({args})")
        elif isinstance(event.data, AssistantMessageData):
            # Final assistant message of a turn.
            print(f"  [assistant] {event.data.content}")

    session.on(on_event)

    print("> Create a file called /tmp/copilot_demo.txt with the text 'hello from copilot'.")
    await session.send_and_wait(
        "Create a file at /tmp/copilot_demo.txt containing the text 'hello from copilot'.",
    )

    print("\n> Read it back.")
    await session.send_and_wait("Now read /tmp/copilot_demo.txt and tell me what's inside.")

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
