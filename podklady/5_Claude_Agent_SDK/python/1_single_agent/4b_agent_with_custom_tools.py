#!/usr/bin/env python3
"""
Single Agent Example (d): Agent with Custom Tools (MCP)

Demonstrates creating custom tools using SDK MCP servers with the @tool decorator.
This example uses stock market tools powered by yfinance.
"""

# ============================================================================
# IMPORTANT: This example uses ClaudeSDKClient, NOT the query() function!
# ============================================================================
# When working with custom MCP tools, you MUST use ClaudeSDKClient with the
# async context manager pattern:
#
#   async with ClaudeSDKClient(options=options) as client:
#       await client.query("your prompt")
#       async for message in client.receive_response():
#           # process messages
#
# Do NOT use the query() function - it will not work properly with custom tools!
# ============================================================================

import anyio
from typing import Any
from datetime import datetime
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    create_sdk_mcp_server,
    tool,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)
import yfinance as yf


# Define custom stock market tools
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
        result = f"Stock: {ticker}\nCurrent Price: {current_price} {currency}"
        return {"content": [{"type": "text", "text": result}]}

    except Exception as e:
        return {
            "content": [
                {"type": "text", "text": f"Error fetching price for {ticker}: {str(e)}"}
            ]
        }


@tool(
    "get_dividend_date",
    "Get the next dividend payment date and information for a given ticker symbol (e.g., AAPL, MSFT, JNJ)",
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


async def example_stock_price():
    """Agent with stock price tool."""
    print("=== Example 1: Get Stock Price ===\n")

    # Create MCP server with stock price tool
    stock_server = create_sdk_mcp_server(
        name="stocks",
        version="1.0.0",
        tools=[get_stock_price],
    )

    options = ClaudeAgentOptions(
        mcp_servers={"stocks": stock_server},
        allowed_tools=["mcp__stocks__get_stock_price"],
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("What is the current price of Apple stock (AAPL)?")

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


async def example_dividend_info():
    """Agent with dividend information tool."""
    print("=== Example 2: Get Dividend Information ===\n")

    # Create MCP server with dividend tool
    dividend_server = create_sdk_mcp_server(
        name="dividends",
        version="1.0.0",
        tools=[get_dividend_date],
    )

    options = ClaudeAgentOptions(
        mcp_servers={"dividends": dividend_server},
        allowed_tools=["mcp__dividends__get_dividend_date"],
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("When is the next dividend payment for Microsoft (MSFT)?")

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


async def example_combined_analysis():
    """Agent with multiple stock analysis tools."""
    print("=== Example 3: Combined Stock Analysis ===\n")

    # Create MCP server with both stock tools
    stock_analysis = create_sdk_mcp_server(
        name="stock_analysis",
        version="1.0.0",
        tools=[get_stock_price, get_dividend_date],
    )

    options = ClaudeAgentOptions(
        mcp_servers={"analysis": stock_analysis},
        allowed_tools=[
            "mcp__analysis__get_stock_price",
            "mcp__analysis__get_dividend_date",
        ],
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Tell me about Johnson & Johnson (JNJ) - what's the current price and when is the next dividend payment?"
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


async def example_compare_stocks():
    """Agent that compares multiple stocks."""
    print("=== Example 4: Compare Multiple Stocks ===\n")

    # Create MCP server with stock price tool
    stock_server = create_sdk_mcp_server(
        name="stocks",
        version="1.0.0",
        tools=[get_stock_price],
    )

    options = ClaudeAgentOptions(
        mcp_servers={"stocks": stock_server},
        allowed_tools=["mcp__stocks__get_stock_price"],
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query(
            "Compare the current prices of Apple (AAPL), Microsoft (MSFT), and Google (GOOGL)."
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
    """Run all stock market tools examples."""
    await example_stock_price()
    await example_dividend_info()
    await example_combined_analysis()
    await example_compare_stocks()

    print("=== Custom Stock Tools Summary ===")
    print("✓ @tool decorator for easy definition")
    print("✓ Type hints for parameters and return values")
    print("✓ Integration with real data sources (yfinance)")
    print("✓ Error handling for robust operations")
    print("✓ Structured data in MCP-compatible format")
    print("✓ Multiple tool composition for complex queries")


if __name__ == "__main__":
    anyio.run(main)
