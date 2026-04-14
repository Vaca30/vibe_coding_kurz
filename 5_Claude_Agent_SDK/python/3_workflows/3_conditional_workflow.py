"""
Conditional Workflow Example - IF/ELSE Logic Pattern

Demonstrates conditional routing based on agent output. The workflow examines
the result from one agent and routes to different subsequent agents based on
conditions. Each agent runs in its own isolated ClaudeSDKClient session.
This is useful for:
- Decision trees
- Adaptive workflows
- Error handling and fallback paths

Pattern:
                  -> Agent B (if condition X)
Agent A -> Router -> Agent C (if condition Y)
                  -> Agent D (otherwise)
"""

import re

import anyio

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
    TextBlock,
)


async def run_agent(name: str, system_prompt: str, prompt: str, print_output: bool = True) -> str:
    """Run a single agent in its own isolated session.

    Args:
        name: Display name for the agent
        system_prompt: System prompt defining the agent's role
        prompt: The task prompt
        print_output: Whether to print the response as it streams

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
                        if print_output:
                            print(block.text, end="", flush=True)
            elif isinstance(msg, ResultMessage):
                if msg.total_cost_usd and msg.total_cost_usd > 0:
                    print(f"\nCost for {name}: ${msg.total_cost_usd:.4f}")

    return result


async def classify_request(user_request: str) -> tuple[str, str]:
    """Classifier agent determines the type of request.

    Returns:
        Tuple of (category, full_response)
    """
    print("=" * 60)
    print("STEP 1: Classification")
    print("=" * 60)

    result = await run_agent(
        name="Classifier",
        system_prompt="""You are a request classifier. Analyze the user's request and categorize it as one of:
- TECHNICAL: Programming, code, technical implementation
- CREATIVE: Writing, storytelling, creative content
- ANALYTICAL: Data analysis, research, investigation
- OTHER: Anything else

Start your response with 'CATEGORY: <category>' on the first line.""",
        prompt=f"Classify this request: {user_request}",
    )

    print("\n")

    # Extract category from response
    category_match = re.search(r"CATEGORY:\s*(\w+)", result, re.IGNORECASE)
    category = category_match.group(1).upper() if category_match else "OTHER"

    return category, result


async def handle_technical(request: str) -> str:
    """Handle technical requests with a specialized technical agent."""
    print("=" * 60)
    print("STEP 2: Technical Handler")
    print("=" * 60)
    print("\nTechnical Response:\n")

    result = await run_agent(
        name="Technical Handler",
        system_prompt="You are a senior software engineer. Provide detailed technical solutions with code examples.",
        prompt=request,
    )

    print("\n")
    return result


async def handle_creative(request: str) -> str:
    """Handle creative requests with a specialized creative agent."""
    print("=" * 60)
    print("STEP 2: Creative Handler")
    print("=" * 60)
    print("\nCreative Response:\n")

    result = await run_agent(
        name="Creative Handler",
        system_prompt="You are a creative writer. Craft engaging, imaginative content with vivid descriptions.",
        prompt=request,
    )

    print("\n")
    return result


async def handle_analytical(request: str) -> str:
    """Handle analytical requests with a specialized analytical agent."""
    print("=" * 60)
    print("STEP 2: Analytical Handler")
    print("=" * 60)
    print("\nAnalytical Response:\n")

    result = await run_agent(
        name="Analytical Handler",
        system_prompt="You are a data analyst. Provide structured analysis with clear reasoning and evidence-based conclusions.",
        prompt=request,
    )

    print("\n")
    return result


async def handle_other(request: str) -> str:
    """Handle general requests with a general-purpose agent."""
    print("=" * 60)
    print("STEP 2: General Handler")
    print("=" * 60)
    print("\nGeneral Response:\n")

    result = await run_agent(
        name="General Handler",
        system_prompt="You are a helpful assistant. Provide clear, comprehensive responses to general queries.",
        prompt=request,
    )

    print("\n")
    return result


async def conditional_workflow(user_request: str):
    """
    Conditional workflow: Route requests to specialized handlers based on classification.

    Flow:
    1. Classify the request
    2. Route to appropriate specialist based on category
    3. Return specialized response
    """

    print("=" * 60)
    print("CONDITIONAL WORKFLOW: Adaptive Request Routing")
    print("=" * 60)
    print(f"\nUser Request: {user_request}\n")

    # Step 1: Classify
    category, classification_result = await classify_request(user_request)

    print(f"Detected Category: {category}")
    print("-" * 60)

    # Step 2: Route based on condition
    if category == "TECHNICAL":
        result = await handle_technical(user_request)
    elif category == "CREATIVE":
        result = await handle_creative(user_request)
    elif category == "ANALYTICAL":
        result = await handle_analytical(user_request)
    else:
        result = await handle_other(user_request)

    print("=" * 60)
    print("Conditional workflow completed!")
    print("=" * 60)

    return result


async def demonstrate_multiple_cases():
    """Run multiple test cases to demonstrate different routing paths."""

    test_cases = [
        "Write a Python function to calculate Fibonacci numbers using dynamic programming",
        "Write a short story about a robot learning to feel emotions",
        "Analyze the pros and cons of remote work versus office work",
        "What is the capital of France?",
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n\n{'#' * 60}")
        print(f"TEST CASE {i}/{len(test_cases)}")
        print(f"{'#' * 60}\n")

        await conditional_workflow(test_case)

        if i < len(test_cases):
            print("\n" + "." * 60)


if __name__ == "__main__":
    # Run all test cases
    anyio.run(demonstrate_multiple_cases)

    # Or run a single request:
    # anyio.run(conditional_workflow, "Your request here")
