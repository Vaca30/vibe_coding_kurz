#!/usr/bin/env python3
"""
AI Code Review & Improvement System

Entry point. Accepts a Python file path as CLI argument.

Usage:
    uv run python main.py sample_buggy.py
    uv run python main.py path/to/your_file.py
"""

import io
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows (avoids codec errors with emoji in agent output)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import anyio

from review_system import CodeReviewSupervisor


async def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else "sample_buggy.py"
    target_path = Path(target)

    if not target_path.exists():
        print(f"Error: file not found: {target}")
        sys.exit(1)

    if target_path.suffix != ".py":
        print(f"Error: expected a .py file, got: {target}")
        sys.exit(1)

    print("=" * 60)
    print("AI Code Review & Improvement System")
    print("Supervisor + Parallel Workflow (Claude Agent SDK)")
    print("=" * 60)
    print(f"Target: {target_path.resolve()}")
    print()

    supervisor = CodeReviewSupervisor()
    summary = await supervisor.execute(str(target_path))

    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(summary)
    print()
    print("Output files:")
    print(f"  Fixed code: output/fixed_{target_path.name}")
    print(f"  Report:     output/review_report.md")


if __name__ == "__main__":
    anyio.run(main)
