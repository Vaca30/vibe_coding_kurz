#!/usr/bin/env python3
"""
Single Agent Example (a): Simplest Agent Possible

Demonstrates the most basic usage of the Claude SDK - just a simple query.
"""

import anyio
from claude_agent_sdk import query, AssistantMessage, TextBlock, ResultMessage


async def main():
    """Simplest possible agent - just query."""
    print("=== Simplest Agent Example ===\n")
    print("Asking Claude: What is 2 + 2?\n")

    async for message in query(prompt="What is 2 + 2?"):

        print("-----")
        print(message)
        print("-----\n")

        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Claude: {block.text}")
        elif isinstance(message, ResultMessage):
            if message.total_cost_usd and message.total_cost_usd > 0:
                print(f"\nCost: ${message.total_cost_usd:.4f}")
            print(f"Duration: {message.duration_ms}ms")


if __name__ == "__main__":
    anyio.run(main)
