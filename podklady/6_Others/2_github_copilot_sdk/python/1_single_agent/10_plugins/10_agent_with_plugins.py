"""
10 — Plugins.

Concept
-------
Copilot SDK doesn't ship a first-class "plugin" mechanism, but you can build
one trivially out of the primitives it *does* expose: skills + custom agents.
This file defines a tiny convention:

    plugin/
      plugin.json          # manifest: name, version, skills_dir, agents
      skills/<n>/SKILL.md  # discoverable skills
      ...

The `load_plugin()` helper below reads a manifest, returns the skill directory
and a list of custom-agent definitions, and we wire those into a session.

Run from the plugin folder:
    cd 1_single_agent/10_plugins
    python 10_agent_with_plugins.py
"""

import asyncio
import json
import os

from copilot import CopilotClient
from copilot.session import PermissionHandler


HERE = os.path.dirname(os.path.abspath(__file__))


def load_plugin(plugin_dir: str) -> tuple[str | None, list[dict]]:
    """Read a `plugin.json` and return (skill_dir, [custom_agent_dict, ...])."""
    with open(os.path.join(plugin_dir, "plugin.json")) as f:
        manifest = json.load(f)
    skills_dir = (
        os.path.join(plugin_dir, manifest["skills_dir"])
        if "skills_dir" in manifest
        else None
    )
    return skills_dir, manifest.get("agents", [])


async def main() -> None:
    client = CopilotClient()
    await client.start()

    skills_dir, agents = load_plugin(os.path.join(HERE, "demo-plugin"))

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        skill_directories=[skills_dir] if skills_dir else [],
        custom_agents=agents,
    )

    print("> Asking for an HTML page (the 'geocities-html' skill should kick in):")
    reply = await session.send_and_wait(
        "Generate an HTML page advertising a fictional 'Cyber Cat Café'."
    )
    print(reply.data.content if reply else "(no reply)")

    print("\n> Asking a generic question (the haiku-footer agent may take over):")
    reply = await session.send_and_wait(
        "Use the haiku-footer agent to answer: what is functional programming?"
    )
    print(reply.data.content if reply else "(no reply)")

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
