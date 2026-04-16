#!/usr/bin/env python3
"""
Single Agent Example (9): Agent with Plugins

Demonstrates how to load and use plugins with the Claude Agent SDK.

Plugins are self-contained extensions that bundle skills, agents, hooks,
and MCP servers into a single distributable package. They live in a directory
with this structure:

    my-plugin/
    ├── .claude-plugin/
    │   └── plugin.json          # Required manifest (name, version, etc.)
    ├── skills/                  # Skills (model-invoked capabilities)
    │   └── <skill-name>/
    │       └── SKILL.md
    ├── agents/                  # Specialized subagents
    │   └── <agent-name>.md
    ├── hooks/                   # Event handlers (optional)
    │   └── hooks.json
    └── .mcp.json                # MCP server definitions (optional)

Key differences from raw skills (example 8):
  - Skills in example 8 live in .claude/skills/ and are loaded via
    setting_sources=["project"]. They are project-level settings.
  - Plugins are loaded explicitly via the `plugins` option and are
    self-contained, portable packages. They namespace all components
    (e.g., /demo-plugin:geocities-html).

Plugin in this demo ("demo-plugin"):
  - SKILL "geocities-html": Forces ALL HTML output into 1990s GeoCities
    style — Comic Sans, neon colors on black, <marquee>, <table> layout,
    visitor counters, "under construction" banners. Unmistakable.
  - AGENT "haiku-footer": Appends a minimalist zen haiku footer (Georgia
    serif, muted grays, whitespace) that intentionally CLASHES with the
    90s style. Includes "— composed by haiku-footer agent" signature.

IMPORTANT: The prompts in these examples do NOT name any specific skill
or agent. The main agent discovers and selects them automatically based
on their descriptions and the task at hand. This demonstrates Claude's
ability to autonomously choose the right plugin components.

How to verify they were used:
  - SKILL used? → Look for Comic Sans, <marquee>, neon #00FF00, "UNDER
    CONSTRUCTION", visitor counter, WebRing links
  - AGENT used? → Look for "A Moment of Zen", a 5-7-5 haiku, and
    "— composed by haiku-footer agent 🍃" at the bottom

Output:
  Each example saves its HTML to output/ so you can open them in a browser.
"""

import re
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


# Path to the demo plugin directory
PLUGIN_DIR = Path(__file__).parent / "demo-plugin"

