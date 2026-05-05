#!/usr/bin/env python3
"""
Single Agent Example (10): Agent with Marketplace Plugins

Demonstrates how to pull plugins from an external marketplace repository
and use them with the Claude Agent SDK.

The marketplace (https://github.com/lukaskellerstein/claude-dummy-marketplace)
is a Git repository that contains a collection of plugins organized as:

    marketplace-repo/
    ├── .claude-plugin/
    │   └── marketplace.json      # Index listing all available plugins
    └── plugins/
        ├── html-dummy-plugin/    # Plugin 1: GeoCities HTML style
        └── markdown-classified-plugin/  # Plugin 2: TOP SECRET memos

This example:
  1. Clones (or updates) the marketplace repo into a local ./marketplace/ dir
  2. Reads marketplace.json to discover all available plugins
  3. Loads ALL plugins into the agent automatically
  4. Lets the agent choose which plugin components to use based on the task

Available plugins from the marketplace:
  - html-dummy-plugin:
      SKILL "geocities-html" — 90s GeoCities HTML style
      AGENT "haiku-footer"   — Appends zen haiku footer to HTML
  - markdown-classified-plugin:
      SKILL "classified-memo"           — TOP SECRET government memo style
      AGENT "classification-downgrader" — Adds declassification certificate
      AGENT "redaction-officer"         — Applies additional redaction blocks

IMPORTANT: The prompts do NOT mention any specific plugin, skill, or agent.
The main agent discovers and selects them automatically based on their
descriptions and the task at hand.

Output:
  Each example saves its output to output/ so you can inspect the results.
"""

import json
import subprocess
import anyio
from pathlib import Path
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ResultMessage,
    ToolUseBlock,
)


# Marketplace configuration
MARKETPLACE_REPO = "https://github.com/lukaskellerstein/claude-dummy-marketplace.git"
MARKETPLACE_DIR = Path(__file__).parent / "marketplace"

# Output directory for generated files
OUTPUT_DIR = Path(__file__).parent / "output"

# ANSI colors for terminal logging
CYAN = "\033[96m"
YELLOW = "\033[93m"
GREEN = "\033[92m"
MAGENTA = "\033[95m"
RED = "\033[91m"
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"


def log_event(category: str, message: str) -> None:
    """Print a colored log line."""
    colors = {
        "MARKET": CYAN,
        "PLUGIN": CYAN,
        "SKILL": YELLOW,
        "AGENT": MAGENTA,
        "TOOL": GREEN,
        "RESULT": DIM,
        "COST": RED,
        "FILE": GREEN,
    }
    color = colors.get(category, RESET)
    print(f"  {color}[{category}]{RESET} {message}")


