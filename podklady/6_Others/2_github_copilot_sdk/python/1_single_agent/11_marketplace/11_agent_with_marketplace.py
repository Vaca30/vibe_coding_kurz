"""
11 — Marketplace.

Concept
-------
There is no "marketplace" concept in the Copilot SDK either, but you can
trivially build one on top of plugins (10): publish a `marketplace.json` to a
Git repo, clone it, iterate over the listed plugins, and load each one.

This example uses a local marketplace.json that points at the plugin we
defined in `../10_plugins/demo-plugin`. In a real project, the marketplace
would live in its own repository, e.g. `gh:my-org/copilot-plugins`.

Run from this folder:
    cd 1_single_agent/11_marketplace
    python 11_agent_with_marketplace.py
"""

import asyncio
import json
import os

from copilot import CopilotClient
from copilot.session import PermissionHandler


HERE = os.path.dirname(os.path.abspath(__file__))


def load_marketplace(marketplace_path: str) -> list[dict]:
    """Return the list of plugin manifests referenced by a marketplace.json."""
    with open(marketplace_path) as f:
        market = json.load(f)
    base = os.path.dirname(marketplace_path)
    plugins = []
    for entry in market.get("plugins", []):
        plugin_dir = os.path.normpath(os.path.join(base, entry["source"]))
        with open(os.path.join(plugin_dir, "plugin.json")) as f:
            plugins.append({"dir": plugin_dir, "manifest": json.load(f)})
    return plugins


async def main() -> None:
    client = CopilotClient()
    await client.start()

    plugins = load_marketplace(os.path.join(HERE, "marketplace.json"))
    print(f"Marketplace contains {len(plugins)} plugin(s):")
    for p in plugins:
        print(f"  - {p['manifest']['name']} v{p['manifest']['version']}")

    # Aggregate every plugin's skills + agents into a single session.
    skill_dirs = []
    custom_agents = []
    for p in plugins:
        m, d = p["manifest"], p["dir"]
        if "skills_dir" in m:
            skill_dirs.append(os.path.join(d, m["skills_dir"]))
        custom_agents.extend(m.get("agents", []))

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        skill_directories=skill_dirs,
        custom_agents=custom_agents,
    )

    reply = await session.send_and_wait(
        "Generate an HTML landing page for a tiny indie band called 'Static & Echo'. "
        "End with the haiku-footer agent's signature."
    )
    print("\n" + (reply.data.content if reply else "(no reply)"))

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
