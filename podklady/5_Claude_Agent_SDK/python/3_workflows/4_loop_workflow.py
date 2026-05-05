"""
Loop Workflow Example - Iterative Refinement Pattern

Demonstrates iterative workflows where an agent repeatedly processes and refines
output until a condition is met. Each agent invocation runs in its own isolated
ClaudeSDKClient session. This is useful for:
- Iterative improvement
- Quality checking and refinement
- Convergence-based processes

Pattern:
Input -> Agent -> Check -> (if not done) -> Agent -> Check -> ... -> Output
                   |
                   +-> (if done) -> Output
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
            elif isinstance(msg, ResultMessage):
                if msg.total_cost_usd and msg.total_cost_usd > 0:
                    print(f"  Cost for {name}: ${msg.total_cost_usd:.4f}")

    return result


async def generate_content(prompt: str, iteration: int) -> str:
    """Content generator agent creates or refines content."""
    print(f"\n[Iteration {iteration}] Generating content...")

    result = await run_agent(
        name=f"Generator (iter {iteration})",
        system_prompt="You are a content creator. Generate clear, engaging content based on the requirements provided.",
        prompt=prompt,
    )

    print(f"[Iteration {iteration}] Content generated ({len(result)} chars)")
    return result


async def evaluate_quality(
    content: str, requirements: str, iteration: int
) -> tuple[bool, str, int]:
    """Quality evaluator agent checks if content meets requirements.

    Returns:
        Tuple of (is_acceptable, feedback, score)
    """
    print(f"[Iteration {iteration}] Evaluating quality...")

    eval_prompt = f"""
Evaluate this content against the requirements:

Requirements:
{requirements}

Content:
{content}

Provide a quality score (0-100) and determine if it's acceptable (score >= 80).
"""

    result = await run_agent(
        name=f"Evaluator (iter {iteration})",
        system_prompt="""You are a quality evaluator. Assess content against requirements.

Format your response EXACTLY as:
SCORE: <number 0-100>
ACCEPTABLE: <YES or NO>
FEEDBACK: <detailed feedback>""",
        prompt=eval_prompt,
    )

    # Parse evaluation result
    score_match = re.search(r"SCORE:\s*(\d+)", result)
    acceptable_match = re.search(r"ACCEPTABLE:\s*(YES|NO)", result, re.IGNORECASE)
    feedback_match = re.search(r"FEEDBACK:\s*(.+)", result, re.DOTALL)

    score = int(score_match.group(1)) if score_match else 0
    acceptable = (
        acceptable_match.group(1).upper() == "YES" if acceptable_match else False
    )
    feedback = (
        feedback_match.group(1).strip() if feedback_match else "No feedback provided"
    )

    print(
        f"[Iteration {iteration}] Quality Score: {score}/100 - {'ACCEPTABLE' if acceptable else 'NEEDS IMPROVEMENT'}"
    )

    return acceptable, feedback, score


async def refine_content(content: str, feedback: str, iteration: int) -> str:
    """Refinement agent improves content based on feedback."""
    print(f"[Iteration {iteration}] Refining content based on feedback...")

    refine_prompt = f"""
Improve this content based on the feedback:

Current Content:
{content}

Feedback:
{feedback}

