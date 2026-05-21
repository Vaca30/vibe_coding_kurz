"""
4b — Custom (in-process) tools.

Concept
-------
Define a tool with the `@define_tool` decorator, give it a pydantic schema for
its arguments, and pass it into the session via `tools=[...]`. The agent will
call it like any built-in tool, but the handler runs inside *your* Python
process — perfect for talking to local data, internal APIs, or anything you'd
rather not shell out to.

Run:
    python 1_single_agent/4b_agent_with_custom_tools.py
"""

import asyncio

from pydantic import BaseModel, Field

from copilot import CopilotClient, define_tool
from copilot.session import PermissionHandler


# --- Tool 1: a price lookup ------------------------------------------------

class PriceParams(BaseModel):
    ticker: str = Field(description="Stock ticker symbol, e.g. AAPL")


# Pretend prices for the demo. In real code, hit a real API here.
_FAKE_PRICES = {"AAPL": 192.13, "MSFT": 421.55, "GOOGL": 174.02}


@define_tool(description="Look up the current price for a stock ticker.")
async def get_stock_price(params: PriceParams) -> str:
    price = _FAKE_PRICES.get(params.ticker.upper())
    if price is None:
        return f"No data for ticker {params.ticker!r}."
    return f"{params.ticker.upper()} is trading at ${price}."


# --- Tool 2: a tiny calculator --------------------------------------------

class AddParams(BaseModel):
    a: float
    b: float


@define_tool(description="Add two numbers and return the sum.")
async def add(params: AddParams) -> str:
    return f"{params.a + params.b}"


async def main() -> None:
    client = CopilotClient()
    await client.start()

    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        tools=[get_stock_price, add],
    )

    reply = await session.send_and_wait(
        "What's Apple trading at right now? Then tell me 17.5 + 24.3."
    )
    if reply is not None:
        print(reply.data.content)

    await session.disconnect()
    await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
