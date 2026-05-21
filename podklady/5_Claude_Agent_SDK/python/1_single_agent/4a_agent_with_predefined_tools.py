#!/usr/bin/env python3
"""
Single Agent Example (c): Agent with Predefined Tools

Demonstrates using built-in Claude Code tools like Read, Write, Bash, etc.
with both query() and ClaudeSDKClient.
"""

import anyio
from claude_agent_sdk import (
    query,
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)


# ---------------------------------------------------------------------------
# query() examples
# ---------------------------------------------------------------------------
async def example_read_write_tools():
    """query(): Read and Write tools."""
    print("=== Example 1 (query): Read and Write Tools ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Write"],
        system_prompt="You are a file management assistant.",
    )

    async for message in query(
        prompt="Create a file called /tmp/test_claude.txt with the content 'Hello from Claude SDK!'",
        options=options,
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Claude: {block.text}")
                elif isinstance(block, ToolUseBlock):
                    print(f"Using tool: {block.name}")
                    print(f"  Input: {block.input}")
        elif isinstance(message, ResultMessage):
            if message.total_cost_usd and message.total_cost_usd > 0:
                print(f"\nCost: ${message.total_cost_usd:.4f}")

    print("\n")


async def example_bash_tool():
    """query(): Bash tool."""
    print("=== Example 2 (query): Bash Tool ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Bash"],
        system_prompt="You are a command-line assistant.",
    )

    async for message in query(
        prompt="List the files in the current directory using ls command",
        options=options,
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Claude: {block.text}")
                elif isinstance(block, ToolUseBlock):
                    print(f"Using tool: {block.name}")
                    print(f"  Command: {block.input.get('command', 'N/A')}")
        elif isinstance(message, ResultMessage):
            if message.total_cost_usd and message.total_cost_usd > 0:
                print(f"\nCost: ${message.total_cost_usd:.4f}")

    print("\n")


async def example_search_tools():
    """query(): Glob and Grep search tools."""
    print("=== Example 3 (query): Search Tools (Glob, Grep) ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Glob", "Grep", "Read"],
        system_prompt="You are a code search assistant.",
    )

    async for message in query(
        prompt="Find all Python files in the current directory using glob pattern",
        options=options,
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Claude: {block.text}")
                elif isinstance(block, ToolUseBlock):
                    print(f"Using tool: {block.name}")
                    print(f"  Input: {block.input}")
        elif isinstance(message, ResultMessage):
            if message.total_cost_usd and message.total_cost_usd > 0:
                print(f"\nCost: ${message.total_cost_usd:.4f}")

    print("\n")


async def example_multiple_tools():
    """query(): Multiple tools in one shot."""
    print("=== Example 4 (query): Multiple Tools ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Write", "Bash", "Glob", "Edit"],
        system_prompt="You are a comprehensive development assistant.",
    )

    async for message in query(
        prompt="Count how many Python files are in the current directory",
        options=options,
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"Claude: {block.text}")
                elif isinstance(block, ToolUseBlock):
                    print(f"Using tool: {block.name}")
        elif isinstance(message, ResultMessage):
            if message.total_cost_usd and message.total_cost_usd > 0:
                print(f"\nCost: ${message.total_cost_usd:.4f}")
            print(f"Total turns: {message.num_turns}")

    print("\n")


# ---------------------------------------------------------------------------
# ClaudeSDKClient examples — same tools, same single-turn prompts
# ---------------------------------------------------------------------------
async def example_client_read_write_tools():
    """ClaudeSDKClient: Read and Write tools."""
    print("=== Example 5 (ClaudeSDKClient): Read and Write Tools ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Write"],
        system_prompt="You are a file management assistant.",
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Create a file called /tmp/test_claude_client.txt with the content 'Hello from ClaudeSDKClient!'"
        )

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
                    elif isinstance(block, ToolUseBlock):
                        print(f"Using tool: {block.name}")
                        print(f"  Input: {block.input}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"\nCost: ${message.total_cost_usd:.4f}")

    print("\n")


async def example_client_bash_tool():
    """ClaudeSDKClient: Bash tool."""
    print("=== Example 6 (ClaudeSDKClient): Bash Tool ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Bash"],
        system_prompt="You are a command-line assistant.",
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("List the files in the current directory using ls command")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
                    elif isinstance(block, ToolUseBlock):
                        print(f"Using tool: {block.name}")
                        print(f"  Command: {block.input.get('command', 'N/A')}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"\nCost: ${message.total_cost_usd:.4f}")

    print("\n")


async def example_client_search_tools():
    """ClaudeSDKClient: Glob and Grep search tools."""
    print("=== Example 7 (ClaudeSDKClient): Search Tools (Glob, Grep) ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Glob", "Grep", "Read"],
        system_prompt="You are a code search assistant.",
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("Find all Python files in the current directory using glob pattern")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
                    elif isinstance(block, ToolUseBlock):
                        print(f"Using tool: {block.name}")
                        print(f"  Input: {block.input}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"\nCost: ${message.total_cost_usd:.4f}")

    print("\n")


async def example_client_multiple_tools():
    """ClaudeSDKClient: Multiple tools."""
    print("=== Example 8 (ClaudeSDKClient): Multiple Tools ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Write", "Bash", "Glob", "Edit"],
        system_prompt="You are a comprehensive development assistant.",
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("Count how many Python files are in the current directory")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
                    elif isinstance(block, ToolUseBlock):
                        print(f"Using tool: {block.name}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"\nCost: ${message.total_cost_usd:.4f}")
                print(f"Total turns: {message.num_turns}")

    print("\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    """Run all predefined tools examples."""
    # query() — one-shot, stateless
    await example_read_write_tools()
    await example_bash_tool()
    await example_search_tools()
    await example_multiple_tools()

    # ClaudeSDKClient — same prompts, explicit session lifecycle
    await example_client_read_write_tools()
    await example_client_bash_tool()
    await example_client_search_tools()
    await example_client_multiple_tools()


if __name__ == "__main__":
    anyio.run(main) 