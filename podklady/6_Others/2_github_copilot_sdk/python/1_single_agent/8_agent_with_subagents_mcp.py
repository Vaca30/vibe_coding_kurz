"""
8 — Custom agents that own their own (MCP) tools.

Concept
-------
A custom agent can have its *own* MCP servers attached, distinct from the rest
of the session. This is how you build a "specialist" — for example, a finance
analyst that has access to a stock-data MCP server while no other agent does.

Here we define two specialists, each with its own custom in-process tools.

Run:
    python 1_single_agent/8_agent_with_subagents_mcp.py
"""

import asyncio
import statistics

from pydantic import BaseModel, Field

from copilot import CopilotClient, define_tool
from copilot.session import PermissionHandler


# --- Finance specialist's tools -------------------------------------------

class TickerParams(BaseModel):
    ticker: str = Field(description="Stock ticker, e.g. AAPL")


_FAKE_PRICES = {"AAPL": 192.13, "MSFT": 421.55, "GOOGL": 174.02, "TSLA": 248.91}
_FAKE_DIVIDENDS = {"AAPL": "2026-05-15", "MSFT": "2026-05-22"}


@define_tool(description="Look up the current price for a stock ticker.")
async def get_stock_price(params: TickerParams) -> str:
    p = _FAKE_PRICES.get(params.ticker.upper())
    return f"{params.ticker.upper()} = ${p}" if p else f"unknown ticker {params.ticker!r}"


@define_tool(description="Look up the next dividend date for a stock ticker.")
async def get_dividend_date(params: TickerParams) -> str:
    d = _FAKE_DIVIDENDS.get(params.ticker.upper())
    return f"{params.ticker.upper()} next dividend: {d}" if d else "no dividend on record"


# --- Stats specialist's tools ---------------------------------------------

class NumbersParams(BaseModel):
    numbers: list[float]


@define_tool(description="Return the arithmetic mean of a list of numbers.")
async def mean(params: NumbersParams) -> str:
    if not params.numbers:
        return "empty list"
    return f"{statistics.fmean(params.numbers):.4f}"


@define_tool(description="Return the population standard deviation of a list of numbers.")
async def stddev(params: NumbersParams) -> str:
    if len(params.numbers) < 2:
        return "need at least two numbers"
    return f"{statistics.pstdev(params.numbers):.4f}"


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        # All custom tools must be registered at the session level...
        tools=[get_stock_price, get_dividend_date, mean, stddev],
        # ...and we restrict each agent to the ones it should actually see.
        custom_agents=[
            {
                "name": "finance-analyst",
                "display_name": "Finance Analyst",
                "description": "Answers questions about stock prices and dividends.",
                "tools": ["get_stock_price", "get_dividend_date"],
                "prompt": (
                    "You are a finance analyst. Use the available tools to look up "
                    "concrete data; never guess prices or dates."
                ),
            },
            {
                "name": "stats-analyst",
                "display_name": "Statistics Analyst",
                "description": "Computes statistics over numeric datasets.",
                "tools": ["mean", "stddev"],
                "prompt": (
                    "You are a statistics expert. Use the tools to produce exact "
                    "numbers; explain the result in plain language."
                ),
            },
        ],
    )

    print("> Finance question (should pick finance-analyst):")
    reply = await session.send_and_wait(
        "What's AAPL trading at, and when's the next dividend?",
        timeout=180.0,
    )
    print(reply.data.content if reply else "(no reply)")

    print("\n> Stats question (should pick stats-analyst):")
    reply = await session.send_and_wait(
        "Given the values 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, what's the mean and the standard deviation?",
        timeout=180.0,
    )
    print(reply.data.content if reply else "(no reply)")

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
