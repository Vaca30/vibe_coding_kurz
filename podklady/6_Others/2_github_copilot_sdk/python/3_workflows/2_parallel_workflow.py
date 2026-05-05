"""
Workflow — Parallel (fan-out / fan-in).

Concept
-------
Four specialists examine the same brief independently and concurrently. A
synthesis step then merges their reports into a single coherent output.

Run:
    python 3_workflows/2_parallel_workflow.py
"""

import asyncio

from copilot import CopilotClient
from copilot.session import PermissionHandler


SPECIALISTS = {
    "technical": "You are a technical lead. Focus on architecture, scaling, and engineering risk.",
    "business":  "You are a business analyst. Focus on ROI, cost, and time-to-market.",
    "security":  "You are a security architect. Focus on threats, attack surface, and compliance.",
    "ux":        "You are a UX designer. Focus on user impact, accessibility, and DX.",
}


async def run_specialist(client: CopilotClient, name: str, prompt: str, brief: str) -> tuple[str, str]:
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={"mode": "replace", "content": prompt},
    )
    try:
        reply = await session.send_and_wait(brief, timeout=300.0)
        return name, (reply.data.content if reply else "")
    finally:
        await session.disconnect()


async def main() -> None:
    brief = (
        "Our team is considering adopting AI-assisted code generation across the "
        "engineering org. Give me your perspective in 5–7 bullets."
    )

    client = CopilotClient()
    await client.start()
    try:
        # Fan out — all four specialists run concurrently.
        results = await asyncio.gather(
            *[run_specialist(client, n, p, brief) for n, p in SPECIALISTS.items()]
        )

        for name, content in results:
            print(f"\n=== {name} ===\n{content}")

        # Fan in — synthesis stage.
        joined = "\n\n".join(f"### {n}\n{c}" for n, c in results)
        synth = await client.create_session(
            on_permission_request=PermissionHandler.approve_all,
            system_message={
                "mode": "replace",
                "content": (
                    "You are a chief of staff. Merge multiple specialist reports into "
                    "one balanced executive summary (≤200 words)."
                ),
            },
        )
        try:
            print("\n=== synthesis ===")
            reply = await synth.send_and_wait(joined, timeout=300.0)
            print(reply.data.content if reply else "(no reply)")
        finally:
            await synth.disconnect()
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
