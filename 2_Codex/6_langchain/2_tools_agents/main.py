from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI


def require_api_key() -> None:
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Add it to your environment or a local .env file."
        )


def build_model() -> ChatOpenAI:
    model_name = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    return ChatOpenAI(model=model_name, temperature=0)


def snack_inventory(room: str) -> str:
    """Look up the workshop snack inventory for a room."""

    inventory = {
        "prague": "Coffee beans, tea, sparkling water, and chocolate biscuits.",
        "brno": "Filter coffee, apples, and still water.",
        "online": "No physical snacks, but the slides are available.",
    }
    return inventory.get(room.lower(), f"No snack inventory found for {room}.")


def room_status(room: str) -> str:
    """Look up the current booking status for a workshop room."""

    status = {
        "river": "Booked until 14:00, free after 14:00.",
        "forest": "Free now, but booked from 15:30.",
        "studio": "Reserved all day for recording.",
    }
    return status.get(room.lower(), f"No booking data found for {room}.")


def stringify_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            part.get("text", str(part)) if isinstance(part, dict) else str(part)
            for part in content
        )
    return str(content)


def main() -> None:
    load_dotenv()
    require_api_key()

    agent = create_agent(
        model=build_model(),
        tools=[snack_inventory, room_status],
        system_prompt=(
            "You are a helpful workshop assistant. "
            "Use tools whenever the user asks about internal room or snack data."
        ),
    )

    result = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "Use the available tools to tell me what snacks are in the Prague room "
                        "and whether the River room is free after 14:00."
                    ),
                }
            ]
        }
    )

    messages = result["messages"]
    tool_messages = [message for message in messages if getattr(message, "type", "") == "tool"]

    print("=== Tool Messages ===")
    if not tool_messages:
        print("No tool messages were returned.")
    else:
        for message in tool_messages:
            tool_name = getattr(message, "name", "tool")
            print(f"{tool_name}: {stringify_content(message.content)}")

    print()
    print("=== Final Agent Answer ===")
    print(stringify_content(messages[-1].content))


if __name__ == "__main__":
    main()
