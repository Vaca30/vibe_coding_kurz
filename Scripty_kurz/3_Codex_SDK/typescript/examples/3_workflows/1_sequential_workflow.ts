#!/usr/bin/env node
/**
 * Sequential Workflow Example - Agent Chain Pattern
 *
 * Demonstrates a multi-step sequential workflow where the output of one agent
 * (thread) becomes the input to the next. This is the same pattern as
 * 2_multi_thread/2_sequential_threads.ts but using the workflow framing.
 *
 * Pattern: Agent A -> Agent B -> Agent C
 */

import { Codex } from "@openai/codex-sdk";
import { codexPathOverride } from "../helpers.ts";

async function runAgent(
  name: string,
  instructions: string,
  prompt: string,
): Promise<string> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Agent: ${name}`);
  console.log("=".repeat(60));

  const codex = new Codex({
    codexPathOverride: codexPathOverride(),
    config: { developer_instructions: instructions },
  });

  const thread = codex.startThread({ skipGitRepoCheck: true });
  const turn = await thread.run(prompt);

  console.log(turn.finalResponse);

  if (turn.usage) {
    console.log(
      `\nTokens: ${turn.usage.input_tokens} input, ${turn.usage.output_tokens} output`,
    );
  }

  return turn.finalResponse;
}

async function sequentialWorkflow() {
  console.log("=".repeat(60));
  console.log("SEQUENTIAL WORKFLOW: Research -> Analyze -> Summarize");
  console.log("=".repeat(60));

  const topic =
    "Benefits of TypeScript's type system for large-scale applications";

  // Step 1: Research
  const research = await runAgent(
    "Research Agent",
    "You are a research assistant. Gather key information and provide detailed findings.",
    `Research the following topic and provide 3-5 key points: ${topic}`,
  );

  // Step 2: Analyze
  const analysis = await runAgent(
    "Analysis Agent",
    "You are an analytical expert. Examine findings and identify strengths, weaknesses, and implications.",
    `Analyze these research findings and provide critical insights:\n\n${research}`,
  );

  // Step 3: Summarize
  const summary = await runAgent(
    "Summary Agent",
    "You are a summarization specialist. Create concise, actionable summaries.",
    `Create a concise executive summary based on this analysis:\n\n${analysis}`,
  );

  console.log("\n" + "=".repeat(60));
  console.log("FINAL SUMMARY:");
  console.log("=".repeat(60));
  console.log(summary);
}

async function main() {
  await sequentialWorkflow();

  console.log("\n=== Sequential Workflow Summary ===");
  console.log("- Multi-step agent chain with role-specific instructions");
  console.log("- Output of each agent feeds into the next");
  console.log("- Progressive refinement of information");
}

main().catch(console.error);
