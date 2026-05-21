#!/usr/bin/env python3
"""Supervisor Pattern Implementation.

In this pattern, a supervisor agent coordinates team members via an
explicit control loop. The supervisor decides which subagent to call
(or to finish), constructs a task for that subagent, collects the
result, and repeats until it has enough information to answer the user.

Key Characteristics:
- Hierarchical structure (supervisor leads)
- Supervisor explicitly chooses which subagent to call next
- Each subagent runs in its own isolated context (separate session)
- Subagents report results back to the supervisor only
- No direct communication between subagents
- Structured output drives the supervisor's decisions

Usage:
    python 2_supervisor_pattern.py
"""

import anyio

from claude_agent_sdk import (
    AgentDefinition,
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
    TextBlock,
    query,
)


class SupervisorTeam:
    """Manages a team of agents under a supervisor with an explicit control loop.

    Each iteration the supervisor returns a structured decision: either
    delegate to a subagent (with a constructed task) or finish with a
    final answer. Subagents never communicate directly with each other.
    """

    MAX_ITERATIONS = 10

    # Supervisor decides: delegate to a subagent or finish
    SUPERVISOR_SCHEMA = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["delegate", "finish"],
                "description": "'delegate' to assign work to a subagent, 'finish' to return the final answer",
            },
            "delegate_to": {
                "type": "string",
                "description": "Name of the subagent to delegate to (required when action is 'delegate')",
            },
            "task": {
                "type": "string",
                "description": "Task description for the subagent (required when action is 'delegate')",
            },
            "answer": {
                "type": "string",
                "description": "Final answer for the user (required when action is 'finish')",
            },
        },
        "required": ["action"],
        "additionalProperties": False,
    }

    def __init__(
        self,
        supervisor_name: str,
        supervisor_definition: AgentDefinition,
        team_agents: dict[str, AgentDefinition],
    ):
        self.supervisor_name = supervisor_name
        self.supervisor_definition = supervisor_definition
        self.team_agents = team_agents

    async def _run_subagent(self, agent_name: str, task: str) -> str:
        """Run a subagent in its own isolated session and return its response."""
        defn = self.team_agents[agent_name]

        options = ClaudeAgentOptions(
            system_prompt=defn.prompt,
            allowed_tools=defn.tools or [],
            model=defn.model,
        )

        prompt = f"""Your role: {defn.description}

Your supervisor has assigned you this task:
{task}

Complete this task and report your findings."""

        print(f"\n{'-'*40}")
        print(f"Subagent: {agent_name}")
        print(f"{'-'*40}")

        response_parts = []
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)
            async for msg in client.receive_response():
                if isinstance(msg, AssistantMessage):
                    for block in msg.content:
                        if isinstance(block, TextBlock):
                            print(f"  {agent_name}: {block.text}")
                            response_parts.append(block.text)
                elif isinstance(msg, ResultMessage):
                    if msg.total_cost_usd and msg.total_cost_usd > 0:
                        print(f"  Cost for {agent_name}: ${msg.total_cost_usd:.4f}")

        return "\n".join(response_parts)

    async def execute(self, initial_task: str) -> str:
        """Execute the supervisor pattern with the initial task.

        The supervisor loops: decide (structured output) → delegate → collect → repeat.
        Ends when the supervisor chooses action='finish' or MAX_ITERATIONS is reached.
        """
        team_info = "\n".join([
            f"- {name}: {defn.description}"
            for name, defn in self.team_agents.items()
        ])

        agent_names_list = ", ".join(self.team_agents.keys())

        # Conversation history the supervisor accumulates
        history = f"""Task to accomplish:
{initial_task}"""

        for iteration in range(1, self.MAX_ITERATIONS + 1):
            print(f"\n{'='*60}")
            print(f"Supervisor: {self.supervisor_name} (iteration {iteration}/{self.MAX_ITERATIONS})")
            print(f"{'='*60}")

            options = ClaudeAgentOptions(
                system_prompt=self.supervisor_definition.prompt,
                allowed_tools=self.supervisor_definition.tools or [],
                model=self.supervisor_definition.model,
                output_format={
                    "type": "json_schema",
                    "schema": self.SUPERVISOR_SCHEMA,
                },
            )

            prompt = f"""You are a supervisor managing a team of specialized agents.

Your responsibility:
{self.supervisor_definition.description}

Your team members (you can delegate to any of them by name):
{team_info}

{history}

Decide your next step:
- "delegate" to assign a task to one of your team members ({agent_names_list})
- "finish" when you have enough information to provide the final answer"""

            structured_result = None
            async for msg in query(prompt=prompt, options=options):
                if isinstance(msg, AssistantMessage):
                    for block in msg.content:
                        if isinstance(block, TextBlock):
                            print(f"Supervisor: {block.text}")
                elif isinstance(msg, ResultMessage):
                    if msg.structured_output:
                        structured_result = msg.structured_output
                    if msg.total_cost_usd and msg.total_cost_usd > 0:
                        print(f"  Supervisor cost: ${msg.total_cost_usd:.4f}")

            if structured_result is None:
                print("Warning: No structured output from supervisor")
                continue

            if structured_result["action"] == "finish":
                answer = structured_result.get("answer", "")
                print(f"\n>>> Supervisor finished after {iteration} iteration(s).")
                return answer

            # Delegate to subagent
            agent_name = structured_result.get("delegate_to", "")
            task = structured_result.get("task", "")

            if agent_name not in self.team_agents:
                history += f"\n\nError: Unknown agent '{agent_name}'. Available: {agent_names_list}"
                continue

            subagent_result = await self._run_subagent(agent_name, task)

            # Append result to history for the supervisor's next iteration
            history += f"\n\nYou delegated to '{agent_name}' with task: {task}\nResult from {agent_name}:\n{subagent_result}"

        print(f"\n>>> Max iterations ({self.MAX_ITERATIONS}) reached.")
        return history


