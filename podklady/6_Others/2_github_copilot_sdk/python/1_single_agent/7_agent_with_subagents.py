"""
7 — Custom (sub-)agents.

Concept
-------
A "custom agent" is a specialised persona attached to a session: its own
prompt, its own tool allowlist, optionally its own MCP servers. The runtime
selects the best one for a given task based on each agent's `description`,
or you can pin one with the `agent=` parameter.

This is the Copilot SDK equivalent of `AgentDefinition` in the Claude Agent SDK.

Run:
    python 1_single_agent/7_agent_with_subagents.py
"""

import asyncio

from copilot import CopilotClient
from copilot.generated.session_events import (
    AssistantMessageData,
    SubagentSelectedData,
    SubagentStartedData,
)
from copilot.session import PermissionHandler


CUSTOM_AGENTS = [
    {
        "name": "code-reviewer",
        "display_name": "Code Reviewer",
        "description": (
            "Reviews source files for bugs, security issues, and style problems. "
            "Read-only — never modifies files."
        ),
        "tools": ["view", "grep", "glob"],
        "prompt": (
            "You are a senior code reviewer. Read the relevant files, then give a "
            "bullet list of issues in order of severity (critical → minor). Do not "
            "modify anything."
        ),
    },
    {
        "name": "doc-writer",
        "display_name": "Documentation Writer",
        "description": "Writes or updates Markdown documentation.",
        "tools": ["view", "edit", "write", "glob"],
        "prompt": (
            "You are a technical writer. Produce clear, concise Markdown. "
            "Each section has a heading; examples use fenced code blocks."
        ),
    },
    {
        "name": "test-writer",
        "display_name": "Test Writer",
        "description": "Generates pytest test cases for Python source files.",
        "tools": ["view", "edit", "write", "glob"],
        "prompt": (
            "You are a Python testing expert. Produce small, fast pytest tests "
            "that cover happy path and at least one edge case."
        ),
    },
]


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        custom_agents=CUSTOM_AGENTS,
    )

    def on_event(event):
        if isinstance(event.data, SubagentSelectedData):
            print(f"  [router] selected sub-agent: {event.data.agent_display_name}")
        elif isinstance(event.data, SubagentStartedData):
            print(f"  [router] sub-agent started: {event.data.agent_display_name}")
        elif isinstance(event.data, AssistantMessageData):
            print(f"  [assistant] {event.data.content}")

    session.on(on_event)

    print("> Asking for a code review (should pick code-reviewer):")
    await session.send_and_wait(
        "Review the file 1_single_agent/4b_agent_with_custom_tools.py and "
        "list any issues you find.",
        timeout=300.0,
    )

    print("\n> Asking for tests (should pick test-writer):")
    await session.send_and_wait(
        "Write a couple of pytest tests for the `add` tool defined in "
        "1_single_agent/4b_agent_with_custom_tools.py.",
        timeout=300.0,
    )

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
