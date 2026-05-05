# Claude Agent SDK Hooks Guide

## Available Hook Events

Hooks allow you to intercept and modify Claude Code behavior at specific points in the execution flow.

### Hook Event Types

| Hook Event           | When It Fires                | Use Cases                                               |
| -------------------- | ---------------------------- | ------------------------------------------------------- |
| **PreToolUse**       | Before a tool is executed    | Block dangerous commands, add validation, modify inputs |
| **PostToolUse**      | After a tool executes        | Review outputs, add context, handle errors              |
| **UserPromptSubmit** | When user submits a prompt   | Add custom instructions, inject context                 |
| **Stop**             | When execution stops         | Cleanup, logging, notifications                         |
| **SubagentStop**     | When a subagent stops        | Subagent lifecycle management                           |
| **PreCompact**       | Before transcript compaction | Save history, customize compaction                      |

## Hook Configuration

### Basic Structure

```python
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
from claude_agent_sdk.types import HookMatcher, HookInput, HookContext, HookJSONOutput

# Define your hook callback
async def my_hook(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext
) -> HookJSONOutput:
    # Your logic here
    return {}

# Configure hooks in options
options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(
                matcher="Bash",  # Optional: filter by tool name
                hooks=[my_hook]   # List of callback functions
            ),
        ],
    }
)

# Use with ClaudeSDKClient (required for hooks!)
async with ClaudeSDKClient(options=options) as client:
    await client.query("Your prompt here")
    async for msg in client.receive_response():
        print(msg)
```

## Hook Input Data

Each hook event receives different input data:

### PreToolUseHookInput

```python
{
    "hook_event_name": "PreToolUse",
    "tool_name": str,          # e.g., "Bash", "Write", "Read"
    "tool_input": dict,        # Tool's input parameters
    "session_id": str,
    "transcript_path": str,
    "cwd": str,
    "permission_mode": str,    # Optional
}
```

### PostToolUseHookInput

```python
{
    "hook_event_name": "PostToolUse",
    "tool_name": str,
    "tool_input": dict,
    "tool_response": Any,      # Tool's output
    "session_id": str,
    "transcript_path": str,
    "cwd": str,
}
```

### UserPromptSubmitHookInput

```python
{
    "hook_event_name": "UserPromptSubmit",
    "prompt": str,             # The user's prompt
    "session_id": str,
    "transcript_path": str,
    "cwd": str,
}
```

### StopHookInput

```python
{
    "hook_event_name": "Stop",
    "stop_hook_active": bool,
    "session_id": str,
    "transcript_path": str,
    "cwd": str,
}
```

### SubagentStopHookInput

```python
{
    "hook_event_name": "SubagentStop",
    "stop_hook_active": bool,
    "session_id": str,
    "transcript_path": str,
    "cwd": str,
}
```

### PreCompactHookInput

```python
{
    "hook_event_name": "PreCompact",
    "trigger": "manual" | "auto",
    "custom_instructions": str | None,
    "session_id": str,
    "transcript_path": str,
    "cwd": str,
}
```

## Hook Output Fields

Your hook callback can return various fields to control execution:

### Control Execution

```python
{
    "continue_": True,         # Continue or stop execution (use False to stop)
    "stopReason": "...",       # Reason for stopping (when continue_=False)
}
```

### Permission Control (PreToolUse only)

```python
{
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow" | "deny",
        "permissionDecisionReason": "Explanation for the decision",
    }
}
```

### Add Context/Messages

```python
{
    "reason": "Explanation visible to developer",
    "systemMessage": "Message shown to Claude",
    "hookSpecificOutput": {
        "hookEventName": "...",
        "additionalContext": "Context added to conversation",
    }
}
```

### UserPromptSubmit Output

```python
{
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": "Custom instructions or context",
    }
}
```

### PostToolUse Output

```python
{
    "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": "Additional context about tool output",
    }
}
```

## Practical Examples

### 1. Block Dangerous Commands (PreToolUse)

```python
async def block_dangerous_commands(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext
) -> HookJSONOutput:
    """Block rm -rf and other dangerous commands."""
    if input_data["tool_name"] != "Bash":
        return {}

    command = input_data["tool_input"].get("command", "")
    dangerous_patterns = ["rm -rf", "dd if=", "mkfs", "> /dev/"]

    for pattern in dangerous_patterns:
        if pattern in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Command contains dangerous pattern: {pattern}",
                },
                "systemMessage": f"🚫 Blocked dangerous command: {pattern}",
                "reason": "Security policy prevents potentially destructive operations",
            }

    return {}

# Configure
options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[block_dangerous_commands])
        ]
    }
)
```

### 2. Add Custom Context (UserPromptSubmit)

```python
async def add_project_context(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext
) -> HookJSONOutput:
    """Add project-specific context to every prompt."""
    return {
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": (
                "Project: E-commerce Platform\n"
                "Tech Stack: Python, FastAPI, PostgreSQL\n"
                "Code Style: Follow PEP 8, use type hints\n"
            ),
        }
    }

options = ClaudeAgentOptions(
    hooks={
        "UserPromptSubmit": [
            HookMatcher(matcher=None, hooks=[add_project_context])
        ]
    }
)
```

### 3. Log Tool Usage (PostToolUse)

```python
import logging
logger = logging.getLogger(__name__)

async def log_tool_usage(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext
) -> HookJSONOutput:
    """Log all tool executions for auditing."""
    tool_name = input_data["tool_name"]
    tool_input = input_data["tool_input"]
    tool_response = input_data.get("tool_response")

    logger.info(f"Tool: {tool_name}")
    logger.info(f"Input: {tool_input}")
    logger.info(f"Output: {tool_response}")

    return {}

options = ClaudeAgentOptions(
    hooks={
        "PostToolUse": [
            HookMatcher(matcher=None, hooks=[log_tool_usage])  # Log all tools
        ]
    }
)
```

