"""
3 — Structured output (prompt-driven).

Concept
-------
The Copilot SDK doesn't expose a native `output_format=json_schema` knob like
some other agent SDKs do. The idiomatic workaround:

1. Tell the model in the system prompt to reply with JSON only.
2. Validate the reply with pydantic.
3. Retry once if parsing fails.

This is what most production Copilot SDK code does today.

Run:
    python 1_single_agent/3_structured_output.py
"""

import asyncio
import json
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

from copilot import CopilotClient
from copilot.session import PermissionHandler


class TaskAnalysis(BaseModel):
    title: str = Field(description="One-line task title")
    priority: Literal["low", "medium", "high"]
    estimated_hours: float = Field(ge=0, le=200)
    tags: list[str]


SYSTEM = """You are a task-analysis agent.

You MUST reply with ONLY a single JSON object — no prose, no markdown fence.
The object must conform to this schema:

{
  "title": "<one-line title>",
  "priority": "low" | "medium" | "high",
  "estimated_hours": <number>,
  "tags": [<string>, ...]
}
"""


def parse(raw: str) -> TaskAnalysis:
    # Strip a possible ```json ... ``` fence the model added despite instructions.
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]
        text = text.rsplit("```", 1)[0]
    return TaskAnalysis.model_validate(json.loads(text))


async def analyze(client: CopilotClient, request: str) -> TaskAnalysis:
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={"mode": "replace", "content": SYSTEM},
    )
    try:
        reply = await session.send_and_wait(request)
        raw = reply.data.content if reply else ""
        try:
            return parse(raw)
        except (json.JSONDecodeError, ValidationError) as e:
            # One retry — repair pass.
            retry = await session.send_and_wait(
                f"Your last reply could not be parsed: {e}. "
                "Reply again with ONLY a valid JSON object matching the schema."
            )
            return parse(retry.data.content if retry else "")
    finally:
        await session.disconnect()


async def main() -> None:
    client = CopilotClient()
    await client.start()
    try:
        result = await analyze(
            client,
            "We need to migrate our auth service from JWT to OAuth2 over the next sprint.",
        )
        print(result.model_dump_json(indent=2))
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
