#!/usr/bin/env python3
"""
Script 2: ClaudeSDKClient — Full Feature Demo
=============================================
ClaudeSDKClient is the stateful, full-featured API.
It uses `async with ClaudeSDKClient() as client:` for automatic
connection management and exposes everything query() cannot do:
  ✅ Multi-turn memory within a session
  ✅ Custom in-process tools (@tool + create_sdk_mcp_server)
  ✅ Hooks (PreToolUse, PostToolUse, …)
  ✅ interrupt() to stop mid-task
  ✅ Explicit session lifecycle control
"""
import os
import anyio
from typing import Any
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ResultMessage,
    tool,
    create_sdk_mcp_server,
    HookMatcher,
)

# Point SDK to local Ollama instance
os.environ["ANTHROPIC_BASE_URL"] = "http://localhost:11434"
os.environ["ANTHROPIC_AUTH_TOKEN"] = "ollama"
os.environ["ANTHROPIC_API_KEY"] = ""

LOCAL_MODEL = "gpt-oss"


# ---------------------------------------------------------------------------
# Helper — print assistant text + result metadata
# ---------------------------------------------------------------------------
async def print_response(client: ClaudeSDKClient, label: str = "") -> None:
    async for message in client.receive_response():
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    prefix = f"  [{label}] " if label else "  "
                    print(f"{prefix}gpt-oss: {block.text}")
        elif isinstance(message, ResultMessage):
            print(f"  [turns={message.num_turns}]")


# ---------------------------------------------------------------------------
# Example 1 — Multi-turn: session retains context across query() calls
# ---------------------------------------------------------------------------
async def example_multi_turn():
    print("=== Example 1: Multi-Turn — Session Retains Context ===\n")
    print("  Unlike query(), the same ClaudeSDKClient session remembers")
    print("  everything said within the `async with` block.\n")

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        system_prompt="You are a concise assistant.",
        max_turns=5,
    )

    async with ClaudeSDKClient(options=options) as client:
        # Turn 1 — plant a fact
        print("  [Turn 1] Planting a fact...")
        await client.query("My favourite language is Python.")
        await print_response(client, "Turn 1")

        # Turn 2 — the client REMEMBERS turn 1
        print("\n  [Turn 2] Asking for recall (model WILL remember)...")
        await client.query("What is my favourite language?")
        await print_response(client, "Turn 2")

        # Turn 3 — build further on the context
        print("\n  [Turn 3] Follow-up question...")
        await client.query("Name one killer feature of that language.")
        await print_response(client, "Turn 3")

    print()


# ---------------------------------------------------------------------------
# Example 2 — Append system prompt: extend the default prompt, don't replace
# ---------------------------------------------------------------------------
async def example_append_system_prompt():
    print("=== Example 2: Append System Prompt ===\n")
    print("  system_prompt='...' REPLACES the default Claude Code prompt.")
    print("  SystemPromptPreset with 'append' EXTENDS it instead.\n")

    # Option A — plain string: REPLACES the entire default system prompt
    options_replace = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        system_prompt="You are a concise assistant.",  # overwrites default
        max_turns=1,
    )

    # Option B — preset dict: APPENDS to the default Claude Code system prompt
    options_append = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        system_prompt={
            "type": "preset",
            "preset": "claude_code",
            "append": "Always respond in exactly one sentence.",
        },
        max_turns=1,
    )

    print("  [Replace] Using a plain string system_prompt (replaces default)...")
    async with ClaudeSDKClient(options=options_replace) as client:
        await client.query("What can you do?")
        await print_response(client, "Replace")

    print("\n  [Append] Using SystemPromptPreset with append (extends default)...")
    async with ClaudeSDKClient(options=options_append) as client:
        await client.query("What can you do?")
        await print_response(client, "Append")

    print()


