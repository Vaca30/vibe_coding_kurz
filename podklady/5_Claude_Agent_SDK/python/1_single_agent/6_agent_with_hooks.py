#!/usr/bin/env python3
"""
Single Agent Example (f): Agent with Hooks

Demonstrates using hooks to intercept and modify agent behavior:
- PreToolUse: Validate or block tool usage before execution
- PostToolUse: Process tool results after execution
- UserPromptSubmit: Add context when user submits a prompt
"""

import anyio
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    HookMatcher,
    AssistantMessage,
    TextBlock,
    ResultMessage,
)
from claude_agent_sdk.types import HookInput, HookContext, HookJSONOutput


# Hook callbacks
async def safety_check_hook(
    input_data: HookInput, tool_use_id: str | None, context: HookContext
) -> HookJSONOutput:
    """PreToolUse hook - validate tool usage before execution."""
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Block dangerous commands
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        dangerous_patterns = ["rm -rf", "delete", "format"]

        for pattern in dangerous_patterns:
            if pattern in command.lower():
                print(f"[HOOK] 🚫 Blocked dangerous command: {command}\n")
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"Command contains dangerous pattern: {pattern}",
                    }
                }

    # Allow safe commands
    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "permissionDecisionReason": "Tool usage approved",
        }
    }


async def logging_hook(
    input_data: HookInput, tool_use_id: str | None, context: HookContext
) -> HookJSONOutput:
    """PostToolUse hook - log tool execution results."""
    tool_name = input_data.get("tool_name", "")
    tool_response = input_data.get("tool_response", "")

    print(f"[HOOK] 📝 Tool '{tool_name}' executed")

    # Check for errors in tool output
    if "error" in str(tool_response).lower():
        print(f"[HOOK] ⚠️ Tool execution had errors\n")
        return {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": "The tool encountered an error. Consider alternative approaches.",
            }
        }

    print(f"[HOOK] ✅ Tool execution successful\n")
    return {}


async def context_injection_hook(
    input_data: HookInput, tool_use_id: str | None, context: HookContext
) -> HookJSONOutput:
    """UserPromptSubmit hook - inject additional context."""
    print("[HOOK] 💬 Adding context: User prefers concise responses\n")
    return {
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": "Keep responses concise and to the point.",
        }
    }


async def example_pretooluse_hook():
    """Example: PreToolUse hook for safety validation."""
    print("=== Example 1: PreToolUse Hook (Safety Validation) ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Bash"],
        hooks={
            "PreToolUse": [
                HookMatcher(matcher="Bash", hooks=[safety_check_hook]),
            ],
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        # Test 1: Safe command
        print("Test 1: Safe command")
        print("User: Run command: echo 'Hello World'\n")
        await client.query("Run this bash command: echo 'Hello World'")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"\nCost: ${message.total_cost_usd:.4f}\n")

        # Test 2: Dangerous command (will be blocked)
        print("Test 2: Dangerous command (should be blocked)")
        print("User: Run command: rm -rf /tmp/test\n")
        await client.query("Run this bash command: rm -rf /tmp/test")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"\nCost: ${message.total_cost_usd:.4f}\n")

    print("\n")


async def example_posttooluse_hook():
    """Example: PostToolUse hook for logging and error handling."""
    print("=== Example 2: PostToolUse Hook (Logging) ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Bash"],
        hooks={
            "PostToolUse": [
                HookMatcher(matcher="Bash", hooks=[logging_hook]),
            ],
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        print("User: List files in current directory\n")
        await client.query("List files in the current directory using ls")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"\nCost: ${message.total_cost_usd:.4f}\n")

    print("\n")


async def example_userpromptsubmit_hook():
    """Example: UserPromptSubmit hook for context injection."""
    print("=== Example 3: UserPromptSubmit Hook (Context Injection) ===\n")

    options = ClaudeAgentOptions(
        hooks={
            "UserPromptSubmit": [
                HookMatcher(matcher=None, hooks=[context_injection_hook]),
            ],
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        print("User: Explain async programming\n")
        await client.query("Explain async programming in Python")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"\nCost: ${message.total_cost_usd:.4f}\n")

    print("\n")


async def example_multiple_hooks():
    """Example: Multiple hooks working together."""
    print("=== Example 4: Multiple Hooks ===\n")

    options = ClaudeAgentOptions(
        allowed_tools=["Bash"],
        hooks={
            "PreToolUse": [
                HookMatcher(matcher="Bash", hooks=[safety_check_hook]),
            ],
            "PostToolUse": [
                HookMatcher(matcher="Bash", hooks=[logging_hook]),
            ],
            "UserPromptSubmit": [
                HookMatcher(matcher=None, hooks=[context_injection_hook]),
            ],
        },
    )

    async with ClaudeSDKClient(options=options) as client:
        print("User: Show me the current directory path\n")
        await client.query("Show me the current directory path using pwd command")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
            elif isinstance(message, ResultMessage):
                if message.total_cost_usd and message.total_cost_usd > 0:
                    print(f"\nCost: ${message.total_cost_usd:.4f}\n")

    print("\n")


async def main():
    """Run all hook examples."""
    await example_pretooluse_hook()
    await example_posttooluse_hook()
    await example_userpromptsubmit_hook()
    await example_multiple_hooks()


if __name__ == "__main__":
    anyio.run(main)