Provide the refined version.
"""

    result = await run_agent(
        name=f"Refiner (iter {iteration})",
        system_prompt="You are a content refiner. Improve content based on specific feedback while maintaining core message.",
        prompt=refine_prompt,
    )

    print(f"[Iteration {iteration}] Content refined")
    return result


async def loop_workflow_iterative_refinement(
    initial_prompt: str, requirements: str, max_iterations: int = 5
):
    """
    Loop workflow: Iteratively generate and refine content until quality threshold is met.

    Flow:
    1. Generate initial content
    2. Loop:
       a. Evaluate content quality
       b. If acceptable, exit loop
       c. Otherwise, refine content based on feedback
       d. Repeat (up to max_iterations)
    3. Return final content
    """

    print("=" * 60)
    print("LOOP WORKFLOW: Iterative Content Refinement")
    print("=" * 60)
    print(f"\nInitial Prompt: {initial_prompt}")
    print(f"Requirements: {requirements}")
    print(f"Max Iterations: {max_iterations}\n")
    print("-" * 60)

    # Generate initial content
    content = await generate_content(initial_prompt, iteration=1)

    iteration = 1
    acceptable = False
    final_score = 0

    # Iterative refinement loop
    while iteration <= max_iterations and not acceptable:
        # Evaluate current content
        acceptable, feedback, score = await evaluate_quality(
            content, requirements, iteration
        )
        final_score = score

        if acceptable:
            print(f"\n[Iteration {iteration}] Quality threshold met! Exiting loop.")
            break

        if iteration == max_iterations:
            print(
                f"\n[Iteration {iteration}] Max iterations reached. Using best available content."
            )
            break

        # Refine content based on feedback
        content = await refine_content(content, feedback, iteration)
        iteration += 1

    # Display final result
    print("\n" + "=" * 60)
    print("FINAL RESULT")
    print("=" * 60)
    print(f"\nIterations: {iteration}")
    print(f"Final Score: {final_score}/100")
    print(f"Status: {'ACCEPTABLE' if acceptable else 'NEEDS MORE WORK'}")
    print(f"\nFinal Content:\n")
    print("-" * 60)
    print(content)
    print("-" * 60)

    return content, iteration, final_score


async def loop_workflow_convergence():
    """
    Alternative loop pattern: Continue until convergence (changes become minimal).
    Each iteration runs in its own isolated ClaudeSDKClient session.
    """

    print("\n\n" + "=" * 60)
    print("LOOP WORKFLOW: Convergence-Based Processing")
    print("=" * 60)

    initial_value = 100
    target = 10
    tolerance = 0.1

    print(f"\nStarting value: {initial_value}")
    print(f"Target: {target}")
    print(f"Tolerance: {tolerance}\n")
    print("-" * 60)

    current_value = initial_value
    iteration = 1
    max_iterations = 20

    while iteration <= max_iterations:
        # Each iteration gets its own isolated session
        result = await run_agent(
            name=f"Math Processor (iter {iteration})",
            system_prompt="You are a mathematical processor. Calculate the next iteration value using the formula: new_value = (current_value + target) / 2. Respond with ONLY the number.",
            prompt=f"Current value: {current_value}, Target: {target}. Calculate next iteration.",
        )

        # Extract numeric value
        try:
            next_value = float(re.search(r"-?\d+\.?\d*", result).group())
        except (AttributeError, ValueError):
            # Fallback to manual calculation if parsing fails
            next_value = (current_value + target) / 2

        change = abs(next_value - current_value)

        print(f"[Iteration {iteration}] Value: {next_value:.4f}, Change: {change:.4f}")

        # Check convergence
        if change < tolerance:
            print(
                f"\n[Iteration {iteration}] Convergence achieved! Change ({change:.4f}) < Tolerance ({tolerance})"
            )
            break

        current_value = next_value
        iteration += 1

        if iteration > max_iterations:
            print(f"\n[Iteration {iteration}] Max iterations reached.")

    print("\n" + "=" * 60)
    print(f"Final converged value: {current_value:.4f}")
    print(f"Total iterations: {iteration}")
    print("=" * 60)


async def demonstrate_loop_workflows():
    """Demonstrate both loop workflow patterns."""

    # Pattern 1: Iterative refinement with quality checks
    await loop_workflow_iterative_refinement(
        initial_prompt="Write a brief introduction to machine learning for beginners",
        requirements="""
- Must be under 150 words
- Use simple, non-technical language
- Include at least one real-world example
- Be engaging and clear
""",
        max_iterations=5,
    )

    # Pattern 2: Convergence-based loop
    await loop_workflow_convergence()


if __name__ == "__main__":
    anyio.run(demonstrate_loop_workflows)