async def demo_software_development():
    """Demonstrate supervisor pattern with a software development team."""
    print("\n" + "="*80)
    print("SUPERVISOR PATTERN DEMO: Software Development Workflow")
    print("="*80)

    supervisor = AgentDefinition(
        description="Technical lead managing development projects and coordinating specialists",
        prompt="You are a technical lead. Break down requirements, delegate to team members, "
               "and ensure quality delivery.",
        tools=["Read", "Grep", "Glob"],
        model="sonnet",
    )

    team = {
        "requirements-analyst": AgentDefinition(
            description="Analyzes requirements and creates technical specifications",
            prompt="You are a requirements analyst. Analyze user requirements and create "
                   "clear technical specifications. Focus on what needs to be built.",
            tools=["Read", "Grep"],
            model="sonnet",
        ),
        "architect": AgentDefinition(
            description="Designs system architecture and components",
            prompt="You are a software architect. Based on requirements, design the system "
                   "architecture, define components, and specify technologies to use.",
            tools=["Read", "Glob"],
            model="sonnet",
        ),
        "developer": AgentDefinition(
            description="Implements the solution based on architecture",
            prompt="You are a software developer. Implement the solution based on the "
                   "architecture and requirements. Write clean, maintainable code.",
            tools=["Read", "Write", "Edit"],
            model="sonnet",
        ),
    }

    supervisor_team = SupervisorTeam("tech-lead", supervisor, team)

    task = """Create a simple REST API for a todo list application.
    The API should support:
    - Creating new todos
    - Listing all todos
    - Marking todos as complete
    - Deleting todos
    """

    result = await supervisor_team.execute(task)

    print("\n" + "="*80)
    print("FINAL RESULT:")
    print("="*80)
    print(result)


async def main():
    """Run supervisor pattern demonstration."""
    await demo_software_development()


if __name__ == "__main__":
    anyio.run(main)
