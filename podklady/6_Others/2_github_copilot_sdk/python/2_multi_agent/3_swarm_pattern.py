"""
Multi-agent — Swarm pattern.

Concept
-------
Equal peers connected by an explicit handoff graph. Each agent decides on
every turn whether to finish or hand off to one of *its* allowed peers. The
shared history grows as agents contribute.

  requirements-analyst → [architect]
  architect            → [developer, requirements-analyst]
  developer            → [architect]

Run:
    python 2_multi_agent/3_swarm_pattern.py
"""

import asyncio
import json
import re
from dataclasses import dataclass, field

from copilot import CopilotClient
from copilot.session import PermissionHandler


@dataclass
class SwarmAgent:
    name: str
    description: str
    prompt: str
    handoffs_to: list[str] = field(default_factory=list)


SWARM: dict[str, SwarmAgent] = {
    "requirements-analyst": SwarmAgent(
        name="requirements-analyst",
        description="Defines functional requirements.",
        prompt="You are a requirements analyst. Produce concrete requirements.",
        handoffs_to=["architect"],
    ),
    "architect": SwarmAgent(
        name="architect",
        description="Proposes API designs.",
        prompt="You are a software architect. Propose a small REST API design.",
        handoffs_to=["developer", "requirements-analyst"],
    ),
    "developer": SwarmAgent(
        name="developer",
        description="Implements designs in FastAPI.",
        prompt="You are a Python developer. Sketch a FastAPI implementation.",
        handoffs_to=["architect"],
    ),
}


REPLY_FORMAT = (
    "Reply with normal prose AND a JSON block on its own line:\n"
    "```json\n"
    '{"action": "handoff"|"finish", "handoff_to": "<name>", "content": "<your work>"}'
    "\n```\n"
    "Pick `handoff_to` only from your allowed peers."
)


def parse(text: str) -> dict:
    m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if not m:
        return {"action": "finish", "content": text}
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return {"action": "finish", "content": text}


def format_history(history: list[dict]) -> str:
    if not history:
        return "(no prior contributions)"
    return "\n\n".join(f"### {h['agent']}\n{h['content']}" for h in history)


async def run_agent(client: CopilotClient, agent: SwarmAgent, history: list[dict], task: str) -> dict:
    peers = ", ".join(agent.handoffs_to) or "(none)"
    system = (
        f"{agent.prompt}\n\n"
        f"You can hand off to: {peers}.\n\n"
        f"{REPLY_FORMAT}"
    )
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={"mode": "replace", "content": system},
    )
    try:
        prompt = (
            f"Original task: {task}\n\n"
            f"Prior contributions:\n{format_history(history)}\n\n"
            "Do your part now."
        )
        reply = await session.send_and_wait(prompt, timeout=300.0)
        decision = parse(reply.data.content if reply else "")
        decision.setdefault("agent", agent.name)
        return decision
    finally:
        await session.disconnect()


async def main() -> None:
    task = (
        "Design and sketch a small REST API for a personal todo list with "
        "create/list/update/delete operations. Iterate as needed."
    )

    client = CopilotClient()
    await client.start()
    try:
        current_name = "requirements-analyst"
        history: list[dict] = []
        max_steps = 6

        for step in range(1, max_steps + 1):
            agent = SWARM[current_name]
            print(f"\n=== step {step}: {agent.name} ===")
            decision = await run_agent(client, agent, history, task)
            print(decision.get("content", ""))
            history.append({"agent": agent.name, "content": decision.get("content", "")})

            if decision.get("action") == "finish":
                print("\n[swarm: agent declared task finished]")
                break

            target = decision.get("handoff_to")
            if target not in agent.handoffs_to:
                print(f"[swarm: invalid handoff {target!r} from {agent.name}; stopping]")
                break
            current_name = target
        else:
            print(f"\n[swarm: hit max_steps={max_steps}, stopping]")
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