# Output directory for generated HTML files
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
    """Print a colored log line to make plugin activity visible."""
    colors = {
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


def extract_html(text: str) -> str | None:
    """Extract HTML from a text block (may be inside a markdown code fence)."""
    # Try to find HTML inside ```html ... ``` fences
    match = re.search(r"```html?\s*\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    # Try to find raw HTML (starts with <!DOCTYPE or <html)
    match = re.search(r"(<!DOCTYPE.*</html>)", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    match = re.search(r"(<html.*</html>)", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def save_html(filename: str, html: str) -> Path:
    """Save HTML content to the output directory."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    filepath = OUTPUT_DIR / filename
    filepath.write_text(html, encoding="utf-8")
    log_event("FILE", f"Saved HTML to {filepath}")
    return filepath


async def example_skill_only():
    """Example 1: Prompt triggers the geocities-html skill automatically."""
    print(f"\n{BOLD}{'='*60}")
    print("  Example 1: Expecting SKILL auto-selection")
    print(f"{'='*60}{RESET}\n")

    log_event("PLUGIN", f"Loading demo-plugin from {PLUGIN_DIR}")

    # Generic system prompt — no mention of any skill or agent name
    options = ClaudeAgentOptions(
        system_prompt="You are an HTML developer. Generate complete HTML pages.",
        model="claude-opus-4-6",
        max_turns=3,
        plugins=[{"type": "local", "path": str(PLUGIN_DIR)}],
    )

    async with ClaudeSDKClient(options=options) as client:
        # The prompt asks for HTML — the geocities-html skill's description
        # says it MUST be used for any HTML output. Claude should pick it up.
        prompt = "Create an HTML page about my cat named Whiskers."
        log_event("PLUGIN", f"Sending prompt: {prompt}")

        await client.query(prompt)

        collected_text: list[str] = []

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, ToolUseBlock):
                        tool_name = block.name
                        input_str = str(block.input).lower()
                        if "skill" in tool_name.lower() or "geocities" in input_str:
                            log_event("SKILL", f">>> SKILL INVOKED: {tool_name}")
                            log_event(
                                "SKILL", f"    Input: {str(block.input)[:120]}..."
                            )
                        elif "agent" in tool_name.lower() or "haiku" in input_str:
                            log_event("AGENT", f">>> AGENT INVOKED: {tool_name}")
                            log_event(
                                "AGENT", f"    Input: {str(block.input)[:120]}..."
                            )
                        else:
                            log_event("TOOL", f"Tool call: {tool_name}")
                    elif isinstance(block, TextBlock):
                        text = block.text
                        collected_text.append(text)
                        if "Comic Sans" in text or "marquee" in text:
                            log_event("SKILL", "Detected GeoCities style in output!")
                        if "haiku-footer" in text or "Moment of Zen" in text:
                            log_event("AGENT", "Detected haiku footer in output!")
                        print(f"\n{text}\n")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    log_event("COST", f"${message.total_cost_usd:.4f}")

        # Save the HTML output
        full_text = "\n".join(collected_text)
        html = extract_html(full_text)
        if html:
            save_html("example1_skill_only.html", html)
        else:
            log_event("FILE", "No HTML block found in output to save")


async def example_agent_only():
    """Example 2: Prompt triggers the haiku-footer agent automatically."""
    print(f"\n{BOLD}{'='*60}")
    print("  Example 2: Expecting AGENT auto-selection")
    print(f"{'='*60}{RESET}\n")

    log_event("PLUGIN", f"Loading demo-plugin from {PLUGIN_DIR}")

    # Generic system prompt — no mention of any agent name
    options = ClaudeAgentOptions(
        system_prompt="You are an HTML editor. Help the user modify HTML content.",
        model="claude-opus-4-6",
        max_turns=5,
        plugins=[{"type": "local", "path": str(PLUGIN_DIR)}],
    )

    sample_html = (
        "<html><head><title>My Page</title></head>"
        "<body><h1>Hello World</h1>"
        "<p>This is a simple page about clouds.</p>"
        "</body></html>"
    )

    async with ClaudeSDKClient(options=options) as client:
        # The prompt asks for a footer — the haiku-footer agent's description
        # says it should be used when HTML needs a footer. Claude should pick it.
        prompt = f"Add a poetic footer to this HTML page:\n\n{sample_html}"
        log_event("PLUGIN", "Sending prompt to add a footer to HTML")

        await client.query(prompt)

        collected_text: list[str] = []

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, ToolUseBlock):
                        tool_name = block.name
                        input_str = str(block.input).lower()
                        if "agent" in tool_name.lower() or "haiku" in input_str:
                            log_event("AGENT", f">>> AGENT INVOKED: {tool_name}")
                            log_event(
                                "AGENT", f"    Input: {str(block.input)[:120]}..."
                            )
                        elif "skill" in tool_name.lower() or "geocities" in input_str:
                            log_event("SKILL", f">>> SKILL INVOKED: {tool_name}")
                            log_event(
                                "SKILL", f"    Input: {str(block.input)[:120]}..."
                            )
                        else:
                            log_event("TOOL", f"Tool call: {tool_name}")
                    elif isinstance(block, TextBlock):
                        text = block.text
                        collected_text.append(text)
                        if "haiku-footer" in text or "Moment of Zen" in text:
                            log_event("AGENT", "Detected haiku footer in output!")
                        if "Comic Sans" in text or "marquee" in text:
                            log_event("SKILL", "Detected GeoCities style in output!")
                        print(f"\n{text}\n")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    log_event("COST", f"${message.total_cost_usd:.4f}")

        # Save the HTML output
        full_text = "\n".join(collected_text)
        html = extract_html(full_text)
        if html:
            save_html("example2_agent_only.html", html)
        else:
            log_event("FILE", "No HTML block found in output to save")


async def example_both_combined():
    """Example 3: Prompt should trigger BOTH skill and agent automatically."""
    print(f"\n{BOLD}{'='*60}")
    print("  Example 3: Expecting BOTH skill + agent auto-selection")
    print(f"{'='*60}{RESET}\n")

    log_event("PLUGIN", f"Loading demo-plugin from {PLUGIN_DIR}")

    # Generic system prompt — no mention of any skill or agent name
    options = ClaudeAgentOptions(
        system_prompt=(
            "You are an HTML developer. Generate complete HTML pages "
            "and make sure they have a proper footer."
        ),
        model="claude-opus-4-6",
        max_turns=6,
        plugins=[{"type": "local", "path": str(PLUGIN_DIR)}],
    )

    async with ClaudeSDKClient(options=options) as client:
        # Asks for HTML (should trigger geocities skill) AND a footer
        # (should trigger haiku-footer agent). Neither is named explicitly.
        prompt = "Create an HTML page about the solar system."
        log_event("PLUGIN", f"Sending prompt: {prompt}")

        await client.query(prompt)

        skill_used = False
        agent_used = False
        collected_text: list[str] = []

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, ToolUseBlock):
                        tool_name = block.name
                        input_str = str(block.input).lower()
                        if "skill" in tool_name.lower() or "geocities" in input_str:
                            skill_used = True
                            log_event("SKILL", f">>> SKILL INVOKED: {tool_name}")
                            log_event(
                                "SKILL", f"    Input: {str(block.input)[:120]}..."
                            )
                        elif "agent" in tool_name.lower() or "haiku" in input_str:
                            agent_used = True
                            log_event("AGENT", f">>> AGENT INVOKED: {tool_name}")
                            log_event(
                                "AGENT", f"    Input: {str(block.input)[:120]}..."
                            )
                        else:
                            log_event("TOOL", f"Tool call: {tool_name}")
                    elif isinstance(block, TextBlock):
                        text = block.text
                        collected_text.append(text)
                        if "Comic Sans" in text or "marquee" in text:
                            skill_used = True
                            log_event("SKILL", "Detected GeoCities style in output!")
                        if "haiku-footer" in text or "Moment of Zen" in text:
                            agent_used = True
                            log_event("AGENT", "Detected haiku footer in output!")
                        print(f"\n{text}\n")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    log_event("COST", f"${message.total_cost_usd:.4f}")

        # Save the HTML output
        full_text = "\n".join(collected_text)
        html = extract_html(full_text)
        if html:
            save_html("example3_both_combined.html", html)
        else:
            log_event("FILE", "No HTML block found in output to save")

        # Summary
        print(f"\n{BOLD}--- Plugin Usage Summary ---{RESET}")
        skill_status = f"{GREEN}YES{RESET}" if skill_used else f"{RED}NO{RESET}"
        agent_status = f"{GREEN}YES{RESET}" if agent_used else f"{RED}NO{RESET}"
        print(f"  GeoCities skill used: {skill_status}")
        print(f"  Haiku footer agent used: {agent_status}")


async def main():
    """Run all plugin examples."""
    print(f"\n{BOLD}Plugin Demo: demo-plugin{RESET}")
    print(f"  SKILL: geocities-html (90s GeoCities style)")
    print(f"  AGENT: haiku-footer (minimalist zen haiku)")
    print(f"  Plugin path: {PLUGIN_DIR}")
    print(f"  Output dir:  {OUTPUT_DIR}")
    print(f"\n  NOTE: Prompts do NOT name any skill or agent.")
    print(f"  The main agent discovers and selects them automatically.\n")

    await example_skill_only()
    await example_agent_only()
    await example_both_combined()

    # Final summary of saved files
    print(f"\n{BOLD}All examples complete.{RESET}")
    if OUTPUT_DIR.exists():
        html_files = sorted(OUTPUT_DIR.glob("*.html"))
        if html_files:
            print(f"\n  Saved HTML files (open in browser to inspect):")
            for f in html_files:
                print(f"    {f}")
    print()


if __name__ == "__main__":
    anyio.run(main)
