#!/usr/bin/env python3
"""
Single Agent Example (6): Agent with Filesystem-based Subagents

Demonstrates subagents defined as markdown files in .claude/agents/.
Unlike programmatic AgentDefinition, these are loaded from the filesystem
via setting_sources=["project"]. Each .md file defines:
- YAML frontmatter: name, description, tools, model
- Markdown body: the subagent's system prompt

Subagents in this demo:
  - retro-html-agent: Generates 90s Geocities-style HTML (Comic Sans, marquee, neon colors)
  - minimal-html-agent: Generates ultra-clean Scandinavian-style HTML (system-ui, whitespace, muted)

The prompts never name a specific agent. Claude automatically picks
the right subagent by matching the request to each agent's description.

Output files are saved to the output/ directory:
  - retro_bean_and_brew.html  — 90s Geocities-style page
  - minimal_bean_and_brew.html — Scandinavian minimal page
  - elegant_pixel_pizza.html  — Elegant minimal page
"""

import re
import anyio
from pathlib import Path
from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)


# The directory containing .claude/agents/
PROJECT_DIR = Path(__file__).parent
OUTPUT_DIR = PROJECT_DIR / "output"

# ANSI colors for terminal logging
CYAN = "\033[96m"
YELLOW = "\033[93m"
GREEN = "\033[92m"
MAGENTA = "\033[95m"
RED = "\033[91m"
DIM = "\033[2m"
BOLD = "\033[1m"
RESET = "\033[0m"


def extract_html(text: str) -> str:
    """Extract HTML from potential markdown code fences."""
    match = re.search(r"```html?\s*\n(.*?)```", text, re.DOTALL)
    return match.group(1).strip() if match else text


def log_event(category: str, message: str) -> None:
    """Print a colored log line to make agent activity visible."""
    colors = {
        "AGENT": MAGENTA,
        "TOOL": GREEN,
        "PROMPT": CYAN,
        "OUTPUT": YELLOW,
        "COST": RED,
        "DETECT": GREEN,
        "FILE": DIM,
    }
    color = colors.get(category, RESET)
    print(f"  {color}[{category}]{RESET} {message}")


async def example_retro_html():
    """Example 1: Triggers retro-html-agent via keywords 'vintage 90s style'."""
    print(f"\n{BOLD}{'='*60}")
    print("  Example 1: Retro 90s HTML (auto-delegated)")
    print(f"{'='*60}{RESET}\n")

    options = ClaudeAgentOptions(
        model="claude-opus-4-6",
        allowed_tools=["Read", "Write", "Agent"],
        setting_sources=["project"],
        cwd=str(PROJECT_DIR),
    )

    # "vintage 90s style" matches retro-html-agent's description keywords
    prompt = (
        "Create a vintage 90s style HTML page for a coffee shop called "
        "'Bean & Brew' with a welcome heading, a short tagline, "
        "and a list of 3 menu items with prices."
    )

    log_event("PROMPT", prompt)
    print()

    collected_text: list[str] = []

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, ToolUseBlock):
                    if "agent" in block.name.lower():
                        log_event("AGENT", f">>> AGENT INVOKED: {block.name}")
                        log_event("AGENT", f"    Input: {str(block.input)[:120]}...")
                    else:
                        log_event("TOOL", f"Tool call: {block.name}")
                elif isinstance(block, TextBlock):
                    text = block.text
                    if "Comic Sans" in text or "marquee" in text:
                        log_event("DETECT", "Detected retro GeoCities style in output!")
                    if "system-ui" in text or "#4A90A4" in text:
                        log_event("DETECT", "Detected minimal Scandinavian style in output!")
                    print(f"\n{text}\n")
                    collected_text.append(text)
        elif isinstance(message, ResultMessage):
            if message.total_cost_usd and message.total_cost_usd > 0:
                log_event("COST", f"${message.total_cost_usd:.4f}")

    output_file = OUTPUT_DIR / "retro_bean_and_brew.html"
    output_file.write_text(extract_html("\n".join(collected_text)), encoding="utf-8")
    log_event("FILE", f"Saved to {output_file}")
    print()


