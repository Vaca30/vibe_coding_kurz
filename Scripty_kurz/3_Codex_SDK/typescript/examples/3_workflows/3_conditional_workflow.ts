#!/usr/bin/env node
/**
 * Conditional Workflow Example - IF/ELSE Logic Pattern
 *
 * Demonstrates conditional routing based on agent output. A classifier agent
 * examines the request and routes to different specialized handlers.
 *
 * Pattern:
 *                   -> Agent B (if TECHNICAL)
 * Agent A -> Router -> Agent C (if CREATIVE)
 *                   -> Agent D (otherwise)
 */

import { Codex } from "@openai/codex-sdk";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { codexPathOverride } from "../helpers.ts";

const ClassificationSchema = z.object({
  category: z
    .enum(["TECHNICAL", "CREATIVE", "ANALYTICAL", "OTHER"])
    .describe("The request category"),
  reasoning: z.string().describe("Why this category was chosen"),
});

async function classifyRequest(
  request: string,
): Promise<{ category: string; reasoning: string }> {
  console.log("=".repeat(60));
  console.log("STEP 1: Classification");
  console.log("=".repeat(60));

  const codex = new Codex({
    codexPathOverride: codexPathOverride(),
    config: {
      developer_instructions:
        "You are a request classifier. Categorize requests as: " +
        "TECHNICAL (programming, code), CREATIVE (writing, storytelling), " +
        "ANALYTICAL (data analysis, research), or OTHER.",
    },
  });

  const thread = codex.startThread({ skipGitRepoCheck: true });
  const turn = await thread.run(`Classify this request: ${request}`, {
    outputSchema: zodToJsonSchema(ClassificationSchema, { target: "openAi" }),
  });

  try {
    const parsed = ClassificationSchema.parse(JSON.parse(turn.finalResponse));
    console.log(`Category: ${parsed.category}`);
    console.log(`Reasoning: ${parsed.reasoning}\n`);
    return parsed;
  } catch {
    console.log(`Raw response: ${turn.finalResponse}`);
    return { category: "OTHER", reasoning: "Failed to parse classification" };
  }
}

async function handleRequest(
  category: string,
  request: string,
): Promise<string> {
  const handlers: Record<string, { name: string; instructions: string }> = {
    TECHNICAL: {
      name: "Technical Handler",
      instructions:
        "You are a senior software engineer. Provide detailed technical solutions with code examples.",
    },
    CREATIVE: {
      name: "Creative Handler",
      instructions:
        "You are a creative writer. Craft engaging, imaginative content with vivid descriptions.",
    },
    ANALYTICAL: {
      name: "Analytical Handler",
      instructions:
        "You are a data analyst. Provide structured analysis with clear reasoning and evidence.",
    },
    OTHER: {
      name: "General Handler",
      instructions:
        "You are a helpful assistant. Provide clear, comprehensive responses.",
    },
  };

  const handler = handlers[category] ?? handlers["OTHER"]!;

  console.log("=".repeat(60));
  console.log(`STEP 2: ${handler.name}`);
  console.log("=".repeat(60));

  const codex = new Codex({
    codexPathOverride: codexPathOverride(),
    config: { developer_instructions: handler.instructions },
  });

  const thread = codex.startThread({ skipGitRepoCheck: true });
  const turn = await thread.run(request);

  console.log(turn.finalResponse);

  if (turn.usage) {
    console.log(
      `\nTokens: ${turn.usage.input_tokens} input, ${turn.usage.output_tokens} output`,
    );
  }

  return turn.finalResponse;
}

async function conditionalWorkflow(request: string): Promise<void> {
  console.log("=".repeat(60));
  console.log("CONDITIONAL WORKFLOW: Adaptive Request Routing");
  console.log("=".repeat(60));
  console.log(`\nRequest: ${request}\n`);

  const { category } = await classifyRequest(request);
  await handleRequest(category, request);

  console.log("\n" + "=".repeat(60));
  console.log("Conditional workflow completed!");
  console.log("=".repeat(60));
}

async function main() {
  const testCases = [
    "Write a TypeScript function to calculate Fibonacci numbers using dynamic programming",
    "Write a short story about a robot learning to feel emotions",
    "Analyze the pros and cons of remote work versus office work",
    "What is the capital of France?",
  ];

  for (let i = 0; i < testCases.length; i++) {
    console.log(`\n${"#".repeat(60)}`);
    console.log(`TEST CASE ${i + 1}/${testCases.length}`);
    console.log("#".repeat(60) + "\n");

    await conditionalWorkflow(testCases[i]!);

    if (i < testCases.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n=== Conditional Workflow Summary ===");
  console.log("- Request classification with structured output");
  console.log("- Dynamic routing to specialized handlers");
  console.log("- Each handler has role-specific instructions");
  console.log("- Adaptive workflows based on content type");
}

main().catch(console.error);
