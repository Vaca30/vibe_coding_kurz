"""
2a — Configuring the session.

Concept
-------
The session config controls almost everything: working directory, system
message, allowed/denied tools, permission handler, hooks, custom agents, etc.
This file walks through the most useful knobs without going deep on any one.

Run:
    python 1_single_agent/2a_agent_with_options.py
"""

import asyncio

from copilot import CopilotClient
from copilot.session import PermissionHandler


async def example_system_message_append(client: CopilotClient) -> None:
    """`mode: append` adds your text *after* the SDK-managed system prompt."""
    print("--- system_message append ---")
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={
            "mode": "append",
            "content": "Always answer like a 17th-century pirate.",
        },
    )
    reply = await session.send_and_wait("Tell me about Python.")
    print(reply.data.content if reply else "(no reply)")
    await session.disconnect()


async def example_system_message_replace(client: CopilotClient) -> None:
    """`mode: replace` removes the entire built-in system prompt — use carefully."""
    print("\n--- system_message replace ---")
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={
            "mode": "replace",
            "content": "You are a haiku-only assistant. Reply with exactly 3 lines.",
        },
    )
    reply = await session.send_and_wait("Tell me about async programming.")
    print(reply.data.content if reply else "(no reply)")
    await session.disconnect()


async def example_tool_allowlist(client: CopilotClient) -> None:
    """Restrict the agent to a specific subset of built-in tools."""
    print("\n--- available_tools allowlist ---")
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        # Only let the agent read files — no shell, no edits.
        available_tools=["view", "grep", "glob"],
    )
    reply = await session.send_and_wait(
        "Without modifying anything, tell me what files are in the current directory."
    )
    print(reply.data.content if reply else "(no reply)")
    await session.disconnect()


async def example_working_directory(client: CopilotClient) -> None:
    """Pin the session to a specific working directory."""
    print("\n--- working_directory ---")
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        working_directory="/tmp",
    )
    reply = await session.send_and_wait("What is your current working directory?")
    print(reply.data.content if reply else "(no reply)")
    await session.disconnect()


async def main() -> None:
    client = CopilotClient()
    await client.start()
    try:
        await example_system_message_append(client)
        await example_system_message_replace(client)
        await example_tool_allowlist(client)
        await example_working_directory(client)
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