async def example_minimal_html():
    """Example 2: Triggers minimal-html-agent via keywords 'clean modern minimal'."""
    print(f"\n{BOLD}{'='*60}")
    print("  Example 2: Minimal Scandinavian HTML (auto-delegated)")
    print(f"{'='*60}{RESET}\n")

    options = ClaudeAgentOptions(
        model="claude-opus-4-6",
        allowed_tools=["Read", "Write", "Agent"],
        setting_sources=["project"],
        cwd=str(PROJECT_DIR),
    )

    # "clean, modern, minimal" matches minimal-html-agent's description keywords
    prompt = (
        "Create a clean, modern, minimal HTML page for a coffee shop called "
        "'Bean & Brew' with a welcome heading, a short tagline, "
        "and a list of 3 menu items with prices."
    )

    log_event("PROMPT", prompt)
    print()

    collected_text: list[str] = []

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, ToolUseBlock):
                    if "agent" in block.name.lower():
                        log_event("AGENT", f">>> AGENT INVOKED: {block.name}")
                        log_event("AGENT", f"    Input: {str(block.input)[:120]}...")
                    else:
                        log_event("TOOL", f"Tool call: {block.name}")
                elif isinstance(block, TextBlock):
                    text = block.text
                    if "Comic Sans" in text or "marquee" in text:
                        log_event("DETECT", "Detected retro GeoCities style in output!")
                    if "system-ui" in text or "#4A90A4" in text:
                        log_event("DETECT", "Detected minimal Scandinavian style in output!")
                    print(f"\n{text}\n")
                    collected_text.append(text)
        elif isinstance(message, ResultMessage):
            if message.total_cost_usd and message.total_cost_usd > 0:
                log_event("COST", f"${message.total_cost_usd:.4f}")

    output_file = OUTPUT_DIR / "minimal_bean_and_brew.html"
    output_file.write_text(extract_html("\n".join(collected_text)), encoding="utf-8")
    log_event("FILE", f"Saved to {output_file}")
    print()


async def example_same_task_different_style():
    """Example 3: Same content, different keyword triggers different agent."""
    print(f"\n{BOLD}{'='*60}")
    print("  Example 3: Same Task, Elegant Style (auto-delegated)")
    print(f"{'='*60}{RESET}\n")

    options = ClaudeAgentOptions(
        model="claude-opus-4-6",
        allowed_tools=["Read", "Write", "Agent"],
        setting_sources=["project"],
        cwd=str(PROJECT_DIR),
    )

    # "elegant" matches minimal-html-agent's description
    prompt = (
        "Create an elegant HTML page for a pizza place called "
        "'Pixel Pizza' with a heading, a tagline, and 3 menu items."
    )

    log_event("PROMPT", prompt)
    print()

    collected_text: list[str] = []

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, ToolUseBlock):
                    if "agent" in block.name.lower():
                        log_event("AGENT", f">>> AGENT INVOKED: {block.name}")
                        log_event("AGENT", f"    Input: {str(block.input)[:120]}...")
                    else:
                        log_event("TOOL", f"Tool call: {block.name}")
                elif isinstance(block, TextBlock):
                    text = block.text
                    if "Comic Sans" in text or "marquee" in text:
                        log_event("DETECT", "Detected retro GeoCities style in output!")
                    if "system-ui" in text or "#4A90A4" in text:
                        log_event("DETECT", "Detected minimal Scandinavian style in output!")
                    print(f"\n{text}\n")
                    collected_text.append(text)
        elif isinstance(message, ResultMessage):
            if message.total_cost_usd and message.total_cost_usd > 0:
                log_event("COST", f"${message.total_cost_usd:.4f}")

    output_file = OUTPUT_DIR / "elegant_pixel_pizza.html"
    output_file.write_text(extract_html("\n".join(collected_text)), encoding="utf-8")
    log_event("FILE", f"Saved to {output_file}")
    print()


async def main():
    """Run all filesystem-based subagent examples."""
    OUTPUT_DIR.mkdir(exist_ok=True)

    print(f"\n{BOLD}Filesystem-based Subagents Demo{RESET}")
    print(f"  AGENT: retro-html-agent (90s GeoCities style)")
    print(f"  AGENT: minimal-html-agent (Scandinavian minimal)")
    print(f"  Project dir: {PROJECT_DIR}")
    print(f"\n  NOTE: Prompts do NOT name any agent.")
    print(f"  Claude picks the right one from description matching.\n")

    await example_retro_html()
    await example_minimal_html()
    await example_same_task_different_style()

    print(f"\n{BOLD}All examples complete.{RESET}\n")


if __name__ == "__main__":
    anyio.run(main)
