"""
0b — Same as 0a, but with streaming output.

Concept
-------
Subscribe to `assistant.message_delta` events to print the model's reply
token-by-token as it arrives.

Run:
    python 1_single_agent/0b_simplest_agent.py
"""

import asyncio

from copilot import CopilotClient
from copilot.generated.session_events import AssistantMessageDeltaData
from copilot.session import PermissionHandler


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        streaming=True,  # opts into the *_delta events below
    )

    def on_event(event):
        # `assistant.message_delta` events carry incremental text chunks.
        if isinstance(event.data, AssistantMessageDeltaData):
            print(event.data.delta_content, end="", flush=True)

    session.on(on_event)

    await session.send_and_wait("Write a short haiku about coding.")
    print()  # newline after the streamed reply

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