### 4. Stop on Error (PostToolUse)

```python
async def stop_on_critical_error(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext
) -> HookJSONOutput:
    """Stop execution if a critical error occurs."""
    tool_response = str(input_data.get("tool_response", ""))

    if "CRITICAL" in tool_response or "FATAL" in tool_response:
        return {
            "continue_": False,
            "stopReason": "Critical error detected in tool output",
            "systemMessage": "🛑 Execution halted due to critical error",
        }

    return {"continue_": True}

options = ClaudeAgentOptions(
    hooks={
        "PostToolUse": [
            HookMatcher(matcher=None, hooks=[stop_on_critical_error])
        ]
    }
)
```

### 5. Validate File Writes (PreToolUse)

```python
async def validate_file_writes(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext
) -> HookJSONOutput:
    """Prevent writes to protected directories."""
    if input_data["tool_name"] not in ["Write", "Edit"]:
        return {}

    file_path = input_data["tool_input"].get("file_path", "")
    protected_dirs = ["/etc/", "/usr/", "/sys/", "/boot/"]

    for protected in protected_dirs:
        if file_path.startswith(protected):
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Writes to {protected} are not allowed",
                },
                "systemMessage": f"🔒 Protected directory: {protected}",
            }

    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "permissionDecisionReason": "File path validated",
        }
    }

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Write|Edit", hooks=[validate_file_writes])
        ]
    }
)
```

### 6. Multiple Hooks on Same Event

```python
async def hook1(input_data, tool_use_id, context):
    print("Hook 1 executed")
    return {}

async def hook2(input_data, tool_use_id, context):
    print("Hook 2 executed")
    return {}

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[hook1, hook2])  # Both execute
        ]
    }
)
```

### 7. Multiple Matchers for Same Event

```python
options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[check_bash_commands]),
            HookMatcher(matcher="Write", hooks=[validate_writes]),
            HookMatcher(matcher=None, hooks=[log_all_tools]),  # Catches everything
        ]
    }
)
```

## Matcher Patterns

The `matcher` field in `HookMatcher` filters which tools trigger the hook:

```python
matcher="Bash"           # Only Bash tool
matcher="Write|Edit"     # Write OR Edit tools (regex pattern)
matcher="Bash.*"         # Bash and any tool starting with "Bash"
matcher=None             # All tools (no filtering)
```

## Important Notes

### 1. Requires ClaudeSDKClient

**Hooks only work with `ClaudeSDKClient`, not with `query()`!**

```python
# ❌ Won't work
async for msg in query(prompt="...", options=options_with_hooks):
    ...

# ✅ Works
async with ClaudeSDKClient(options=options_with_hooks) as client:
    await client.query("...")
    async for msg in client.receive_response():
        ...
```

### 2. Async Callbacks Required

Hook callbacks must be `async def` functions.

### 3. Field Name: continue\_

Use `continue_` (with underscore) in Python to avoid keyword conflict:

```python
return {"continue_": False}  # ✅ Correct
return {"continue": False}   # ❌ Syntax error
```

### 4. Hook Execution Order

- Multiple hooks on the same matcher execute in list order
- Multiple matchers for the same event execute in list order
- If any hook returns `continue_=False`, execution stops

### 5. Permission Decisions

- `permissionDecision: "deny"` blocks the tool immediately
- `permissionDecision: "allow"` explicitly approves it
- Omitting `permissionDecision` lets normal permission logic apply

## Complete Working Example

```python
import asyncio
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
from claude_agent_sdk.types import HookMatcher, HookInput, HookContext, HookJSONOutput

async def safety_hook(
    input_data: HookInput,
    tool_use_id: str | None,
    context: HookContext
) -> HookJSONOutput:
    """Comprehensive safety hook."""
    tool_name = input_data["tool_name"]
    tool_input = input_data["tool_input"]

    # Block dangerous bash commands
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        if "rm -rf" in command:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "Dangerous command blocked",
                },
                "systemMessage": "🚫 Cannot execute rm -rf",
            }

    # Warn about writes to config files
    if tool_name in ["Write", "Edit"]:
        file_path = tool_input.get("file_path", "")
        if file_path.endswith(".conf") or file_path.endswith(".config"):
            return {
                "systemMessage": "⚠️ Modifying configuration file - be careful!",
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "additionalContext": "This is a configuration file. Changes may affect system behavior.",
                }
            }

    return {}

async def main():
    options = ClaudeAgentOptions(
        hooks={
            "PreToolUse": [
                HookMatcher(matcher=None, hooks=[safety_hook])
            ]
        }
    )

    async with ClaudeSDKClient(options=options) as client:
        await client.query("List files in current directory")
        async for msg in client.receive_response():
            print(msg)

if __name__ == "__main__":
    asyncio.run(main())
```

## See Also

- `examples/hooks.py` - Comprehensive examples of all hook types
- `examples/plugin_example.py` - Plugin-based hooks (alternative approach)
- Official docs: https://docs.anthropic.com/en/docs/claude-code/hooks

## Summary

Hooks provide powerful control over Claude Code's behavior:

- **PreToolUse**: Validate, block, or modify tool calls
- **PostToolUse**: Review outputs, add context, handle errors
- **UserPromptSubmit**: Inject custom instructions
- **Stop/SubagentStop**: Lifecycle management
- **PreCompact**: Control transcript compaction

Use them to enforce security policies, add context, implement logging, or customize Claude's behavior for your specific use case!
