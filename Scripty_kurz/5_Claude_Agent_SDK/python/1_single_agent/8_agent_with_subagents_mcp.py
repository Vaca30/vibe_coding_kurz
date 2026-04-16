#!/usr/bin/env python3
"""
Single Agent Example (7): Agent with Subagents Using MCP Tools

Demonstrates using specialized subagents that have access to MCP tools.
Each subagent can use both external MCP servers (like Playwright) and custom
MCP tools (like stock market tools).
"""

import anyio
from typing import Any
from datetime import datetime
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AgentDefinition,
    create_sdk_mcp_server,
    tool,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)
from claude_agent_sdk.types import McpStdioServerConfig
import yfinance as yf


# ============================================================================
# Custom MCP Tools for Financial Analysis
# ============================================================================


@tool(
    "get_stock_price",
    "Get the current stock price for a given ticker symbol (e.g., AAPL, MSFT, GOOGL)",
    {"ticker": str},
)
async def get_stock_price(args: dict[str, Any]) -> dict[str, Any]:
    """Get the current stock price for a ticker symbol."""
    ticker = args["ticker"]
    try:
        ticker_info = yf.Ticker(ticker).info
        current_price = ticker_info.get("currentPrice")

        if current_price is None:
            current_price = ticker_info.get("regularMarketPrice")

        if current_price is None:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Unable to fetch price for {ticker}. The ticker may be invalid.",
                    }
                ]
            }

        currency = ticker_info.get("currency", "USD")
        company_name = ticker_info.get("longName", ticker)
        result = f"Stock: {company_name} ({ticker})\nCurrent Price: {current_price} {currency}"
        return {"content": [{"type": "text", "text": result}]}

    except Exception as e:
        return {
            "content": [
                {"type": "text", "text": f"Error fetching price for {ticker}: {str(e)}"}
            ]
        }


@tool(
    "get_company_info",
    "Get detailed company information for a ticker symbol including sector, industry, and market cap",
    {"ticker": str},
)
async def get_company_info(args: dict[str, Any]) -> dict[str, Any]:
    """Get detailed company information."""
    ticker = args["ticker"]
    try:
        ticker_info = yf.Ticker(ticker).info

        company_name = ticker_info.get("longName", "N/A")
        sector = ticker_info.get("sector", "N/A")
        industry = ticker_info.get("industry", "N/A")
        market_cap = ticker_info.get("marketCap", 0)
        market_cap_str = f"${market_cap / 1e9:.2f}B" if market_cap else "N/A"
        employees = ticker_info.get("fullTimeEmployees", "N/A")
        website = ticker_info.get("website", "N/A")

        result = (
            f"Company: {company_name} ({ticker})\n"
            f"Sector: {sector}\n"
            f"Industry: {industry}\n"
            f"Market Cap: {market_cap_str}\n"
            f"Employees: {employees}\n"
            f"Website: {website}"
        )
        return {"content": [{"type": "text", "text": result}]}

    except Exception as e:
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"Error fetching company info for {ticker}: {str(e)}",
                }
            ]
        }


@tool(
    "get_dividend_date",
    "Get the next dividend payment date and information for a given ticker symbol",
    {"ticker": str},
)
async def get_dividend_date(args: dict[str, Any]) -> dict[str, Any]:
    """Get dividend payment information for a ticker symbol."""
    ticker = args["ticker"]
    try:
        ticker_info = yf.Ticker(ticker).info
        dividend_date = ticker_info.get("dividendDate")

        if dividend_date:
            date_str = datetime.fromtimestamp(dividend_date).strftime("%Y-%m-%d")
        else:
            date_str = "No dividend date available"

        dividend_rate = ticker_info.get("dividendRate", "N/A")
        dividend_yield = ticker_info.get("dividendYield")
        yield_str = f"{dividend_yield * 100:.2f}%" if dividend_yield else "N/A"

        result = (
            f"Stock: {ticker}\n"
            f"Next Dividend Date: {date_str}\n"
            f"Dividend Rate: {dividend_rate}\n"
            f"Dividend Yield: {yield_str}"
        )
        return {"content": [{"type": "text", "text": result}]}

    except Exception as e:
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"Error fetching dividend info for {ticker}: {str(e)}",
                }
            ]
        }


