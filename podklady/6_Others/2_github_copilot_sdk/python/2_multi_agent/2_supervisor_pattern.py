"""
Multi-agent — Supervisor pattern.

Concept
-------
A "tech lead" supervisor sits in a control loop. On every turn it inspects
shared history, chooses one specialist to invoke, runs it as a fresh session,
and merges the result back into history. Specialists never talk to each other
directly — everything funnels through the supervisor.

Run:
    python 2_multi_agent/2_supervisor_pattern.py
"""

import asyncio
import json
import re
from dataclasses import dataclass

from copilot import CopilotClient
from copilot.session import PermissionHandler


@dataclass
class Specialist:
    name: str
    prompt: str


SPECIALISTS: dict[str, Specialist] = {
    "requirements-analyst": Specialist(
        "requirements-analyst",
        "You are a requirements analyst. Produce a concrete list of functional requirements.",
    ),
    "architect": Specialist(
        "architect",
        "You are a software architect. Given the brief, propose a small REST API design.",
    ),
    "developer": Specialist(
        "developer",
        "You are a Python developer. Sketch a FastAPI implementation in <80 lines.",
    ),
}


SUPERVISOR_PROMPT = (
    "You are a tech-lead supervisor coordinating three specialists: "
    f"{', '.join(SPECIALISTS)}. "
    "On every turn you must reply with a single JSON block on its own line:\n"
    "```json\n"
    '{"action": "delegate"|"finish", "delegate_to": "<name>", '
    '"task": "<what to ask the specialist>", "answer": "<final answer>"}'
    "\n```\n"
    "Use `delegate` to invoke a specialist; use `finish` only when the task is fully complete."
)


def parse_supervisor(text: str) -> dict:
    m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not m:
        return {"action": "finish", "answer": text}
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return {"action": "finish", "answer": text}


async def run_specialist(client: CopilotClient, name: str, task: str) -> str:
    spec = SPECIALISTS[name]
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={"mode": "replace", "content": spec.prompt},
    )
    try:
        reply = await session.send_and_wait(task, timeout=300.0)
        return reply.data.content if reply else ""
    finally:
        await session.disconnect()


async def main() -> None:
    initial = (
        "Design and sketch a small REST API for a personal todo list with create/list/"
        "update/delete. Coordinate the team."
    )

    client = CopilotClient()
    await client.start()
    try:
        # Supervisor session retains history across iterations.
        supervisor = await client.create_session(
            on_permission_request=PermissionHandler.approve_all,
            system_message={"mode": "replace", "content": SUPERVISOR_PROMPT},
        )

        message = initial
        for step in range(1, 7):
            print(f"\n--- step {step}: supervisor thinking ---")
            reply = await supervisor.send_and_wait(message, timeout=300.0)
            decision = parse_supervisor(reply.data.content if reply else "")
            print(json.dumps(decision, indent=2))

            if decision.get("action") == "finish":
                print("\n=== final answer ===")
                print(decision.get("answer", ""))
                break

            specialist_name = decision.get("delegate_to") or ""
            if specialist_name not in SPECIALISTS:
                print(f"[supervisor picked unknown specialist {specialist_name!r}; stopping]")
                break

            task = decision.get("task") or initial
            print(f"\n--- step {step}: {specialist_name} working ---")
            result = await run_specialist(client, specialist_name, task)
            print(result)

            # Feed the specialist's result back into the supervisor's history.
            message = (
                f"The {specialist_name} returned the following:\n\n{result}\n\n"
                "Decide the next action."
            )

        await supervisor.disconnect()
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
