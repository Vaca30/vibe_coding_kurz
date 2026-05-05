#!/usr/bin/env python3
"""
Script 1: query() — Demonstrating Capabilities & Limitations
=============================================================
query() is the simple, stateless API. Each call spins up a fresh session.
This script deliberately shows what you CANNOT do with query() alone:
  - No multi-turn memory (each call forgets the previous one)
  - No custom in-process tools
  - No hooks
  - No interrupt()
"""
import os
import anyio
from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ResultMessage,
)

# Point SDK to local Ollama instance
os.environ["ANTHROPIC_BASE_URL"] = "http://localhost:11434"
os.environ["ANTHROPIC_AUTH_TOKEN"] = "ollama"
os.environ["ANTHROPIC_API_KEY"] = ""

LOCAL_MODEL = "gpt-oss:20b"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
async def run_query(prompt: str, options: ClaudeAgentOptions) -> None:
    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"  gpt-oss: {block.text}")
        elif isinstance(message, ResultMessage):
            print(f"  [turns={message.num_turns}]")


# ---------------------------------------------------------------------------
# Example 1 — Basic single-turn query (works fine with query())
# ---------------------------------------------------------------------------
async def example_single_turn():
    print("=== Example 1: Single-Turn Query (works great) ===\n")

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        system_prompt="You are a concise assistant.",
        max_turns=1,
    )
    await run_query("What is Python's GIL?", options)
    print()


# ---------------------------------------------------------------------------
# Example 2 — Simulated multi-turn: each query() call is a FRESH SESSION.
#             The model has NO memory of the previous exchange.
# ---------------------------------------------------------------------------
async def example_multi_turn_no_memory():
    print("=== Example 2: Multi-Turn — Session Resets Every Call ===\n")
    print("  NOTE: query() creates a brand-new session on every call.")
    print("  The model will NOT remember what was said in the previous call.\n")

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        system_prompt="You are a concise assistant.",
        max_turns=1,
    )

    # Call 1 — tell the model a fact
    print("  [Call 1] Telling the model our favourite language...")
    await run_query("My favourite language is Python.", options)

    # Call 2 — ask the model to recall it (it CANNOT — new session)
    print("\n  [Call 2] Asking the model to recall (expect it to NOT know)...")
    await run_query(
        "What is my favourite language? (You will not know — this is a new session!)",
        options,
    )
    print()


# ---------------------------------------------------------------------------
# Example 3 — No hooks support: we cannot intercept tool use with query()
# ---------------------------------------------------------------------------
async def example_no_hooks():
    print("=== Example 3: No Hooks Support ===\n")
    print("  NOTE: query() does NOT support hooks.")
    print("  You cannot intercept PreToolUse / PostToolUse events.\n")

    # Attempting to pass hooks via ClaudeAgentOptions would require
    # ClaudeSDKClient. With query() the hooks kwarg is ignored / unavailable.
    # We show this by reading a file — we have no way to intercept the Read call.
    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        allowed_tools=["Read", "Glob"],
        max_turns=2,
    )

    print("  Asking Claude to read this script file — we cannot intercept the Read tool call:\n")
    await run_query(
        "Read the file 01_query_limitations.py and tell me how many examples it contains.",
        options,
    )
    print()


# ---------------------------------------------------------------------------
# Example 4 — No interrupt() support
# ---------------------------------------------------------------------------
async def example_no_interrupt():
    print("=== Example 4: No interrupt() Support ===\n")
    print("  NOTE: query() returns an async iterator — there is no client object")
    print("  to call .interrupt() on. You can stop consuming the iterator early,")
    print("  but that can cause asyncio cleanup issues.\n")
    print("  Workaround: use a flag and let the loop finish naturally.\n")

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        max_turns=1,
    )

    found = False
    async for message in query(
        prompt="List five Python built-in functions.", options=options
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    if not found:
                        # Only print the first chunk — but we CANNOT truly interrupt;
                        # we let the loop drain naturally via the flag.
                        print(f"  gpt-oss (first chunk only, flag approach): {block.text[:120]}...")
                        found = True
        # We do NOT break — we let the iterator finish to avoid cleanup issues.
    print()


# ---------------------------------------------------------------------------
# Example 5 — No custom in-process tools
# ---------------------------------------------------------------------------
async def example_no_custom_tools():
    print("=== Example 5: No Custom In-Process Tools ===\n")
    print("  NOTE: query() cannot register custom Python functions as tools.")
    print("  @tool + create_sdk_mcp_server require ClaudeSDKClient.\n")
    print("  With query() you can only use Claude's built-in tools (Read, Write, Bash…)\n")

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        allowed_tools=["Bash"],
        max_turns=2,
    )

    await run_query("What is 17 * 42? Use bash to compute it.", options)
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    print("=" * 65)
    print("  query() API — Capabilities & Limitations Demo")
    print("  Model: gpt-oss via Ollama")
    print("=" * 65)
    print()

    await example_single_turn()
    await example_multi_turn_no_memory()
    await example_no_hooks()
    await example_no_interrupt()
    await example_no_custom_tools()

    print("=" * 65)
    print("  Summary")
    print("=" * 65)
    print("""
  query()  ✅ Simple one-shot questions
  query()  ✅ Built-in tools (Read, Write, Bash, Glob…)
  query()  ✅ System prompts, model selection, max_turns
  query()  ❌ Multi-turn memory  → session resets every call
  query()  ❌ Hooks              → use ClaudeSDKClient
  query()  ❌ Custom tools       → use ClaudeSDKClient + @tool
  query()  ❌ interrupt()        → use ClaudeSDKClient
  query()  ❌ Session control    → use ClaudeSDKClient
""")


if __name__ == "__main__":
    anyio.run(main)