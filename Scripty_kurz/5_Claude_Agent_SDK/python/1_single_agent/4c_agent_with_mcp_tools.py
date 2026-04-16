#!/usr/bin/env python3
"""
Single Agent Example (3c): Agent with External MCP Tools (Playwright)

Demonstrates connecting to external MCP servers like Playwright for browser automation.
This example shows how to integrate with MCP servers running as separate processes.
"""

# ============================================================================
# IMPORTANT: This example uses ClaudeSDKClient with EXTERNAL MCP servers!
# ============================================================================
# Unlike 4b_agent_with_custom_tools.py which creates tools using @tool decorator,
# this example connects to external MCP servers (like Playwright) that run as
# separate processes and provide their own tools.
#
# Prerequisites:
# 1. Install Playwright MCP server:
#    npx @playwright/mcp@latest
#
# 2. The Playwright MCP server provides browser automation tools like:
#    - browser_navigate: Navigate to a URL
#    - browser_click: Click on elements
#    - browser_type: Type text into elements
#    - browser_snapshot: Get page accessibility snapshot
#    - browser_screenshot: Take page screenshots
#    - browser_evaluate: Execute JavaScript
#
# You can also connect to other external MCP servers following the same pattern.
# ============================================================================

import anyio
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)
from claude_agent_sdk.types import McpStdioServerConfig


