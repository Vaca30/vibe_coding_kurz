"""
Workflow — Loop with quality gating.

Concept
-------
Generator → evaluator → (refine if score < threshold) → evaluator → ...

The evaluator emits a structured response (SCORE, ACCEPTABLE, FEEDBACK) which
the orchestration code parses to decide whether to refine or stop.

Run:
    python 3_workflows/4_loop_workflow.py
"""

import asyncio
import re

from copilot import CopilotClient
from copilot.session import PermissionHandler


GENERATOR = (
    "You are a technical writer. Produce a short introduction (max 150 words) "
    "to machine learning aimed at absolute beginners. Avoid jargon."
)


EVALUATOR = (
    "You are a strict editor. Score the candidate text against these criteria:\n"
    "  1) under 150 words\n"
    "  2) accessible language (no unexplained jargon)\n"
    "  3) at least one concrete real-world example\n"
    "  4) engaging opening line\n\n"
    "Reply in EXACTLY this format:\n"
    "  SCORE: <0-100>\n"
    "  ACCEPTABLE: YES|NO\n"
    "  FEEDBACK: <one paragraph of actionable feedback>"
)


REFINER = (
    "You are a careful reviser. Given the current draft and the editor's "
    "feedback, produce an improved draft. Preserve the core message; do not "
    "rewrite from scratch."
)


THRESHOLD = 80
MAX_ITERATIONS = 5


def parse_evaluation(text: str) -> tuple[int, bool, str]:
    score = int(m.group(1)) if (m := re.search(r"SCORE:\s*(\d+)", text)) else 0
    acceptable = bool(re.search(r"ACCEPTABLE:\s*YES", text, re.IGNORECASE))
    feedback_m = re.search(r"FEEDBACK:\s*(.+)", text, re.DOTALL)
    feedback = feedback_m.group(1).strip() if feedback_m else ""
    return score, acceptable, feedback


async def one_shot(client: CopilotClient, system: str, user: str) -> str:
    session = await client.create_session(
        on_permission_request=PermissionHandler.approve_all,
        system_message={"mode": "replace", "content": system},
    )
    try:
        reply = await session.send_and_wait(user, timeout=300.0)
        return reply.data.content if reply else ""
    finally:
        await session.disconnect()


async def main() -> None:
    client = CopilotClient()
    await client.start()
    try:
        print("=== iteration 1: initial draft ===")
        draft = await one_shot(client, GENERATOR, "Write the intro now.")
        print(draft)

        for i in range(2, MAX_ITERATIONS + 1):
            print(f"\n=== iteration {i}: evaluation ===")
            evaluation = await one_shot(client, EVALUATOR, f"Candidate text:\n\n{draft}")
            print(evaluation)
            score, acceptable, feedback = parse_evaluation(evaluation)

            if acceptable or score >= THRESHOLD:
                print(f"\n[stopping — score={score} acceptable={acceptable}]")
                break

            print(f"\n=== iteration {i}: refinement (score={score}) ===")
            draft = await one_shot(
                client,
                REFINER,
                f"Current draft:\n\n{draft}\n\nEditor feedback:\n{feedback}",
            )
            print(draft)
        else:
            print(f"\n[hit MAX_ITERATIONS={MAX_ITERATIONS}, stopping]")

        print("\n=== final draft ===")
        print(draft)
    finally:
        await client.stop()


if __name__ == "__main__":
    asyncio.run(main())