# ---------------------------------------------------------------------------
# Example 3 — Custom in-process tools via @tool + create_sdk_mcp_server
# ---------------------------------------------------------------------------
async def example_custom_tools():
    print("=== Example 3: Custom In-Process Tools ===\n")

    # Define a custom calculator tool
    @tool(
        "calculate",
        "Evaluate a safe mathematical expression and return the result.",
        {"expression": str},
    )
    async def calculate(args: dict[str, Any]) -> dict[str, Any]:
        try:
            result = eval(args["expression"], {"__builtins__": {}})  # noqa: S307
            return {"content": [{"type": "text", "text": f"Result: {result}"}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Error: {e}"}]}

    # Define a custom greeter tool
    @tool(
        "greet",
        "Greet a user by name.",
        {"name": str},
    )
    async def greet(args: dict[str, Any]) -> dict[str, Any]:
        return {"content": [{"type": "text", "text": f"Hello, {args['name']}! 👋"}]}

    server = create_sdk_mcp_server(
        name="my-tools",
        version="1.0.0",
        tools=[calculate, greet],
    )

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        mcp_servers={"my-tools": server},
        allowed_tools=["mcp__my-tools__calculate", "mcp__my-tools__greet"],
        max_turns=3,
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("Calculate 17 * 42, then greet Alice.")
        await print_response(client)

    print()


# ---------------------------------------------------------------------------
# Example 4 — Hooks: intercept tool calls before/after execution
# ---------------------------------------------------------------------------
async def example_hooks():
    print("=== Example 4: Hooks (PreToolUse / PostToolUse) ===\n")
    print("  Hooks let you intercept, log, or block tool calls deterministically.\n")

    intercepted: list[str] = []

    async def log_pre_tool(input_data: dict, tool_use_id: str, context: dict) -> dict:
        tool_name = input_data.get("tool_name", "unknown")
        intercepted.append(f"PRE  → {tool_name}")
        print(f"  [Hook PreToolUse]  tool={tool_name}")
        return {}  # empty dict = allow

    async def log_post_tool(input_data: dict, tool_use_id: str, context: dict) -> dict:
        tool_name = input_data.get("tool_name", "unknown")
        intercepted.append(f"POST → {tool_name}")
        print(f"  [Hook PostToolUse] tool={tool_name}")
        return {}

    async def block_dangerous_bash(input_data: dict, tool_use_id: str, context: dict) -> dict:
        tool_name = input_data.get("tool_name", "")
        command = input_data.get("tool_input", {}).get("command", "")
        if tool_name == "Bash" and "rm -rf" in command:
            print(f"  [Hook] ❌ BLOCKED dangerous command: {command}")
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "Dangerous rm -rf command blocked by hook.",
                }
            }
        return {}

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        allowed_tools=["Bash", "Glob"],
        permission_mode="acceptEdits",
        max_turns=3,
        hooks={
            "PreToolUse": [
                HookMatcher(hooks=[log_pre_tool]),
                HookMatcher(matcher="Bash", hooks=[block_dangerous_bash]),
            ],
            "PostToolUse": [
                HookMatcher(hooks=[log_post_tool]),
            ],
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("Run: echo 'hello hooks' in bash.")
        await print_response(client)

    print(f"\n  Intercepted events: {intercepted}\n")


# ---------------------------------------------------------------------------
# Example 5 — interrupt(): stop the agent mid-task
# ---------------------------------------------------------------------------
async def example_interrupt():
    print("=== Example 5: interrupt() — Stop the Agent Mid-Task ===\n")
    print("  ClaudeSDKClient exposes interrupt() to halt execution cleanly.\n")

    options = ClaudeAgentOptions(
        model=LOCAL_MODEL,
        allowed_tools=["Bash"],
        max_turns=5,
    )

    async with ClaudeSDKClient(options=options) as client:
        # Fire off a potentially long-running task
        await client.query(
            "List all files recursively from / — this will take a long time."
        )

        msg_count = 0
        async for message in client.receive_response():
            msg_count += 1
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"  gpt-oss: {block.text[:120]}...")

            # After 2 messages, interrupt the agent
            if msg_count >= 2:
                print("\n  [interrupt()] Stopping the agent after 2 messages...")
                await client.interrupt()
                break  # safe to break after calling interrupt()

    print()


# ---------------------------------------------------------------------------
# Example 6 — Session lifecycle: fresh session per `async with` block
# ---------------------------------------------------------------------------
async def example_session_lifecycle():
    print("=== Example 6: Session Lifecycle ===\n")
    print("  Each `async with ClaudeSDKClient()` block is one session.")
    print("  Exiting the block tears it down. A new block = new session.\n")

    options = ClaudeAgentOptions(model=LOCAL_MODEL, max_turns=1)

    # Session A
    async with ClaudeSDKClient(options=options) as client:
        await client.query("Remember: the secret code is ALPHA-7.")
        await print_response(client, "Session A")

    # Session B — completely fresh, no memory of Session A
    async with ClaudeSDKClient(options=options) as client:
        await client.query("What is the secret code? (New session — you won't know.)")
        await print_response(client, "Session B")

    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    print("=" * 65)
    print("  ClaudeSDKClient — Full Feature Demo")
    print("  Model: gpt-oss via Ollama")
    print("=" * 65)
    print()

    await example_multi_turn()
    await example_append_system_prompt()
    await example_custom_tools()
    await example_hooks()
    await example_interrupt()
    await example_session_lifecycle()

    print("=" * 65)
    print("  Summary")
    print("=" * 65)
    print("""
  ClaudeSDKClient  ✅ Multi-turn memory    (within one `async with` block)
  ClaudeSDKClient  ✅ Append system prompt (extend default, don't replace)
  ClaudeSDKClient  ✅ Custom tools         (@tool + create_sdk_mcp_server)
  ClaudeSDKClient  ✅ Hooks                (PreToolUse, PostToolUse, …)
  ClaudeSDKClient  ✅ interrupt()          (stop agent mid-task)
  ClaudeSDKClient  ✅ Session lifecycle    (one block = one session)
  ClaudeSDKClient  ✅ Everything query() can do, plus all of the above
""")


if __name__ == "__main__":
    anyio.run(main)