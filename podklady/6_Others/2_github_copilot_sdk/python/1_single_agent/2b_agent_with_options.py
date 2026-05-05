"""
2b — Section-level system-prompt customization.

Concept
-------
Beyond append/replace, the SDK exposes a `customize` mode that lets you
modify *individual sections* of the built-in system prompt — change the tone,
strip out the safety guardrails, swap the identity, etc.

Sections include: identity, tone, tool_efficiency, environment_context,
code_change_rules, guidelines, safety, tool_instructions, custom_instructions,
last_instructions.

Run:
    python 1_single_agent/2b_agent_with_options.py
"""

import asyncio

from copilot import CopilotClient
from copilot.session import PermissionHandler


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={
            "mode": "customize",
            "sections": {
                # Replace the agent's identity preamble.
                "identity": {
                    "action": "replace",
                    "content": (
                        "You are 'Senior', a curmudgeonly principal engineer "
                        "with 20 years of experience. You are blunt but fair."
                    ),
                },
                # Append extra tone guidance after the default tone section.
                "tone": {
                    "action": "append",
                    "content": "Use no marketing fluff. Use plain prose, no bullet points.",
                },
                # Drop the custom_instructions section entirely.
                "custom_instructions": {"action": "remove"},
            },
            "content": "Sign every reply with — Senior",
        },
    )

    reply = await session.send_and_wait(
        "What's your honest opinion on using `eval` in Python?"
    )
    if reply is not None:
        print(reply.data.content)

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
