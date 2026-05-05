"""
Workflow — Conditional routing.

Concept
-------
A classifier session inspects the request and emits a single category label.
The orchestration code then routes the request to the matching handler
session. Only one handler runs.

Run:
    python 3_workflows/3_conditional_workflow.py
"""

import asyncio
import re

from copilot import CopilotClient
from copilot.session import PermissionHandler


CATEGORIES = {"TECHNICAL", "CREATIVE", "ANALYTICAL", "OTHER"}


CLASSIFIER = (
    "You classify user requests. Reply with exactly one line in this format:\n"
    "    CATEGORY: <one of TECHNICAL, CREATIVE, ANALYTICAL, OTHER>\n"
    "Then optionally a short justification on a second line."
)

HANDLERS = {
    "TECHNICAL":  "You are a senior software engineer. Produce code-first answers with a short rationale.",
    "CREATIVE":   "You are a creative writer. Produce vivid, polished prose.",
    "ANALYTICAL": "You are a data analyst. Produce a concise, evidence-based response.",
    "OTHER":      "You are a helpful generalist. Answer briefly and clearly.",
}


async def classify(client: CopilotClient, request: str) -> str:
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={"mode": "replace", "content": CLASSIFIER},
    )
    try:
        reply = await session.send_and_wait(request, timeout=300.0)
        text = reply.data.content if reply else ""
        m = re.search(r"CATEGORY:\s*(\w+)", text, re.IGNORECASE)
        if m and m.group(1).upper() in CATEGORIES:
            return m.group(1).upper()
        return "OTHER"
    finally:
        await session.disconnect()


async def handle(client: CopilotClient, category: str, request: str) -> str:
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={"mode": "replace", "content": HANDLERS[category]},
    )
    try:
        reply = await session.send_and_wait(request, timeout=300.0)
        return reply.data.content if reply else ""
    finally:
        await session.disconnect()


REQUESTS = [
    "Write me a Python function that returns the nth Fibonacci number.",
    "Tell me a one-paragraph short story about a lighthouse keeper.",
    "What are the top three reasons developer productivity studies fail?",
    "How do I make a really good cup of coffee at home?",
]


async def main() -> None:
    client = CopilotClient()
    await client.start()
    try:
        for r in REQUESTS:
            print(f"\n>>> {r}")
            cat = await classify(client, r)
            print(f"    classified as: {cat}")
            answer = await handle(client, cat, r)
            print(f"\n{answer}")
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
