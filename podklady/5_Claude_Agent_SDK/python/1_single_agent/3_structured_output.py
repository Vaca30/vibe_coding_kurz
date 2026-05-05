#!/usr/bin/env python3
"""
Single Agent Example: Structured Output

Demonstrates using structured output with JSON Schema
to get typed, validated responses from the agent.
"""

import anyio
from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ResultMessage,
)


async def example_plain_json_schema():
    print("=== Example 1: Plain JSON Schema ===\n")

    # { summary: string; status: "ok" | "action_required" }
    schema = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "status": {"type": "string", "enum": ["ok", "action_required"]},
        },
        "required": ["summary", "status"],
        "additionalProperties": False,
    }

    options = ClaudeAgentOptions(
        max_turns=3,
        output_format={"type": "json_schema", "schema": schema},
    )

    async for message in query(prompt="Summarize the current directory status", options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"  Claude: {block.text}")
        elif isinstance(message, ResultMessage):
            if message.structured_output:
                print("\nStructured output:")
                print(f"  Summary: {message.structured_output.get('summary')}")
                print(f"  Status: {message.structured_output.get('status')}")
            if message.total_cost_usd and message.total_cost_usd > 0:
                print(f"\nCost: ${message.total_cost_usd:.4f}")

    print()


async def example_multi_field_schema():
    print("=== Example 2: Multi-Field Structured Output ===\n")

    # {
    #   title: string;
    #   priority: "low" | "medium" | "high";
    #   estimated_hours: number;
    #   tags: string[];
    # }
    todo_schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "priority": {"type": "string", "enum": ["low", "medium", "high"]},
            "estimated_hours": {"type": "number"},
            "tags": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["title", "priority", "estimated_hours", "tags"],
        "additionalProperties": False,
    }

    options = ClaudeAgentOptions(
        max_turns=1,
        output_format={"type": "json_schema", "schema": todo_schema},
    )

    async for message in query(
        prompt="Create a todo item for adding unit tests to a TypeScript project",
        options=options,
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"  Claude: {block.text}")
        elif isinstance(message, ResultMessage):
            if message.structured_output:
                todo = message.structured_output
                print("\nStructured todo:")
                print(f"  Title: {todo.get('title')}")
                print(f"  Priority: {todo.get('priority')}")
                print(f"  Estimated hours: {todo.get('estimated_hours')}")
                print(f"  Tags: {', '.join(todo.get('tags', []))}")
            if message.total_cost_usd and message.total_cost_usd > 0:
                print(f"\nCost: ${message.total_cost_usd:.4f}")

    print()


async def example_nested_schema():
    print("=== Example 3: Nested Structured Output ===\n")

    analysis_schema = {
        "type": "object",
        "properties": {
            "analysis": {
                "type": "object",
                "properties": {
                    "word_count": {"type": "number"},
                    "character_count": {"type": "number"},
                },
                "required": ["word_count", "character_count"],
            },
            "words": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": ["analysis", "words"],
        "additionalProperties": False,
    }

    options = ClaudeAgentOptions(
        max_turns=1,
        output_format={"type": "json_schema", "schema": analysis_schema},
    )

    async for message in query(
        prompt="Analyze this text: 'Hello world'. Provide word count, character count, and list of words.",
        options=options,
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(f"  Claude: {block.text}")
        elif isinstance(message, ResultMessage):
            if message.structured_output:
                output = message.structured_output
                print("\nStructured analysis:")
                print(f"  Word count: {output['analysis']['word_count']}")
                print(f"  Character count: {output['analysis']['character_count']}")
                print(f"  Words: {', '.join(output['words'])}")
            if message.total_cost_usd and message.total_cost_usd > 0:
                print(f"\nCost: ${message.total_cost_usd:.4f}")

    print()


async def main():
    await example_plain_json_schema()
    await example_multi_field_schema()
    await example_nested_schema()


if __name__ == "__main__":
    anyio.run(main)
