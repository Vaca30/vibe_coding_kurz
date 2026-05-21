#!/usr/bin/env node
/**
 * Loop Workflow Example - Iterative Refinement Pattern
 *
 * Demonstrates iterative workflows where content is repeatedly refined
 * until a quality threshold is met.
 *
 * Pattern:
 * Input -> Generate -> Evaluate -> (if not done) -> Refine -> Evaluate -> ... -> Output
 */

import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { codexPathOverride } from "../helpers.ts";

const EvaluationSchema = z.object({
  score: z.number().min(0).max(100).describe("Quality score 0-100"),
  acceptable: z.boolean().describe("Whether the content meets requirements"),
  feedback: z.string().describe("Specific improvement suggestions"),
});

async function generateContent(
  prompt: string,
  iteration: number,
): Promise<string> {
  console.log(`\n[Iteration ${iteration}] Generating content...`);

  const codex = new Codex({
    codexPathOverride: codexPathOverride(),
    config: {
      developer_instructions:
        "You are a content creator. Generate clear, engaging content.",
    },
  });

  const thread = codex.startThread({ skipGitRepoCheck: true });
  const turn = await thread.run(prompt);

  console.log(
    `[Iteration ${iteration}] Content generated (${turn.finalResponse.length} chars)`,
  );
  return turn.finalResponse;
}

async function evaluateQuality(
  content: string,
  requirements: string,
  iteration: number,
): Promise<{ score: number; acceptable: boolean; feedback: string }> {
  console.log(`[Iteration ${iteration}] Evaluating quality...`);

  const codex = new Codex({
    codexPathOverride: codexPathOverride(),
    config: {
      developer_instructions:
        "You are a quality evaluator. Assess content against requirements strictly.",
    },
  });

  const thread = codex.startThread({ skipGitRepoCheck: true });
  const turn = await thread.run(
    `Evaluate this content against the requirements:\n\nRequirements:\n${requirements}\n\nContent:\n${content}\n\nScore it 0-100 and determine if it's acceptable (score >= 80).`,
    {
      outputSchema: zodToJsonSchema(EvaluationSchema, { target: "openAi" }),
    },
  );

  try {
    const result = EvaluationSchema.parse(JSON.parse(turn.finalResponse));
    console.log(
      `[Iteration ${iteration}] Score: ${result.score}/100 - ${result.acceptable ? "ACCEPTABLE" : "NEEDS IMPROVEMENT"}`,
    );
    return result;
  } catch {
    console.log(`[Iteration ${iteration}] Failed to parse evaluation`);
    return { score: 0, acceptable: false, feedback: "Evaluation failed" };
  }
}

async function refineContent(
  content: string,
  feedback: string,
  iteration: number,
): Promise<string> {
  console.log(`[Iteration ${iteration}] Refining based on feedback...`);

  const codex = new Codex({
    codexPathOverride: codexPathOverride(),
    config: {
      developer_instructions:
        "You are a content refiner. Improve content based on feedback while maintaining the core message.",
    },
  });

  const thread = codex.startThread({ skipGitRepoCheck: true });
  const turn = await thread.run(
    `Improve this content based on the feedback:\n\nContent:\n${content}\n\nFeedback:\n${feedback}\n\nProvide the refined version.`,
  );

  console.log(`[Iteration ${iteration}] Content refined`);
  return turn.finalResponse;
}

async function loopWorkflow(
  initialPrompt: string,
  requirements: string,
  maxIterations: number = 3,
): Promise<void> {
  console.log("=".repeat(60));
  console.log("LOOP WORKFLOW: Iterative Content Refinement");
  console.log("=".repeat(60));
  console.log(`\nPrompt: ${initialPrompt}`);
  console.log(`Requirements: ${requirements}`);
  console.log(`Max Iterations: ${maxIterations}\n`);

  // Generate initial content
  let content = await generateContent(initialPrompt, 1);

  let iteration = 1;
  let acceptable = false;
  let finalScore = 0;

  while (iteration <= maxIterations && !acceptable) {
    const evaluation = await evaluateQuality(content, requirements, iteration);
    acceptable = evaluation.acceptable;
    finalScore = evaluation.score;

    if (acceptable) {
      console.log(`\n[Iteration ${iteration}] Quality threshold met!`);
      break;
    }

    if (iteration === maxIterations) {
      console.log(`\n[Iteration ${iteration}] Max iterations reached.`);
      break;
    }

    // Refine content
    content = await refineContent(content, evaluation.feedback, iteration);
    iteration++;
  }

  console.log("\n" + "=".repeat(60));
  console.log("FINAL RESULT");
  console.log("=".repeat(60));
  console.log(`Iterations: ${iteration}`);
  console.log(`Final Score: ${finalScore}/100`);
  console.log(`Status: ${acceptable ? "ACCEPTABLE" : "NEEDS MORE WORK"}`);
  console.log("\nFinal Content:\n");
  console.log("-".repeat(60));
  console.log(content);
  console.log("-".repeat(60));
}

async function main() {
  await loopWorkflow(
    "Write a brief introduction to machine learning for beginners",
    "Must be under 150 words. Use simple non-technical language. Include at least one real-world example. Be engaging and clear.",
    3,
  );

  console.log("\n=== Loop Workflow Summary ===");
  console.log("- Iterative generate -> evaluate -> refine cycle");
  console.log("- Quality threshold with structured output scoring");
  console.log("- Max iterations as safety limit");
  console.log("- Progressive improvement based on specific feedback");
}

main().catch(console.error);
