"""
1a — Pick a model.

Concept
-------
List the models the Copilot CLI exposes, then create a session pinned to a
specific one. Sessions can also switch models mid-conversation via
`session.set_model(...)`.

Run:
    python 1_single_agent/1a_model.py
"""

import asyncio

from copilot import CopilotClient
from copilot.session import PermissionHandler


async def main() -> None:
    client = CopilotClient()
    await client.start()

    # Discover what's available at runtime (depends on your subscription).
    models = await client.list_models()
    print("Available models:")
    for m in models:
        print(f"  - {m.id}  ({m.name})")
    print()

    # Pick one — adjust if the id below isn't in your account.
    chosen = "gpt-4.1" if any(m.id == "gpt-4.1" for m in models) else models[0].id
    print(f"Using model: {chosen}\n")

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        model=chosen,
    )

    # First turn.
    reply = await session.send_and_wait("What is 2 + 2?")
    print(f"Q1: {reply.data.content}\n" if reply else "(no reply)")

    # Second turn — sessions retain history, so "that result" works.
    reply = await session.send_and_wait("Double that result.")
    print(f"Q2: {reply.data.content}\n" if reply else "(no reply)")

    # Models can be switched without losing conversation history.
    if any(m.id == "gpt-5" for m in models):
        await session.set_model("gpt-5")
        reply = await session.send_and_wait("And one more time, double again.")
        print(f"Q3: {reply.data.content}\n" if reply else "(no reply)")

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
