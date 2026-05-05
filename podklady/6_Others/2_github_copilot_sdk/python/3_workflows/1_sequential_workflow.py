"""
Workflow — Sequential.

Concept
-------
Linear pipeline: research → analyse → summarise. Each stage's output is fed
into the next stage's prompt. No branching, no parallelism.

Run:
    python 3_workflows/1_sequential_workflow.py
"""

import asyncio

from copilot import CopilotClient
from copilot.session import PermissionHandler


async def run_stage(client: CopilotClient, role_prompt: str, user_prompt: str) -> str:
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={"mode": "replace", "content": role_prompt},
    )
    try:
        reply = await session.send_and_wait(user_prompt, timeout=300.0)
        return reply.data.content if reply else ""
    finally:
        await session.disconnect()


async def main() -> None:
    client = CopilotClient()
    await client.start()
    try:
        topic = "the practical benefits of asyncio for I/O-bound Python services"

        print("=== stage 1: research ===")
        findings = await run_stage(
            client,
            "You are a research analyst. Produce a dense bullet list of relevant facts.",
            f"Research: {topic}",
        )
        print(findings)

        print("\n=== stage 2: analysis ===")
        analysis = await run_stage(
            client,
            "You are a technical analyst. Identify trade-offs, risks, and key insights.",
            f"Analyse these findings:\n\n{findings}",
        )
        print(analysis)

        print("\n=== stage 3: summary ===")
        summary = await run_stage(
            client,
            "You are an executive writer. Produce a 5-line summary aimed at engineering managers.",
            f"Summarise this analysis:\n\n{analysis}",
        )
        print(summary)
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
