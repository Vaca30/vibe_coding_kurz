#!/usr/bin/env python3
"""
AI Code Review & Improvement System – Core Orchestration Logic

Pattern: Supervisor (multi-agent) + Parallel workflow (fan-out/fan-in)

Architecture:
    CodeReviewSupervisor
        Phase 1 – PARALLEL: SecurityReviewer, PerformanceReviewer, CodeQualityReviewer
        Phase 2 – SEQUENTIAL: FixerAgent (implements fixes based on reviews)
        Phase 3 – SEQUENTIAL: ReportWriter (generates markdown report)

The supervisor uses structured JSON output to drive state transitions across phases.
"""

import os
from pathlib import Path

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


OUTPUT_DIR = Path(__file__).parent / "output"


class CodeReviewSupervisor:
    """Orchestrates a multi-agent code review pipeline.

    Combines Supervisor pattern (structured decision loop) with Parallel workflow
    (fan-out of specialized reviewers) and Sequential delegation (fix + report).
    """

    MAX_ITERATIONS = 8

    SUPERVISOR_SCHEMA = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["run_reviews", "fix_code", "write_report", "finish"],
                "description": "Next action in the review pipeline",
            },
            "reasoning": {
                "type": "string",
                "description": "Brief explanation of why this action is chosen",
            },
            "final_summary": {
                "type": "string",
                "description": "Executive summary (required only when action is 'finish')",
            },
        },
        "required": ["action", "reasoning"],
        "additionalProperties": False,
    }

    def __init__(self) -> None:
        self.reviewers: dict[str, AgentDefinition] = {
            "security": AgentDefinition(
                description="Identifies security vulnerabilities such as injection flaws, "
                            "resource leaks, and unsafe input handling",
                prompt=(
                    "You are a security engineer specializing in Python application security. "
                    "Analyze code for vulnerabilities: SQL/command injection, resource leaks, "
                    "unsafe deserialization, missing input validation, and exposure of sensitive data. "
                    "Be specific: quote the problematic line and explain the risk."
                ),
                tools=["Read", "Grep"],
                model="sonnet",
            ),
            "performance": AgentDefinition(
                description="Identifies performance bottlenecks such as inefficient algorithms, "
                            "redundant computations, and unnecessary memory allocations",
                prompt=(
                    "You are a performance engineer specializing in Python optimization. "
                    "Analyze code for algorithmic inefficiency (O(n²) vs O(n)), redundant loops, "
                    "repeated operations, unnecessary memory allocations, and missing caching. "
                    "Estimate complexity and suggest concrete improvements."
                ),
                tools=["Read", "Grep"],
                model="sonnet",
            ),
            "quality": AgentDefinition(
                description="Reviews code quality: style, readability, type hints, "
                            "error handling, and adherence to Python best practices",
                prompt=(
                    "You are a senior Python developer focused on code quality. "
                    "Review for: missing type hints, variable shadowing, absent error handling, "
                    "poor naming, unnecessary complexity, and violations of PEP 8 and Pythonic idioms. "
                    "Quote specific lines and provide corrected versions."
                ),
                tools=["Read", "Grep"],
                model="sonnet",
            ),
        }

        self.fixer = AgentDefinition(
            description="Implements all code improvements identified by reviewers",
            prompt=(
                "You are a senior Python developer. You will receive a code file path and a consolidated "
                "review with security, performance, and quality findings. "
                "Read the original file, then create a fixed version at output/fixed_<filename> "
                "that addresses ALL identified issues. "
                "Preserve the original module's functionality and docstring. "
                "Use context managers, parameterized queries, type hints, and efficient algorithms."
            ),
            tools=["Read", "Write", "Edit"],
            model="sonnet",
        )

        self.reporter = AgentDefinition(
            description="Generates a structured markdown review report",
            prompt=(
                "You are a technical writer. You will receive the full review history including "
                "security, performance, and quality findings, plus information about what was fixed. "
                "Write a professional markdown report saved to output/review_report.md with these sections:\n"
                "# AI Code Review Report\n"
                "## Executive Summary\n"
                "## Security Findings\n"
                "## Performance Findings\n"
                "## Code Quality Findings\n"
                "## Changes Implemented\n"
                "## Recommendations\n"
                "Be specific, cite line numbers where possible, and use markdown tables or lists."
            ),
            tools=["Read", "Write"],
            model="sonnet",
        )

    async def _run_subagent(
        self, name: str, defn: AgentDefinition, prompt: str
    ) -> str:
        """Run a single subagent in its own isolated session."""
        options = ClaudeAgentOptions(
            system_prompt=defn.prompt,
            allowed_tools=defn.tools or [],
            model=defn.model,
            permission_mode="acceptEdits",
        )

        print(f"\n  [{name}] Starting...")
        parts: list[str] = []

        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)
            async for msg in client.receive_response():
                if isinstance(msg, AssistantMessage):
                    for block in msg.content:
                        if isinstance(block, TextBlock):
                            parts.append(block.text)
                elif isinstance(msg, ResultMessage):
                    cost = msg.total_cost_usd or 0
                    turns = msg.num_turns or 0
                    print(f"  [{name}] Done ({turns} turns, ${cost:.4f})")

        return "\n".join(parts)

    async def _run_parallel_reviews(self, target_file: str) -> dict[str, str]:
        """Phase 1: Fan-out – run all reviewers simultaneously."""
        results: dict[str, str] = {}

        async def review_one(reviewer_name: str, defn: AgentDefinition) -> None:
            prompt = (
                f"Review the Python file at: {target_file}\n\n"
                f"Focus exclusively on your specialization: {defn.description}\n"
                "List every issue you find with the exact line/code snippet and a recommended fix."
            )
            results[reviewer_name] = await self._run_subagent(reviewer_name, defn, prompt)

        print("\n  Running parallel reviews (fan-out)...")
        async with anyio.create_task_group() as tg:
            for name, defn in self.reviewers.items():
                tg.start_soon(review_one, name, defn)

        print("  All reviewers completed (fan-in).")
        return results

    async def _ask_supervisor(self, history: str, phase_flags: dict[str, bool]) -> dict:
        """Ask the supervisor to decide the next action."""
        completed = [k for k, v in phase_flags.items() if v]
        pending = [k for k, v in phase_flags.items() if not v]

        options = ClaudeAgentOptions(
            system_prompt=(
                "You are a senior tech lead supervising a code review pipeline. "
                "Your job is to decide what the next step should be based on the pipeline state."
            ),
            model="sonnet",
            output_format={"type": "json_schema", "schema": self.SUPERVISOR_SCHEMA},
        )

        supervisor_prompt = f"""You are managing a 4-phase code review pipeline.

Phases (in order):
1. run_reviews   – run 3 parallel reviewers (security, performance, quality)
2. fix_code      – delegate to FixerAgent to implement all fixes
3. write_report  – delegate to ReportWriter to produce the markdown report
4. finish        – pipeline complete, provide final_summary

Completed phases: {completed if completed else 'none'}
Pending phases:   {pending if pending else 'none (ready to finish)'}

Pipeline history so far:
{history}

Choose the next action. If all phases are done, choose 'finish' and include final_summary."""

        structured_result = None
        async for msg in query(prompt=supervisor_prompt, options=options):
            if isinstance(msg, ResultMessage) and msg.structured_output:
                structured_result = msg.structured_output

        return structured_result or {"action": "finish", "reasoning": "Fallback: no output"}

    async def execute(self, target_file: str) -> str:
        """Run the full review pipeline for the given file."""
        OUTPUT_DIR.mkdir(exist_ok=True)

        abs_path = str(Path(target_file).resolve())
        history = f"Target file for review: {abs_path}"

        phase_flags = {
            "run_reviews": False,
            "fix_code": False,
            "write_report": False,
        }

        print(f"\n{'='*60}")
        print(f"Supervisor: starting review pipeline for {Path(target_file).name}")
        print(f"{'='*60}")

        for iteration in range(1, self.MAX_ITERATIONS + 1):
            print(f"\n--- Supervisor iteration {iteration} ---")
            decision = await self._ask_supervisor(history, phase_flags)
            action = decision.get("action", "finish")
            reasoning = decision.get("reasoning", "")
            print(f"  Action: {action}")
            print(f"  Reasoning: {reasoning}")

            if action == "run_reviews" and not phase_flags["run_reviews"]:
                print("\n[Phase 1] Parallel Code Review")
                reviews = await self._run_parallel_reviews(abs_path)

                review_summary = "\n\n".join(
                    f"=== {name.upper()} REVIEW ===\n{text}"
                    for name, text in reviews.items()
                )
                history += f"\n\n{'='*50}\nPHASE 1 – PARALLEL REVIEWS COMPLETED\n{'='*50}\n{review_summary}"
                phase_flags["run_reviews"] = True

            elif action == "fix_code" and not phase_flags["fix_code"]:
                print("\n[Phase 2] Sequential: FixerAgent")
                filename = Path(abs_path).name
                fixer_prompt = (
                    f"Original file: {abs_path}\n"
                    f"Output directory: {OUTPUT_DIR.resolve()}\n"
                    f"Save the fixed version as: {OUTPUT_DIR.resolve() / ('fixed_' + filename)}\n\n"
                    f"Review findings to address:\n{history}"
                )
                fix_result = await self._run_subagent("fixer", self.fixer, fixer_prompt)
                history += f"\n\n{'='*50}\nPHASE 2 – FIXES IMPLEMENTED\n{'='*50}\n{fix_result}"
                phase_flags["fix_code"] = True

            elif action == "write_report" and not phase_flags["write_report"]:
                print("\n[Phase 3] Sequential: ReportWriter")
                report_prompt = (
                    f"Output directory: {OUTPUT_DIR.resolve()}\n"
                    f"Save the report as: {OUTPUT_DIR.resolve() / 'review_report.md'}\n\n"
                    f"Full pipeline history:\n{history}"
                )
                report_result = await self._run_subagent("reporter", self.reporter, report_prompt)
                history += f"\n\n{'='*50}\nPHASE 3 – REPORT WRITTEN\n{'='*50}\n{report_result}"
                phase_flags["write_report"] = True

            elif action == "finish" or all(phase_flags.values()):
                summary = decision.get("final_summary") or "All review phases completed successfully."
                print(f"\n{'='*60}")
                print("Supervisor: pipeline complete.")
                print(f"{'='*60}")
                return summary

        return "Pipeline reached max iterations."
