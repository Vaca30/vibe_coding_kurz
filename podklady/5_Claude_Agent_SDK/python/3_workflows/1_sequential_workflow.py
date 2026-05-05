"""
Sequential Workflow Example - Agent Chain Pattern

Demonstrates a multi-step sequential workflow where the output of one agent
becomes the input to the next agent. Each agent runs in its own isolated
ClaudeSDKClient session. This is useful for:
- Data processing pipelines
- Multi-stage analysis
- Progressive refinement tasks

Pattern: Agent A -> Agent B -> Agent C
"""

import anyio

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
    TextBlock,
)


async def run_agent(name: str, system_prompt: str, prompt: str) -> str:
    """Run a single agent in its own isolated session.

    Args:
        name: Display name for the agent
        system_prompt: System prompt defining the agent's role
        prompt: The task prompt

    Returns:
        The agent's text response
    """
    options = ClaudeAgentOptions(
        model="sonnet",
        system_prompt=system_prompt,
    )

    result = ""
    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)
        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        result += block.text
                        print(block.text, end="", flush=True)
            elif isinstance(msg, ResultMessage):
                if msg.total_cost_usd and msg.total_cost_usd > 0:
                    print(f"\nCost for {name}: ${msg.total_cost_usd:.4f}")

    return result


async def sequential_workflow():
    """
    Sequential workflow: Research -> Analyze -> Summarize

    Step 1: Research agent gathers information about a topic
    Step 2: Analysis agent examines the research findings
    Step 3: Summary agent creates a concise final report
    """

    topic = "Benefits of Python's asyncio for concurrent programming"

    # Step 1: Research Agent
    print("=" * 60)
    print("STEP 1: Research Phase")
    print("=" * 60)

    research_findings = await run_agent(
        name="Research Agent",
        system_prompt="You are a research assistant. Gather key information about the topic and provide detailed findings.",
        prompt=f"Research the following topic and provide 3-5 key points: {topic}",
    )

    print("\n")

    # Step 2: Analysis Agent
    print("=" * 60)
    print("STEP 2: Analysis Phase")
    print("=" * 60)

    analysis_results = await run_agent(
        name="Analysis Agent",
        system_prompt="You are an analytical expert. Examine the research findings and identify strengths, weaknesses, and practical implications.",
        prompt=f"Analyze these research findings and provide critical insights:\n\n{research_findings}",
    )

    print("\n")

    # Step 3: Summary Agent
    print("=" * 60)
    print("STEP 3: Summary Phase")
    print("=" * 60)

    print("\nFinal Summary:\n")
    summary = await run_agent(
        name="Summary Agent",
        system_prompt="You are a summarization specialist. Create concise, actionable summaries suitable for executive review.",
        prompt=f"Create a concise executive summary based on this analysis:\n\n{analysis_results}",
    )

    print("\n")
    print("=" * 60)
    print("Sequential workflow completed!")
    print("=" * 60)


if __name__ == "__main__":
    anyio.run(sequential_workflow)
