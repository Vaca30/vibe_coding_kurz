#!/usr/bin/env python3
"""Collaboration Pattern Implementation.

In this pattern, multiple agents work in a defined sequential order.
Each agent runs in its own isolated session (separate ClaudeSDKClient).
Output from one agent is passed explicitly as input to the next.

Key Characteristics:
- All agents are "equal" (no hierarchy)
- Order of agents is predefined
- Each agent has its own isolated context (separate ClaudeSDKClient)
- Output flows sequentially: Agent 1 → Agent 2 → Agent 3

Usage:
    python 1_collaboration_pattern.py
"""

import anyio

from claude_agent_sdk import (
    AgentDefinition,
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
    TextBlock,
)


class CollaborationGroup:
    """Manages a group of agents working in collaboration pattern.

    Each agent runs in its own isolated ClaudeSDKClient session.
    The output of one agent is passed as context to the next.
    """

    MAX_ITERATIONS = 10

    def __init__(self, agents: list[tuple[str, AgentDefinition]]):
        """Initialize collaboration group.

        Args:
            agents: List of (agent_name, agent_definition) tuples in execution order
        """
        self.agent_names = [name for name, _ in agents]
        self.agent_definitions = {name: defn for name, defn in agents}

    # Structured output schema for agent responses
    RESPONSE_SCHEMA = {
        "type": "object",
        "properties": {
            "resolved": {
                "type": "boolean",
                "description": "True if the task is fully resolved and needs no further processing",
            },
            "content": {
                "type": "string",
                "description": "The agent's contribution or final answer",
            },
        },
        "required": ["resolved", "content"],
        "additionalProperties": False,
    }

    async def execute(self, initial_task: str) -> str:
        """Execute the collaboration pattern with the initial task.

        Agents cycle in predefined order until one returns resolved=true
        or MAX_ITERATIONS is reached.

        Args:
            initial_task: The initial task to process

        Returns:
            Final result from the resolving agent
        """
        context = initial_task
        iteration = 0

        while iteration < self.MAX_ITERATIONS:
            for agent_name in self.agent_names:
                iteration += 1
                if iteration > self.MAX_ITERATIONS:
                    print(f"\n>>> Max iterations ({self.MAX_ITERATIONS}) reached.")
                    return context

                print(f"\n{'='*60}")
                print(f"Agent: {agent_name} (iteration {iteration}/{self.MAX_ITERATIONS})")
                print(f"{'='*60}")

                defn = self.agent_definitions[agent_name]

                # Each agent gets its own isolated session with structured output
                options = ClaudeAgentOptions(
                    system_prompt=defn.prompt,
                    allowed_tools=defn.tools or [],
                    model=defn.model,
                    output_format={
                        "type": "json_schema",
                        "schema": self.RESPONSE_SCHEMA,
                    },
                )

                prompt = f"""You are working as part of a collaboration group.

Your role: {defn.description}

Original task:
{initial_task}

Previous agent output:
{context}

Process this and provide your contribution. Set "resolved" to true if the task
is fully complete and needs no further processing by other agents."""

                structured_result = None
                async with ClaudeSDKClient(options=options) as client:
                    await client.query(prompt)
                    async for msg in client.receive_response():
                        if isinstance(msg, AssistantMessage):
                            for block in msg.content:
                                if isinstance(block, TextBlock):
                                    print(f"{agent_name}: {block.text}")
                        elif isinstance(msg, ResultMessage):
                            if msg.structured_output:
                                structured_result = msg.structured_output
                            if msg.total_cost_usd and msg.total_cost_usd > 0:
                                print(f"\nCost for {agent_name}: ${msg.total_cost_usd:.4f}")

                if structured_result is None:
                    print(f"\nWarning: No structured output from '{agent_name}'")
                    continue

                context = structured_result["content"]

                if structured_result["resolved"]:
                    print(f"\n>>> Agent '{agent_name}' resolved the task. Stopping chain.")
                    return context

        return context


async def demo_software_development():
    """Demonstrate collaboration pattern with software development workflow."""
    print("\n" + "="*80)
    print("COLLABORATION PATTERN DEMO: Software Development Workflow")
    print("="*80)

    agents = [
        ("requirements-analyst", AgentDefinition(
            description="Analyzes requirements and creates technical specifications",
            prompt="You are a requirements analyst. Analyze user requirements and create "
                   "clear technical specifications. Focus on what needs to be built.",
            tools=["Read", "Grep"],
            model="sonnet",
        )),
        ("architect", AgentDefinition(
            description="Designs system architecture and components",
            prompt="You are a software architect. Based on requirements, design the system "
                   "architecture, define components, and specify technologies to use.",
            tools=["Read", "Glob"],
            model="sonnet",
        )),
        ("developer", AgentDefinition(
            description="Implements the solution based on architecture",
            prompt="You are a software developer. Implement the solution based on the "
                   "architecture and requirements. Write clean, maintainable code.",
            tools=["Read", "Write", "Edit"],
            model="sonnet",
        )),
    ]

    group = CollaborationGroup(agents)

    task = """Create a simple REST API for a todo list application.
    The API should support:
    - Creating new todos
    - Listing all todos
    - Marking todos as complete
    - Deleting todos
    """

    result = await group.execute(task)

    print("\n" + "="*80)
    print("FINAL RESULT:")
    print("="*80)
    print(result)


async def main():
    """Run collaboration pattern demonstration."""
    await demo_software_development()


if __name__ == "__main__":
    anyio.run(main)
