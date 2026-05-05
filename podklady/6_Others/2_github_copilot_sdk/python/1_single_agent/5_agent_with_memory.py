"""
5 — Session memory (and how to persist it across runs).

Concept
-------
A `CopilotSession` retains conversation history within its lifetime. Even better,
the SDK persists every session to disk: you can list past sessions and resume
any of them later — even in a fresh process — with `client.resume_session(...)`.

This example walks both halves:
  1. Multi-turn within a single session.
  2. Disconnect, then reconnect to the same session_id and prove the model
     still remembers what we said.

Run:
    python 1_single_agent/5_agent_with_memory.py
"""

import asyncio

from copilot import CopilotClient
from copilot.session import PermissionHandler


async def main() -> None:
    client = CopilotClient()
    await client.start()

    # ---- Phase 1: multi-turn within one live session ---------------------
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
    )
    session_id = session.session_id
    print(f"Session id: {session_id}\n")

    reply = await session.send_and_wait("My favourite colour is teal.")
    print(f"A1: {reply.data.content}\n" if reply else "(no reply)")

    reply = await session.send_and_wait("What did I just tell you was my favourite colour?")
    print(f"A2: {reply.data.content}\n" if reply else "(no reply)")

    # Disconnect releases in-memory resources but keeps the on-disk history.
    await session.disconnect()

    # ---- Phase 2: resume the same session in a "later" run ---------------
    print("\nResuming the same session by id...\n")
    resumed = await client.resume_session(
        session_id,
        on_permission_request=PermissionHandler.approve_all,
    )

    reply = await resumed.send_and_wait(
        "Suggest a colour that pairs well with the favourite I told you earlier."
    )
    print(f"A3: {reply.data.content}\n" if reply else "(no reply)")

    await resumed.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