# ============================================================================
# Example 1: Financial Research Subagent with Custom MCP Tools
# ============================================================================


async def example_financial_research_subagent():
    """Subagent specialized in financial research using custom MCP tools."""
    print("=== Example 1: Financial Research Subagent with Custom MCP Tools ===\n")

    # Create MCP server with financial tools
    financial_server = create_sdk_mcp_server(
        name="finance",
        version="1.0.0",
        tools=[get_stock_price, get_company_info, get_dividend_date],
    )

    options = ClaudeAgentOptions(
        mcp_servers={"finance": financial_server},
        agents={
            "financial-analyst": AgentDefinition(
                description="Analyzes stocks and provides financial insights",
                prompt=(
                    "You are a financial analyst. Use the available tools to research stocks, "
                    "analyze company information, and provide investment insights. "
                    "Provide clear, data-driven analysis."
                ),
                tools=[
                    "mcp__finance",
                ],
                model="sonnet",
            ),
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Use the financial-analyst agent to research Apple (AAPL) and provide a brief analysis "
            "including current price, company details, and dividend information."
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


# ============================================================================
# Example 2: Web Research Subagent with External MCP Server
# ============================================================================


async def example_web_research_subagent():
    """Subagent specialized in web research using Playwright MCP server."""
    print("=== Example 2: Web Research Subagent with External MCP Server ===\n")

    # Configure external Playwright MCP server
    playwright_server: McpStdioServerConfig = {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
    }

    options = ClaudeAgentOptions(
        mcp_servers={"playwright": playwright_server},
        agents={
            "web-researcher": AgentDefinition(
                description="Researches information from websites",
                prompt=(
                    "You are a web research specialist. Navigate to websites, extract information, "
                    "and provide comprehensive summaries. Focus on accuracy and relevance."
                ),
                tools=[
                    "mcp__playwright__browser_navigate",
                    "mcp__playwright__browser_snapshot",
                    "mcp__playwright__browser_screenshot",
                ],
                model="sonnet",
            ),
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Use the web-researcher agent to visit https://www.example.com and describe what you find."
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


# ============================================================================
# Example 3: Multiple Subagents with Different MCP Tools
# ============================================================================


async def example_multiple_subagents_with_mcp():
    """Multiple specialized subagents, each with their own MCP tools."""
    print("=== Example 3: Multiple Subagents with Different MCP Tools ===\n")

    # Create financial MCP server
    financial_server = create_sdk_mcp_server(
        name="finance",
        version="1.0.0",
        tools=[get_stock_price, get_company_info],
    )

    # Configure Playwright MCP server
    playwright_server: McpStdioServerConfig = {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
    }

    options = ClaudeAgentOptions(
        mcp_servers={
            "finance": financial_server,
            "playwright": playwright_server,
        },
        agents={
            "stock-analyzer": AgentDefinition(
                description="Analyzes stock prices and company data",
                prompt=(
                    "You are a stock market analyst. Analyze stock prices and company fundamentals. "
                    "Provide concise, data-driven insights."
                ),
                tools=[
                    "mcp__finance__get_stock_price",
                    "mcp__finance__get_company_info",
                ],
                model="sonnet",
            ),
            "web-scout": AgentDefinition(
                description="Scouts websites for information",
                prompt=(
                    "You are a web scout. Navigate websites and extract key information quickly. "
                    "Focus on finding relevant data efficiently."
                ),
                tools=[
                    "mcp__playwright__browser_navigate",
                    "mcp__playwright__browser_snapshot",
                ],
                model="sonnet",
            ),
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Use the stock-analyzer agent to check the price of Microsoft (MSFT), "
            "then use the web-scout agent to visit https://www.example.com"
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


# ============================================================================
# Example 4: Subagent with Combined MCP Tools (Custom + External)
# ============================================================================


async def example_combined_mcp_subagent():
    """Subagent that uses both custom and external MCP tools together."""
    print("=== Example 4: Subagent with Combined MCP Tools ===\n")

    # Create financial MCP server
    financial_server = create_sdk_mcp_server(
        name="finance",
        version="1.0.0",
        tools=[get_stock_price, get_company_info, get_dividend_date],
    )

    # Configure Playwright MCP server
    playwright_server: McpStdioServerConfig = {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"],
    }

    options = ClaudeAgentOptions(
        mcp_servers={
            "finance": financial_server,
            "playwright": playwright_server,
        },
        agents={
            "research-analyst": AgentDefinition(
                description="Comprehensive research analyst combining financial data and web research",
                prompt=(
                    "You are a comprehensive research analyst. Combine financial data analysis "
                    "with web research to provide thorough insights. Use both stock market tools "
                    "and web browsing capabilities to gather complete information."
                ),
                tools=[
                    "mcp__finance__get_stock_price",
                    "mcp__finance__get_company_info",
                    "mcp__finance__get_dividend_date",
                    "mcp__playwright__browser_navigate",
                    "mcp__playwright__browser_snapshot",
                ],
                model="sonnet",
            ),
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Use the research-analyst agent to: "
            "1) Get Apple (AAPL) stock price and company info, "
            "2) Visit https://www.apple.com and summarize what you find"
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


# ============================================================================
# Example 5: Hierarchical Subagents with MCP Tools
# ============================================================================


async def example_hierarchical_subagents_with_mcp():
    """Hierarchical subagents with different MCP tool access levels."""
    print("=== Example 5: Hierarchical Subagents with MCP Tools ===\n")

    # Create financial MCP server
    financial_server = create_sdk_mcp_server(
        name="finance",
        version="1.0.0",
        tools=[get_stock_price, get_company_info, get_dividend_date],
    )

    options = ClaudeAgentOptions(
        mcp_servers={"finance": financial_server},
        agents={
            "senior-analyst": AgentDefinition(
                description="Senior analyst with full financial tool access",
                prompt=(
                    "You are a senior financial analyst with access to all financial tools. "
                    "Provide comprehensive analysis using all available data sources. "
                    "Coordinate with junior analysts when needed."
                ),
                tools=[
                    "mcp__finance__get_stock_price",
                    "mcp__finance__get_company_info",
                    "mcp__finance__get_dividend_date",
                ],
                model="sonnet",
            ),
            "junior-analyst": AgentDefinition(
                description="Junior analyst with limited financial tool access",
                prompt=(
                    "You are a junior financial analyst. You can check stock prices and basic info. "
                    "Focus on gathering data and presenting it clearly."
                ),
                tools=[
                    "mcp__finance__get_stock_price",
                    "mcp__finance__get_company_info",
                ],
                model="sonnet",
            ),
            "price-checker": AgentDefinition(
                description="Specialist focused only on price checking",
                prompt=(
                    "You are a price checking specialist. Your only job is to quickly check "
                    "and report current stock prices. Be fast and accurate."
                ),
                tools=[
                    "mcp__finance__get_stock_price",
                ],
                model="sonnet",
            ),
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Use the senior-analyst to provide a complete analysis of Tesla (TSLA) "
            "including price, company info, and dividend information."
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


# ============================================================================
# Example 6: Main Agent with NO Tools (Option 1)
# ============================================================================


async def example_main_agent_no_tools():
    """Main agent cannot use any tools - only subagents have tool access."""
    print("=== Example 6: Main Agent with NO Tools (Option 1) ===\n")

    # Create financial MCP server
    financial_server = create_sdk_mcp_server(
        name="finance",
        version="1.0.0",
        tools=[get_stock_price, get_company_info],
    )

    options = ClaudeAgentOptions(
        mcp_servers={"finance": financial_server},
        allowed_tools=[],  # Main agent has NO tools at all
        agents={
            "stock-analyzer": AgentDefinition(
                description="Analyzes stock prices and company data",
                prompt=(
                    "You are a stock market analyst. Analyze stock prices and company fundamentals. "
                    "Provide concise, data-driven insights."
                ),
                tools=[
                    "mcp__finance__get_stock_price",
                    "mcp__finance__get_company_info",
                ],
                model="sonnet",
            ),
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Use the stock-analyzer agent to check the price and company info for Amazon (AMZN). "
            "The main agent should delegate to the subagent since it has no tools."
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


# ============================================================================
# Example 7: Main Agent with LIMITED Tools (Option 2)
# ============================================================================


async def example_main_agent_limited_tools():
    """Main agent has access to only specific tools, subagents have more."""
    print("=== Example 7: Main Agent with LIMITED Tools (Option 2) ===\n")

    # Create financial MCP server
    financial_server = create_sdk_mcp_server(
        name="finance",
        version="1.0.0",
        tools=[get_stock_price, get_company_info, get_dividend_date],
    )

    options = ClaudeAgentOptions(
        mcp_servers={"finance": financial_server},
        allowed_tools=[
            "mcp__finance__get_stock_price",  # Main agent can ONLY check prices
        ],
        agents={
            "full-analyst": AgentDefinition(
                description="Full-featured analyst with all financial tools",
                prompt=(
                    "You are a comprehensive financial analyst with access to all financial tools. "
                    "Provide detailed analysis including company info and dividends."
                ),
                tools=[
                    "mcp__finance__get_stock_price",
                    "mcp__finance__get_company_info",
                    "mcp__finance__get_dividend_date",
                ],
                model="sonnet",
            ),
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "First, as the main agent, check the price of Netflix (NFLX). "
            "Then use the full-analyst agent to provide a complete analysis with company info and dividends."
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
    """Run all subagent with MCP tools examples."""
    print("=" * 70)
    print("SUBAGENTS WITH MCP TOOLS")
    print("=" * 70)
    print()
    print("This example demonstrates combining specialized subagents with MCP tools.")
    print("Each subagent can have access to:")
    print("  - Custom MCP tools (created with @tool decorator)")
    print("  - External MCP servers (like Playwright)")
    print("  - Combination of both")
    print()
    print("Key concepts:")
    print("  1. Subagents have specialized prompts and tool access")
    print("  2. MCP tools extend subagent capabilities")
    print("  3. Tools can be scoped per subagent for security/organization")
    print("  4. Both custom and external MCP servers work with subagents")
    print("  5. Main agent tool access can be controlled with allowed_tools")
    print()
    print("=" * 70)
    print()

    # Run examples
    await example_financial_research_subagent()
    await example_web_research_subagent()
    await example_multiple_subagents_with_mcp()
    await example_combined_mcp_subagent()
    await example_hierarchical_subagents_with_mcp()
    await example_main_agent_no_tools()
    await example_main_agent_limited_tools()

    print("\n=== Subagents with MCP Tools Summary ===")
    print(" Subagents can use custom MCP tools (@tool decorator)")
    print(" Subagents can use external MCP servers (Playwright, etc.)")
    print(" Each subagent can have different tool access")
    print(" Tools are scoped with mcp__<server>__<tool> naming")
    print(" Combine multiple MCP sources in single subagent")
    print(" Create hierarchical access control with tool permissions")
    print(" Use ClaudeSDKClient for MCP tool management")
    print()
    print("Pattern comparison:")
    print("  7_agent_with_subagents.py: Subagents with built-in tools")
    print("  8_agent_with_subagents_mcp.py: Subagents with MCP tools")
    print()
    print("Best practices:")
    print("  - Give each subagent only the tools it needs")
    print("  - Use allowed_tools to restrict main agent access")
    print("  - Use descriptive subagent names and prompts")
    print("  - Combine custom and external MCP tools strategically")
    print("  - Test tool access levels match security requirements")
    print()
    print("Main Agent Tool Access Control:")
    print("  Option 1 (Example 6): allowed_tools=[] → Main agent has NO tools")
    print("  Option 2 (Example 7): allowed_tools=[...] → Main agent has LIMITED tools")
    print("  Option 3 (Examples 1-5): No allowed_tools → Main agent has ALL tools")
    print()
    print("Security Pattern:")
    print("  If you want ONLY subagents to use tools (main agent as coordinator),")
    print("  set allowed_tools=[] to prevent main agent from directly using tools.")


if __name__ == "__main__":
    anyio.run(main)
