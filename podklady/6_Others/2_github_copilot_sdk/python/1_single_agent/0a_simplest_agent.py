"""
0a — The simplest possible Copilot SDK session.

Concept
-------
Spin up a CopilotClient, create a session, send one prompt, print the answer,
shut down. No tools, no streaming, no custom config.

Run:
    python 1_single_agent/0a_simplest_agent.py
"""

import asyncio

from copilot import CopilotClient
from copilot.session import PermissionHandler


async def main() -> None:
    client = CopilotClient()
    await client.start()

    # Sessions are the unit of conversation. They are stateful by default,
    # which is the equivalent of `ClaudeSDKClient` in the Claude Agent SDK.
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
    )

    reply = await session.send_and_wait("What is 2 + 2?")

    if reply is not None:
        # The final assistant message lives on `reply.data.content`.
        print(reply.data.content)

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