async def example_playwright_navigation():
    """Agent that uses Playwright to navigate and extract information."""
    print("=== Example 1: Navigate and Extract Page Information ===\n")

    # Configure Playwright MCP server programmatically using McpStdioServerConfig
    # This demonstrates adding an external MCP server directly in code
    playwright_server: McpStdioServerConfig = {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
    }

    options = ClaudeAgentOptions(
        mcp_servers={"playwright": playwright_server},
        allowed_tools=[
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_screenshot",
        ],
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Navigate to https://www.example.com and tell me what you see on the page. "
            "Use the snapshot tool to understand the page structure."
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


async def example_playwright_interaction():
    """Agent that uses Playwright to interact with web pages."""
    print("=== Example 2: Web Page Interaction ===\n")

    # Configure Playwright MCP server with custom environment variables
    playwright_server: McpStdioServerConfig = {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
        "env": {"NODE_ENV": "production"},  # Optional environment variables
    }

    options = ClaudeAgentOptions(
        mcp_servers={"playwright": playwright_server},
        allowed_tools=[
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_click",
            "mcp__playwright__browser_type",
            "mcp__playwright__browser_snapshot",
        ],
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Navigate to https://www.google.com, take a snapshot to understand the page structure, "
            "then describe the search interface you see."
        )

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

    print("\n")


async def example_playwright_research():
    """Agent that uses Playwright to research information from multiple pages."""
    print("=== Example 3: Multi-Page Research ===\n")

    # Configure Playwright MCP server
    playwright_server: McpStdioServerConfig = {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
    }

    options = ClaudeAgentOptions(
        mcp_servers={"playwright": playwright_server},
        allowed_tools=[
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_click",
            "mcp__playwright__browser_evaluate",
        ],
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Navigate to https://www.wikipedia.org and find information about Python programming language. "
            "First go to the Wikipedia homepage, then search for Python, and summarize what you find."
        )

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

    print("\n")


async def example_browser_screenshot_analysis():
    """Agent that takes screenshots and analyzes visual content."""
    print("=== Example 4: Screenshot Analysis ===\n")

    # Configure Playwright MCP server
    playwright_server: McpStdioServerConfig = {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
    }

    options = ClaudeAgentOptions(
        mcp_servers={"playwright": playwright_server},
        allowed_tools=[
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_screenshot",
            "mcp__playwright__browser_snapshot",
        ],
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Navigate to https://github.com/microsoft/playwright-mcp and take a screenshot. "
            "Describe the repository's README and main features you see."
        )

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

    print("\n")


async def example_combined_mcp_servers():
    """Agent using multiple external MCP servers together."""
    print("=== Example 5: Multiple MCP Servers (Playwright + Filesystem) ===\n")

    # This example shows how to configure multiple external MCP servers
    # Playwright for browser automation + Filesystem for file operations
    playwright_server: McpStdioServerConfig = {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
    }

    # Note: Filesystem MCP server would need to be configured separately
    # This is just showing the pattern for multiple servers
    # filesystem_server: McpStdioServerConfig = {
    #     "command": "npx",
    #     "args": ["-y", "@modelcontextprotocol/server-filesystem"],
    # }

    options = ClaudeAgentOptions(
        mcp_servers={
            "playwright": playwright_server,
            # "filesystem": filesystem_server,  # Add more servers as needed
        },
        allowed_tools=[
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            # Filesystem tools would be available if configured
            # "mcp__filesystem__read_text_file",
            # "mcp__filesystem__write_file",
        ],
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Navigate to https://www.example.com, get a snapshot of the page structure, "
            "and save a summary of what you find to a file called '/tmp/example_analysis.txt'."
        )

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

    print("\n")


async def main():
    """Run all external MCP tools examples."""
    print("=" * 70)
    print("EXTERNAL MCP TOOLS WITH PLAYWRIGHT (SDK Configuration)")
    print("=" * 70)
    print()
    print("This example demonstrates how to programmatically configure external")
    print("MCP servers using McpStdioServerConfig in your Python code.")
    print()
    print("PREREQUISITES:")
    print("  - Node.js installed (for npx)")
    print("  - Internet connection (to download @playwright/mcp)")
    print()
    print("HOW IT WORKS:")
    print("  1. Import McpStdioServerConfig from claude_agent_sdk.types")
    print("  2. Create a config dict with 'command' and 'args' fields")
    print("  3. Pass it to ClaudeAgentOptions via mcp_servers parameter")
    print("  4. Add tools from the server to allowed_tools list")
    print()
    print("EXAMPLE CODE:")
    print("  playwright_server: McpStdioServerConfig = {")
    print('      "command": "npx",')
    print('      "args": ["-y", "@playwright/mcp@latest"],')
    print("  }")
    print()
    print("  options = ClaudeAgentOptions(")
    print('      mcp_servers={"playwright": playwright_server},')
    print('      allowed_tools=["mcp__playwright__browser_navigate"],')
    print("  )")
    print()
    print("=" * 70)
    print()

    # Uncomment the examples you want to run
    # NOTE: These will only work if Playwright MCP is properly configured

    await example_playwright_navigation()
    await example_playwright_interaction()
    await example_playwright_research()
    await example_browser_screenshot_analysis()
    await example_combined_mcp_servers()

    print("\n=== External MCP Tools Summary ===")
    print("✓ Programmatically configure external MCP servers in Python code")
    print("✓ Use McpStdioServerConfig for stdio-based MCP servers")
    print("✓ Connect to external MCP servers (Playwright, Filesystem, etc.)")
    print("✓ Use tools from separate Node.js/Python processes")
    print("✓ Combine multiple MCP servers in one agent")
    print("✓ Browser automation with Playwright")
    print("✓ No need to implement tools - they're provided by the server")
    print("✓ Tool names follow pattern: mcp__<server>__<tool>")
    print()
    print("Key differences from 3b (custom tools):")
    print("  3b: Define tools in Python with @tool decorator + create_sdk_mcp_server()")
    print("  3c: Configure external MCP servers with McpStdioServerConfig")
    print()
    print("McpStdioServerConfig fields:")
    print("  - command (required): The command to run (e.g., 'npx', 'python')")
    print("  - args (optional): List of command arguments")
    print("  - env (optional): Environment variables dict")
    print("  - type (optional): Always 'stdio' (default)")
    print()
    print("Available Playwright Tools:")
    print("  - browser_navigate: Navigate to URLs")
    print("  - browser_click: Click on page elements")
    print("  - browser_type: Type text into inputs")
    print("  - browser_snapshot: Get accessibility tree snapshot")
    print("  - browser_screenshot: Capture page screenshots")
    print("  - browser_evaluate: Execute JavaScript")
    print("  - browser_console: Get console messages")
    print("  - browser_close: Close browser")


if __name__ == "__main__":
    anyio.run(main)
