#!/usr/bin/env python3
"""Swarm Pattern Implementation.

In this pattern, each agent has defined "handoffs" specifying which agents
they can pass work to. Each agent runs in its own isolated session.
Agents are equal (no hierarchy). Each agent can either finish the loop
and return an answer, or hand off to one of its allowed next agents.

The next agent receives the original task plus the full history of
responses from all previous agents.

Key Characteristics:
- All agents are "equal" (no hierarchy)
- No specific order of agents (unlike collaboration)
- Only the first agent is defined as the entry point
- Each agent has a handoff list of possible next agents
- Each agent runs in its own isolated ClaudeSDKClient session
- Structured output drives handoff decisions

Usage:
    python 3_swarm_pattern.py
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


class SwarmAgent:
    """Represents an agent in the swarm with its handoffs."""

    def __init__(
        self, name: str, definition: AgentDefinition, handoffs: list[str] | None = None
    ):
        self.name = name
        self.definition = definition
        self.handoffs = handoffs or []


class Swarm:
    """Manages a swarm of agents with dynamic handoffs.

    Each agent runs in its own isolated ClaudeSDKClient session.
    Structured output controls whether an agent finishes or hands off.
    The next agent receives the original task plus full conversation history.
    """

    MAX_HANDOFFS = 10

    # Structured output schema for agent decisions
    RESPONSE_SCHEMA = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["handoff", "finish"],
                "description": "'handoff' to pass work to another agent, 'finish' to return the final answer",
            },
            "handoff_to": {
                "type": "string",
                "description": "Name of the agent to hand off to (required when action is 'handoff')",
            },
            "content": {
                "type": "string",
                "description": "The agent's contribution (always required — either intermediate work or final answer)",
            },
        },
        "required": ["action", "content"],
        "additionalProperties": False,
    }

    def __init__(
        self,
        agents: dict[str, SwarmAgent],
        initial_agent: str,
    ):
        self.agents = agents
        self.initial_agent = initial_agent

    async def execute(self, initial_task: str) -> str:
        """Execute the swarm pattern with the initial task.

        Loops until an agent returns action='finish' or MAX_HANDOFFS is reached.
        Each agent receives the original task + full history of all previous responses.
        """
        current_agent = self.initial_agent
        history: list[dict[str, str]] = []

        for handoff_count in range(self.MAX_HANDOFFS):
            agent = self.agents[current_agent]

            print(f"\n{'='*60}")
            print(f"Current Agent: {current_agent} (handoff {handoff_count}/{self.MAX_HANDOFFS})")
            print(f"{'='*60}")

            # Build handoff information
            if agent.handoffs:
                handoff_info = "\n".join(
                    f"- {name}: {self.agents[name].definition.description}"
                    for name in agent.handoffs
                )
            else:
                handoff_info = "None — you must finish and provide the final answer"

            # Build history section
            if history:
                history_text = "\n\n".join(
                    f"[{entry['agent']}]: {entry['content']}"
                    for entry in history
                )
            else:
                history_text = "(none — you are the first agent)"

            options = ClaudeAgentOptions(
                system_prompt=agent.definition.prompt,
                allowed_tools=agent.definition.tools or [],
                model=agent.definition.model,
                output_format={
                    "type": "json_schema",
                    "schema": self.RESPONSE_SCHEMA,
                },
            )

            handoff_names = ", ".join(agent.handoffs) if agent.handoffs else "none"

            prompt = f"""You are {current_agent}, working in a swarm of collaborative agents.

Your role: {agent.definition.description}

Original task:
{initial_task}

Previous agent responses:
{history_text}

Agents you can hand off to: {handoff_names}
{handoff_info}

Process the task and decide:
- Set action to "handoff" and specify "handoff_to" to pass work to another agent
- Set action to "finish" when the task is fully resolved
Always include your contribution in "content"."""

            structured_result = None
            async with ClaudeSDKClient(options=options) as client:
                await client.query(prompt)
                async for msg in client.receive_response():
                    if isinstance(msg, AssistantMessage):
                        for block in msg.content:
                            if isinstance(block, TextBlock):
                                print(f"  {current_agent}: {block.text}")
                    elif isinstance(msg, ResultMessage):
                        if msg.structured_output:
                            structured_result = msg.structured_output
                        if msg.total_cost_usd and msg.total_cost_usd > 0:
                            print(f"  Cost for {current_agent}: ${msg.total_cost_usd:.4f}")

            if structured_result is None:
                print(f"  Warning: No structured output from '{current_agent}'")
                continue

            # Record this agent's contribution in history
            history.append({
                "agent": current_agent,
                "content": structured_result["content"],
            })

            if structured_result["action"] == "finish":
                print(f"\n>>> Agent '{current_agent}' finished the task.")
                return structured_result["content"]

            # Hand off to next agent
            next_agent = structured_result.get("handoff_to", "")

            if next_agent not in agent.handoffs:
                print(f"  Warning: '{next_agent}' is not in {current_agent}'s handoff list {agent.handoffs}")
                continue

            print(f"  >>> Handing off to '{next_agent}'")
            current_agent = next_agent

        print(f"\n>>> Max handoffs ({self.MAX_HANDOFFS}) reached.")
        return history[-1]["content"] if history else ""


async def demo_software_development():
    """Demonstrate swarm pattern with software development workflow."""
    print("\n" + "=" * 80)
    print("SWARM PATTERN DEMO: Software Development Workflow")
    print("=" * 80)

    agents = {
        "requirements-analyst": SwarmAgent(
            name="requirements-analyst",
            definition=AgentDefinition(
                description="Analyzes requirements and creates technical specifications",
                prompt="You are a requirements analyst. Analyze user requirements and create "
                       "clear technical specifications. Focus on what needs to be built.",
                tools=["Read", "Grep"],
                model="sonnet",
            ),
            handoffs=["architect"],
        ),
        "architect": SwarmAgent(
            name="architect",
            definition=AgentDefinition(
                description="Designs system architecture and components",
                prompt="You are a software architect. Based on requirements, design the system "
                       "architecture, define components, and specify technologies to use.",
                tools=["Read", "Glob"],
                model="sonnet",
            ),
            handoffs=["developer", "requirements-analyst"],
        ),
        "developer": SwarmAgent(
            name="developer",
            definition=AgentDefinition(
                description="Implements the solution based on architecture",
                prompt="You are a software developer. Implement the solution based on the "
                       "architecture and requirements. Write clean, maintainable code.",
                tools=["Read", "Write", "Edit"],
                model="sonnet",
            ),
            handoffs=["architect"],
        ),
    }

    swarm = Swarm(agents, initial_agent="requirements-analyst")

    task = """Create a simple REST API for a todo list application.
    The API should support:
    - Creating new todos
    - Listing all todos
    - Marking todos as complete
    - Deleting todos
    """

    result = await swarm.execute(task)

    print("\n" + "=" * 80)
    print("FINAL RESULT:")
    print("=" * 80)
    print(result)


async def main():
    """Run swarm pattern demonstration."""
    await demo_software_development()


if __name__ == "__main__":
    anyio.run(main)
