"""
4c — MCP tools (external).

Concept
-------
Custom tools (4b) live in your process. MCP servers run *out of process* and
speak the Model Context Protocol over stdio or HTTP. The Copilot SDK can spawn
or connect to them and merge their tools into the session.

This example wires up the official Playwright MCP server so the agent can drive
a browser. You'll need npx in your PATH.

Run:
    python 1_single_agent/4c_agent_with_mcp_tools.py
"""

import asyncio

from copilot import CopilotClient
from copilot.session import PermissionHandler


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        mcp_servers={
            "playwright": {
                "type": "stdio",
                "command": "npx",
                "args": ["@playwright/mcp@latest"],
                # "*" exposes every tool the server advertises; you can also
                # pin to a specific subset like ["browser_navigate",
                # "browser_snapshot"].
                "tools": ["*"],
            },
        },
    )

    reply = await session.send_and_wait(
        "Open https://example.com, take a snapshot of the page, "
        "and tell me in one sentence what's on it."
    )
    if reply is not None:
        print(reply.data.content)

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
