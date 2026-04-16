#!/usr/bin/env python3
"""
Single Agent Example (g): Agent with Subagents

Demonstrates using custom agents (subagents) with specialized roles and tools.
Each subagent has its own prompt, tools, and model configuration.
"""

import anyio
from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AgentDefinition,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage,
)


async def example_code_reviewer_agent():
    """Specialized agent for code review."""
    print("=== Example 1: Code Reviewer Subagent ===\n")

    options = ClaudeAgentOptions(
        agents={
            "code-reviewer": AgentDefinition(
                description="Reviews code for best practices and issues",
                prompt=(
                    "You are a code reviewer. Analyze code for bugs, performance issues, "
                    "security vulnerabilities, and adherence to best practices. "
                    "Provide constructive feedback with specific suggestions."
                ),
                tools=["Read", "Grep", "Glob"],
                model="sonnet",
            ),
        },
    )

    async for message in query(
        prompt="Use the code-reviewer agent to review the Python files in the single_agent directory",
        options=options,
    ):
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


async def example_documentation_writer_agent():
    """Specialized agent for writing documentation."""
    print("=== Example 2: Documentation Writer Subagent ===\n")

    options = ClaudeAgentOptions(
        agents={
            "doc-writer": AgentDefinition(
                description="Writes comprehensive technical documentation",
                prompt=(
                    "You are a technical documentation expert. Write clear, comprehensive "
                    "documentation with examples. Focus on clarity, completeness, and proper structure. "
                    "Use markdown formatting."
                ),
                tools=["Read", "Write", "Edit", "Glob"],
                model="sonnet",
            ),
        },
    )

    async for message in query(
        prompt="Use the doc-writer agent to create a brief summary of what the simplest_agent.py example demonstrates",
        options=options,
    ):
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


async def example_test_writer_agent():
    """Specialized agent for writing tests."""
    print("=== Example 3: Test Writer Subagent ===\n")

    options = ClaudeAgentOptions(
        agents={
            "test-writer": AgentDefinition(
                description="Creates comprehensive tests for code",
                prompt=(
                    "You are a testing expert. Write comprehensive tests ensuring code quality. "
                    "Use pytest framework. Include edge cases, error handling, and proper assertions. "
                    "Follow testing best practices."
                ),
                tools=["Read", "Write", "Bash", "Grep"],
                model="sonnet",
            ),
        },
    )

    async for message in query(
        prompt="Use the test-writer agent to explain what tests would be needed for the custom tools example",
        options=options,
    ):
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


async def example_multiple_specialized_agents():
    """Multiple specialized agents working together."""
    print("=== Example 4: Multiple Specialized Subagents ===\n")

    options = ClaudeAgentOptions(
        agents={
            "analyzer": AgentDefinition(
                description="Analyzes code structure and patterns",
                prompt="You are a code analyzer. Examine code structure, patterns, and architecture. Identify design patterns and code organization.",
                tools=["Read", "Grep", "Glob"],
                model="sonnet",
            ),
            "optimizer": AgentDefinition(
                description="Suggests performance optimizations",
                prompt="You are a performance optimization expert. Identify bottlenecks and suggest improvements for speed and efficiency.",
                tools=["Read", "Grep"],
                model="sonnet",
            ),
            "security-auditor": AgentDefinition(
                description="Performs security audits",
                prompt="You are a security auditor. Identify potential security vulnerabilities, unsafe practices, and suggest secure alternatives.",
                tools=["Read", "Grep", "Glob"],
                model="sonnet",
            ),
        },
        setting_sources=["user", "project"],
    )

    async for message in query(
        prompt="Use the analyzer agent to find Python files in single_agent directory and describe their structure",
        options=options,
    ):
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


async def example_hierarchical_agents():
    """Hierarchical agent setup with different capabilities."""
    print("=== Example 5: Hierarchical Subagents ===\n")

    options = ClaudeAgentOptions(
        agents={
            "planner": AgentDefinition(
                description="Plans development tasks",
                prompt="You are a project planner. Break down tasks into steps and create actionable plans.",
                tools=["Read", "Write"],
                model="sonnet",
            ),
            "executor": AgentDefinition(
                description="Executes planned tasks",
                prompt="You are a task executor. Implement plans efficiently and follow instructions precisely.",
                tools=["Read", "Write", "Edit", "Bash"],
                model="sonnet",
            ),
            "reviewer": AgentDefinition(
                description="Reviews completed work",
                prompt="You are a quality reviewer. Check work for completeness, correctness, and quality.",
                tools=["Read", "Grep"],
                model="sonnet",
            ),
        },
    )

    async for message in query(
        prompt="Use the planner agent to create a simple plan for how to organize code examples",
        options=options,
    ):
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
    """Run all subagent examples."""
    await example_code_reviewer_agent()
    await example_documentation_writer_agent()
    await example_test_writer_agent()
    await example_multiple_specialized_agents()
    await example_hierarchical_agents()


if __name__ == "__main__":
    anyio.run(main)
