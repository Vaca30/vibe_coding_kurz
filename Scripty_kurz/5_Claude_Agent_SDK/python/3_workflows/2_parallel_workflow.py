"""
Parallel Workflow Example - Fan-Out/Fan-In Pattern

Demonstrates parallel execution of multiple agents working on different aspects
of the same problem simultaneously, then combining their results. Each agent
runs in its own isolated ClaudeSDKClient session. This is useful for:
- Multi-perspective analysis
- Parallel data processing
- Concurrent research tasks

Pattern:
         -> Agent A ->
Input -> -> Agent B -> -> Aggregator
         -> Agent C ->
"""

import anyio

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
    TextBlock,
)


async def run_specialist_agent(
    name: str, specialty: str, prompt: str
) -> tuple[str, str]:
    """Run a specialist agent in its own isolated session.

    Args:
        name: Agent identifier
        specialty: Agent's area of expertise
        prompt: Task prompt

    Returns:
        Tuple of (agent_name, response_text)
    """
    print(f"[{name}] Starting analysis...")

    options = ClaudeAgentOptions(
        model="sonnet",
        system_prompt=f"You are a {specialty} specialist. Provide focused insights from your expertise area.",
    )

    result = ""
    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)
        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        result += block.text
            elif isinstance(msg, ResultMessage):
                if msg.total_cost_usd and msg.total_cost_usd > 0:
                    print(f"[{name}] Cost: ${msg.total_cost_usd:.4f}")

    print(f"[{name}] Completed analysis")
    return name, result


async def parallel_workflow():
    """
    Parallel workflow: Multiple specialists analyze the same topic simultaneously,
    then an aggregator combines their insights.

    Fan-Out: Distribute work to specialist agents
    Fan-In: Collect and synthesize results
    """

    print("=" * 60)
    print("PARALLEL WORKFLOW: Multi-Perspective Analysis")
    print("=" * 60)

    topic = "Impact of artificial intelligence on software development"

    specialists = [
        {
            "name": "Technical Specialist",
            "specialty": "software architecture and technical implementation",
            "prompt": f"From a technical perspective, analyze: {topic}. Focus on implementation details, tools, and technical challenges.",
        },
        {
            "name": "Business Specialist",
            "specialty": "business strategy and market analysis",
            "prompt": f"From a business perspective, analyze: {topic}. Focus on ROI, market opportunities, and business impact.",
        },
        {
            "name": "Security Specialist",
            "specialty": "cybersecurity and risk management",
            "prompt": f"From a security perspective, analyze: {topic}. Focus on security implications, risks, and mitigation strategies.",
        },
        {
            "name": "UX Specialist",
            "specialty": "user experience and human factors",
            "prompt": f"From a user experience perspective, analyze: {topic}. Focus on developer experience, usability, and adoption challenges.",
        },
    ]

    print(f"\nTopic: {topic}\n")
    print("PHASE 1: Fan-Out - Parallel Analysis")
    print("-" * 60)

    # Fan-Out: Execute all specialist agents in parallel
    results: list[tuple[str, str]] = []

    async with anyio.create_task_group() as tg:
        async def run_and_collect(spec: dict) -> None:
            result = await run_specialist_agent(
                spec["name"], spec["specialty"], spec["prompt"]
            )
            results.append(result)

        for spec in specialists:
            tg.start_soon(run_and_collect, spec)

    print("\nPHASE 2: Fan-In - Synthesis")
    print("-" * 60)

    # Fan-In: Aggregate results
    print("\nCollected insights from all specialists:\n")
    aggregated_input = ""
    for name, result in results:
        print(f"### {name}:")
        print(f"{result[:200]}..." if len(result) > 200 else result)
        print()
        aggregated_input += f"\n\n### {name} Insights:\n{result}"

    # Synthesis Agent
    print("\nPHASE 3: Final Synthesis")
    print("-" * 60)

    synthesis_prompt = f"""
    Synthesize the following specialist analyses into a comprehensive report:
    {aggregated_input}

    Create a unified analysis that:
    1. Identifies common themes across perspectives
    2. Highlights areas of agreement and disagreement
    3. Provides balanced recommendations
    """

    options = ClaudeAgentOptions(
        model="sonnet",
        system_prompt="You are a synthesis expert. Combine multiple perspectives into a coherent, comprehensive analysis highlighting key themes and conflicts.",
    )

    print("\nFinal Synthesized Report:\n")
    async with ClaudeSDKClient(options=options) as client:
        await client.query(synthesis_prompt)
        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        print(block.text, end="", flush=True)
            elif isinstance(msg, ResultMessage):
                if msg.total_cost_usd and msg.total_cost_usd > 0:
                    print(f"\nCost for synthesis: ${msg.total_cost_usd:.4f}")

    print("\n")
    print("=" * 60)
    print("Parallel workflow completed!")
    print("=" * 60)


if __name__ == "__main__":
    anyio.run(parallel_workflow)