def sync_marketplace() -> None:
    """Clone or update the marketplace repository."""
    if (MARKETPLACE_DIR / ".git").exists():
        log_event("MARKET", f"Updating marketplace at {MARKETPLACE_DIR}")
        result = subprocess.run(
            ["git", "-C", str(MARKETPLACE_DIR), "pull", "--ff-only"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            log_event("MARKET", f"Updated: {result.stdout.strip()}")
        else:
            log_event(
                "MARKET", f"Pull failed (using existing): {result.stderr.strip()}"
            )
    else:
        log_event("MARKET", f"Cloning marketplace from {MARKETPLACE_REPO}")
        result = subprocess.run(
            ["git", "clone", MARKETPLACE_REPO, str(MARKETPLACE_DIR)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Failed to clone marketplace: {result.stderr}")
        log_event("MARKET", "Clone complete")


def discover_plugins() -> list[dict]:
    """Read marketplace.json and return plugin configs for the SDK."""
    manifest_path = MARKETPLACE_DIR / ".claude-plugin" / "marketplace.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Marketplace manifest not found at {manifest_path}")

    manifest = json.loads(manifest_path.read_text())
    log_event("MARKET", f"Marketplace: {manifest['name']} v{manifest['version']}")
    log_event("MARKET", f"Description: {manifest['description']}")

    plugins = []
    for entry in manifest["plugins"]:
        plugin_path = (MARKETPLACE_DIR / entry["source"]).resolve()
        plugin_json = plugin_path / ".claude-plugin" / "plugin.json"
        if plugin_json.exists():
            meta = json.loads(plugin_json.read_text())
            log_event(
                "PLUGIN",
                f"Found: {meta['name']} v{meta['version']} — {meta['description']}",
            )
            plugins.append({"type": "local", "path": str(plugin_path)})
        else:
            log_event("PLUGIN", f"Skipping {entry['name']}: no plugin.json found")

    log_event("MARKET", f"Loaded {len(plugins)} plugin(s) from marketplace")
    return plugins


async def run_agent(
    description: str,
    system_prompt: str,
    prompt: str,
    plugins: list[dict],
    output_filename: str,
    file_ext: str = ".html",
    max_turns: int = 6,
) -> None:
    """Run an agent with marketplace plugins and save its output."""
    print(f"\n{BOLD}{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}{RESET}\n")

    # Give the agent its own working directory so files it creates land here
    agent_workdir = OUTPUT_DIR / output_filename.replace(".", "_")
    agent_workdir.mkdir(parents=True, exist_ok=True)

    options = ClaudeAgentOptions(
        system_prompt=system_prompt,
        model="claude-opus-4-6",
        max_turns=max_turns,
        plugins=plugins,
        cwd=str(agent_workdir),
    )

    async with ClaudeSDKClient(options=options) as client:
        log_event(
            "PLUGIN", f"Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}"
        )
        await client.query(prompt)

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, ToolUseBlock):
                        tool_name = block.name
                        if "skill" in tool_name.lower():
                            log_event("SKILL", f">>> SKILL INVOKED: {tool_name}")
                        elif "agent" in tool_name.lower():
                            log_event("AGENT", f">>> AGENT INVOKED: {tool_name}")
                        else:
                            log_event("TOOL", f"Tool call: {tool_name}")
                    elif isinstance(block, TextBlock):
                        print(f"\n{block.text}\n")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    log_event("COST", f"${message.total_cost_usd:.4f}")

        # Find files the agent created in its working directory
        created_files = [f for f in agent_workdir.rglob(f"*{file_ext}") if f.is_file()]
        if created_files:
            for f in created_files:
                log_event("FILE", f"Agent created: {f}")
        else:
            log_event("FILE", f"No {file_ext} files found in {agent_workdir}")


async def main():
    """Pull marketplace and run demo agents."""
    print(f"\n{BOLD}Marketplace Plugin Demo{RESET}")
    print(f"  Repo: {MARKETPLACE_REPO}")
    print(f"  Local: {MARKETPLACE_DIR}")
    print(f"  Output: {OUTPUT_DIR}\n")

    # Step 1: Sync the marketplace
    sync_marketplace()

    # Step 2: Discover all plugins
    plugins = discover_plugins()

    if not plugins:
        print(f"\n{RED}No plugins found in marketplace. Exiting.{RESET}")
        return

    print(f"\n{BOLD}All marketplace plugins loaded. Agents will auto-select.{RESET}")
    print(f"  NOTE: Prompts do NOT name any specific plugin, skill, or agent.\n")

    # Example 1: HTML task — should trigger html-dummy-plugin
    # (geocities-html skill, possibly haiku-footer agent)
    await run_agent(
        description="Example 1: HTML page (expects HTML plugin auto-selection)",
        system_prompt="You are a web developer. Generate complete HTML pages.",
        prompt="Create an HTML page about the history of space exploration.",
        plugins=plugins,
        output_filename="example1_html_page",
        file_ext=".html",
    )

    # Example 2: Markdown task — should trigger markdown-classified-plugin
    # (classified-memo skill, possibly redaction-officer and/or classification-downgrader agents)
    await run_agent(
        description="Example 2: Markdown document (expects Classified plugin auto-selection)",
        system_prompt="You are a technical writer. Generate professional markdown documents.",
        prompt="Write a markdown report about the current state of artificial intelligence research.",
        plugins=plugins,
        output_filename="example2_classified_memo",
        file_ext=".md",
        max_turns=8,
    )

    # Example 3: HTML with footer — should trigger geocities + haiku-footer
    await run_agent(
        description="Example 3: HTML page with footer (expects multiple components)",
        system_prompt=(
            "You are a web developer. Generate complete HTML pages "
            "and make sure every page has a proper footer section."
        ),
        prompt="Create an HTML page about deep sea creatures.",
        plugins=plugins,
        output_filename="example3_html_with_footer",
        file_ext=".html",
    )

    # Final summary
    print(f"\n{BOLD}All examples complete.{RESET}")
    if OUTPUT_DIR.exists():
        files = sorted(OUTPUT_DIR.iterdir())
        if files:
            print(f"\n  Saved files (inspect to verify plugin usage):")
            for f in files:
                print(f"    {f}")
    print()


if __name__ == "__main__":
    anyio.run(main)
