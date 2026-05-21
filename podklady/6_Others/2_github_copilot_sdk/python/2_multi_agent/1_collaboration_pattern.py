"""
Multi-agent — Collaboration pattern.

Concept
-------
A flat chain of equal peers. Each agent sees the previous agent's output,
either resolves the task (`resolved: true`) or hands off to the next one in
the predefined sequence. No supervisor.

Scenario
--------
Build a tiny REST API design:
    requirements-analyst → architect → developer

Each role gets a fresh `CopilotSession` with a tailored system prompt.

Run:
    python 2_multi_agent/1_collaboration_pattern.py
"""

import asyncio
import json
import re
from dataclasses import dataclass

from copilot import CopilotClient
from copilot.session import PermissionHandler


@dataclass
class Role:
    name: str
    prompt: str


PIPELINE: list[Role] = [
    Role(
        "requirements-analyst",
        "You are a requirements analyst. Translate the user's request into a "
        "short, concrete list of functional requirements. No code.",
    ),
    Role(
        "architect",
        "You are a software architect. Given the requirements, propose a tiny "
        "REST API design: endpoints, request/response shape, data model.",
    ),
    Role(
        "developer",
        "You are a Python developer. Given the architecture, sketch a FastAPI "
        "implementation in <80 lines. Include 1 example request.",
    ),
]


REPLY_FORMAT = """
After your work, append exactly one JSON block on its own line:

```json
{"resolved": true|false, "next_input": "<text for the next agent>"}
```

Set `resolved: true` only if no further refinement is needed.
""".strip()


def parse_decision(text: str) -> tuple[bool, str]:
    m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not m:
        return False, text
    try:
        obj = json.loads(m.group(1))
        return bool(obj.get("resolved")), str(obj.get("next_input", text))
    except json.JSONDecodeError:
        return False, text


async def run_role(client: CopilotClient, role: Role, prior_output: str) -> tuple[bool, str]:
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={"mode": "replace", "content": f"{role.prompt}\n\n{REPLY_FORMAT}"},
    )
    try:
        reply = await session.send_and_wait(prior_output, timeout=300.0)
        text = reply.data.content if reply else ""
        resolved, next_input = parse_decision(text)
        print(f"\n=== {role.name} ===")
        print(text)
        return resolved, next_input
    finally:
        await session.disconnect()


async def main() -> None:
    initial = (
        "Design a small REST API for a personal todo list with create/list/"
        "update/delete operations. Keep it minimal."
    )

    client = CopilotClient()
    await client.start()
    try:
        current_input = initial
        for role in PIPELINE:
            resolved, current_input = await run_role(client, role, current_input)
            if resolved:
                print(f"\n[stopping early — {role.name} marked resolved]")
                break
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
