#!/usr/bin/env python3
"""
Local Model Demo — query() and ClaudeSDKClient with Ollama (gpt-oss)
=====================================================================
Demonstrates how to use a local Ollama model with both SDK interfaces.

Setup:
    ollama pull gpt-oss
    OLLAMA_CONTEXT_LENGTH=32768 ollama serve
"""
import os
import anyio
from claude_agent_sdk import (
    query,
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ResultMessage,
)

# Point the SDK to your local Ollama instance
os.environ["ANTHROPIC_BASE_URL"] = "http://localhost:11434"
os.environ["ANTHROPIC_AUTH_TOKEN"] = "ollama"
os.environ["ANTHROPIC_API_KEY"] = ""

LOCAL_MODEL = "gpt-oss:20b"


# ---------------------------------------------------------------------------
# Example 1 — query(): simple, stateless, one-shot
# ---------------------------------------------------------------------------
async def example_query():
    print("=== Example 1: query() — Simple One-Shot ===\n")

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        system_prompt="You are a helpful assistant.",
        max_turns=1,
    )

    async for message in query(
        prompt="Tell me about Python programming.",
        options=options,
    ):
        print("-----")
        print(message)
        print("-----\n")

        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"gpt-oss: {block.text}")
        elif isinstance(message, ResultMessage):
            print(f"Turns: {message.num_turns}")

    print()


# ---------------------------------------------------------------------------
# Example 2 — ClaudeSDKClient: stateful, multi-turn, full-featured
# ---------------------------------------------------------------------------
async def example_client():
    print("=== Example 2: ClaudeSDKClient — Stateful Session ===\n")

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        system_prompt="You are a helpful assistant.",
        max_turns=3,
    )

    async with ClaudeSDKClient(options=options) as client:
        print("Asking: What is 2 + 2?\n")
        await client.query("What is 2 + 2?")

        async for message in client.receive_response():
            print("-----")
            print(message)
            print("-----\n")

            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"gpt-oss: {block.text}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"Cost: ${message.total_cost_usd:.4f}")
                print(f"Duration: {message.duration_ms}ms")

        # Follow-up — session remembers the previous exchange
        print("\nFollow-up: Double that result.\n")
        await client.query("Double that result.")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"gpt-oss: {block.text}")
            elif isinstance(message, ResultMessage):
                print(f"Duration: {message.duration_ms}ms")

    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    await example_query()
    await example_client()


if __name__ == "__main__":
    anyio.run(main)