#!/usr/bin/env python3
"""
Single Agent Example (8): Agent with Skills

Demonstrates using skills to constrain and guide agent behavior.

Skills are markdown files in .claude/skills/<name>/SKILL.md that provide
domain-specific knowledge. They are:
- Loaded via setting_sources=["project"]
- Enabled by including "Skill" in allowed_tools
- Automatically invoked by Claude when relevant to the context

The prompts make NO mention of skills at all. The agent sees the skill
descriptions via setting_sources and autonomously decides to invoke the
color-palette skill because its description says it MUST be used
whenever a color value is needed.

Skill in this demo:
  - color-palette: 10 brand colors with hex values, RGB, and usage rules

Output files are saved to the output/ directory:
  - color_palette.md  — Markdown reference of used colors
  - color_palette.html — HTML page visualizing the colors
"""

import re
import anyio
from pathlib import Path
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)


# Run from the directory containing .claude/skills/
SKILLS_DIR = Path(__file__).parent
OUTPUT_DIR = SKILLS_DIR / "output"

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
    """Print a colored log line to make skill activity visible."""
    colors = {
        "SKILL": YELLOW,
        "TOOL": GREEN,
        "PROMPT": CYAN,
        "DETECT": GREEN,
        "COST": RED,
        "FILE": MAGENTA,
    }
    color = colors.get(category, RESET)
    print(f"  {color}[{category}]{RESET} {message}")


async def example_generate_markdown():
    """Example 1: Generate a markdown file documenting the brand colors."""
    print(f"\n{BOLD}{'='*60}")
    print("  Example 1: Generate Color Palette Markdown")
    print(f"{'='*60}{RESET}\n")

    options = ClaudeAgentOptions(
        system_prompt="You are a technical writer. Output raw markdown only, no explanations.",
        model="claude-opus-4-6",
        allowed_tools=["Skill"],
        setting_sources=["project"],
        cwd=str(SKILLS_DIR),
    )

    collected_text: list[str] = []

    async with ClaudeSDKClient(options=options) as client:
        prompt = (
            "Create a markdown document that lists all our brand colors. "
            "For each color include: name, hex value, RGB value, and when to use it. "
            "Format it as a nice reference table."
        )
        log_event("PROMPT", prompt)
        print()

        await client.query(prompt)

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, ToolUseBlock):
                        if "skill" in block.name.lower():
                            log_event("SKILL", f">>> SKILL INVOKED: {block.name}")
                            log_event("SKILL", f"    Input: {str(block.input)[:120]}...")
                        else:
                            log_event("TOOL", f"Tool call: {block.name}")
                    elif isinstance(block, TextBlock):
                        text = block.text
                        for color_hex in ["#1B1F3B", "#2E86AB", "#E8505B", "#F4A261", "#2EC4B6"]:
                            if color_hex in text:
                                log_event("DETECT", f"Found palette color {color_hex} in output!")
                                break
                        print(f"\n{text}\n")
                        collected_text.append(text)
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    log_event("COST", f"${message.total_cost_usd:.4f}")

    output_file = OUTPUT_DIR / "color_palette.md"
    output_file.write_text("\n".join(collected_text), encoding="utf-8")
    log_event("FILE", f"Saved to {output_file}")


async def example_generate_html():
    """Example 2: Generate an HTML page visualizing the brand colors."""
    print(f"\n{BOLD}{'='*60}")
    print("  Example 2: Generate Color Palette HTML Page")
    print(f"{'='*60}{RESET}\n")

    options = ClaudeAgentOptions(
        system_prompt="You are a frontend developer. Output raw HTML only, no explanations.",
        model="claude-opus-4-6",
        allowed_tools=["Skill"],
        setting_sources=["project"],
        cwd=str(SKILLS_DIR),
    )

    collected_text: list[str] = []

    async with ClaudeSDKClient(options=options) as client:
        prompt = (
            "Create a single self-contained HTML page that displays all our brand colors. "
            "Show each color as a large swatch with its name, hex code, and RGB value. "
            "Use a clean grid layout with inline CSS."
        )
        log_event("PROMPT", prompt)
        print()

        await client.query(prompt)

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, ToolUseBlock):
                        if "skill" in block.name.lower():
                            log_event("SKILL", f">>> SKILL INVOKED: {block.name}")
                            log_event("SKILL", f"    Input: {str(block.input)[:120]}...")
                        else:
                            log_event("TOOL", f"Tool call: {block.name}")
                    elif isinstance(block, TextBlock):
                        text = block.text
                        for color_hex in ["#1B1F3B", "#2E86AB", "#E8505B", "#F4A261", "#2EC4B6"]:
                            if color_hex in text:
                                log_event("DETECT", f"Found palette color {color_hex} in output!")
                                break
                        print(f"\n{text}\n")
                        collected_text.append(text)
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    log_event("COST", f"${message.total_cost_usd:.4f}")

    # Extract HTML from potential markdown code fences
    raw = "\n".join(collected_text)
    match = re.search(r"```html?\s*\n(.*?)```", raw, re.DOTALL)
    html = match.group(1).strip() if match else raw

    output_file = OUTPUT_DIR / "color_palette.html"
    output_file.write_text(html, encoding="utf-8")
    log_event("FILE", f"Saved to {output_file}")


async def main():
    """Run all skill examples."""
    OUTPUT_DIR.mkdir(exist_ok=True)

    print(f"\n{BOLD}Skills Demo: color-palette{RESET}")
    print(f"  SKILL: color-palette (brand colors with hex, RGB, and usage rules)")
    print(f"  Skills dir: {SKILLS_DIR}")
    print(f"\n  NOTE: Prompts do NOT name any skill.")
    print(f"  The agent discovers and selects them automatically.\n")

    await example_generate_markdown()
    await example_generate_html()

    print(f"\n{BOLD}All examples complete.{RESET}\n")


if __name__ == "__main__":
    anyio.run(main)
