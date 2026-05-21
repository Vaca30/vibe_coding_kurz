"""
9 — Skills.

Concept
-------
A "skill" is a directory containing a `SKILL.md` file. The frontmatter `name`
and `description` tell the runtime *when* to load the skill; the body is
appended into the system prompt at that point. Use them to encode reusable
domain knowledge — coding standards, brand palettes, regulatory rules, etc.

Skills are discovered from any directory you pass via `skill_directories`.

Run from this folder so the relative path resolves:
    cd 1_single_agent/9_skills
    python 9_agent_with_skills.py
"""

import asyncio
import os

from copilot import CopilotClient
from copilot.session import PermissionHandler


HERE = os.path.dirname(os.path.abspath(__file__))


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        # Anything containing a `<name>/SKILL.md` file inside this directory
        # becomes a discoverable skill.
        skill_directories=[os.path.join(HERE, "skills")],
    )

    reply = await session.send_and_wait(
        "Suggest a colour scheme for a marketing landing page. Give me a "
        "primary, an accent, and a background colour, with hex codes."
    )
    if reply is not None:
        print(reply.data.content)

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
